import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from './config/env.js';
import type { ApiResponse, HealthResponse } from '@codeforensics/shared';

const startTime = Date.now();

export function buildApp(config: AppConfig): FastifyInstance {
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
    const healthData: HealthResponse = {
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      services: {
        database: config.DATABASE_URL ? 'connected' : 'disabled',
        redis: config.REDIS_URL ? 'connected' : 'disabled',
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

  return app;
}
