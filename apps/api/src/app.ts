import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from './config/env.js';
import type { ApiResponse, HealthResponse } from '@codeforensics/shared';
import { createTokenVerifier, type TokenVerifier } from './auth/tokenVerifier.js';
import { authPlugin } from './auth/authPlugin.js';
import { authRoutes } from './routes/authRoutes.js';
import type { InvestigationStore } from './auth/authorization.js';
import { checkDatabaseConnection } from './db/prisma.js';
import { GitHubAppService, type IGitHubService } from './github/githubApp.js';
import {
  type RepositoryStore,
  PrismaRepositoryStore,
  InMemoryRepositoryStore,
} from './db/repositoryStore.js';
import { repositoryRoutes } from './routes/repositoryRoutes.js';
import { investigationRoutes } from './routes/investigationRoutes.js';
import type { Queue } from 'bullmq';
import type { RepositorySyncJobData } from './types/syncJob.js';

const startTime = Date.now();

export interface BuildAppOptions {
  tokenVerifier?: TokenVerifier;
  investigationStore?: InvestigationStore;
  githubService?: IGitHubService;
  repositoryStore?: RepositoryStore;
  syncQueue?: Queue<RepositorySyncJobData> | null;
  onSyncTrigger?: (jobData: RepositorySyncJobData) => Promise<string>;
  dbChecker?: () => Promise<{ isConnected: boolean; error?: string }>;
  redisChecker?: () => Promise<{ isConnected: boolean; error?: string }>;
}

export function buildApp(config: AppConfig, options?: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : 'info',
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    genReqId: () => randomUUID(),
  });

  // Enable CORS with configured origin
  void app.register(cors, {
    origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Security Headers: enforce strict MIME types, prevent framing/clickjacking, and restrict referrer leakage
  app.addHook('onSend', async (_request, reply) => {
    void reply.header('X-Content-Type-Options', 'nosniff');
    void reply.header('X-Frame-Options', 'DENY');
    void reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    void reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  });

  // Initialize and register authentication plugin
  const tokenVerifier = createTokenVerifier(config, options?.tokenVerifier);
  void app.register(authPlugin, { tokenVerifier });

  // Consistent Error Envelope Handler
  app.setErrorHandler((error: { statusCode?: number; code?: string; message?: string } | Error | unknown, request, reply) => {
    request.log.error(error);

    const err = (error && typeof error === 'object' ? error : {}) as {
      statusCode?: number;
      code?: string;
      message?: string;
    };

    const statusCode = err.statusCode && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : 500;

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
        message: statusCode === 500 && config.NODE_ENV === 'production'
          ? 'An internal server error occurred'
          : err.message || 'An unexpected error occurred',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };

    void reply.status(statusCode).send(response);
  });

  // Consistent 404 Handler
  app.setNotFoundHandler((request, reply) => {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    void reply.status(404).send(response);
  });

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    let databaseStatus: 'connected' | 'disconnected' | 'disabled' = 'disabled';
    if (config.DATABASE_URL) {
      if (options?.dbChecker) {
        const check = await options.dbChecker();
        databaseStatus = check.isConnected ? 'connected' : 'disconnected';
      } else {
        const check = await checkDatabaseConnection(undefined, 4000);
        databaseStatus = check.isConnected ? 'connected' : 'disconnected';
      }
    }

    let redisStatus: 'connected' | 'disconnected' | 'disabled' = 'disabled';
    if (config.REDIS_URL) {
      if (options?.redisChecker) {
        const check = await options.redisChecker();
        redisStatus = check.isConnected ? 'connected' : 'disconnected';
      } else {
        redisStatus = 'connected';
      }
    }

    const overallStatus: 'ok' | 'degraded' | 'error' =
      databaseStatus === 'disconnected' || redisStatus === 'disconnected'
        ? 'degraded'
        : 'ok';

    const healthData: HealthResponse = {
      status: overallStatus,
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      services: {
        database: databaseStatus,
        redis: redisStatus,
      },
    };

    const response: ApiResponse<HealthResponse> = {
      success: true,
      data: healthData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };

    return reply.status(200).send(response);
  });

  // Readiness probe endpoint
  app.get('/ready', async (request, reply) => {
    const response: ApiResponse<{ ready: boolean }> = {
      success: true,
      data: { ready: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });

  // Meta endpoint
  app.get('/api/v1/meta', async (request, reply) => {
    const response: ApiResponse<{ name: string; version: string; description: string }> = {
      success: true,
      data: {
        name: 'CodeForensics API',
        version: '0.1.0',
        description: 'Evidence-backed repository intelligence platform API',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });

  // Register authenticated routes
  void app.register(authRoutes, {
    prefix: '/api/v1',
    investigationStore: options?.investigationStore,
  });

  // Initialize GitHub service & repository store
  const githubService =
    options?.githubService ??
    new GitHubAppService({
      appId: config.GITHUB_APP_ID,
      privateKey: config.GITHUB_PRIVATE_KEY,
      privateKeyPath: config.GITHUB_PRIVATE_KEY_PATH,
      webhookSecret: config.GITHUB_WEBHOOK_SECRET,
    });

  const repositoryStore =
    options?.repositoryStore ??
    (config.DATABASE_URL ? new PrismaRepositoryStore() : new InMemoryRepositoryStore());

  // Register repository discovery, selection, and sync routes
  void app.register(repositoryRoutes, {
    prefix: '/api/v1',
    githubService,
    repositoryStore,
    syncQueue: options?.syncQueue,
    onSyncTrigger: options?.onSyncTrigger,
  });

  // Register saved investigation routes
  void app.register(investigationRoutes, {
    prefix: '/api/v1',
    repositoryStore,
  });

  return app;
}
