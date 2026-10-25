import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type { AuthUser, ApiResponse } from '@codeforensics/shared';
import type { TokenVerifier } from './tokenVerifier.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export interface AuthPluginOptions {
  tokenVerifier: TokenVerifier;
}

const authPluginCallback: FastifyPluginAsync<AuthPluginOptions> = async (fastify, options) => {
  const { tokenVerifier } = options;

  fastify.decorateRequest('user', undefined);

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing authorization header with Bearer token',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(401).send(response);
    }

    const parts = authHeader.trim().split(/\s+/);
    if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Malformed authorization header. Expected format: Bearer <token>',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(401).send(response);
    }

    const token = parts[1]!;

    try {
      const decoded = await tokenVerifier.verifyIdToken(token);

      request.user = {
        uid: decoded.uid,
        email: decoded.email ?? null,
        displayName: decoded.name ?? null,
        photoURL: decoded.picture ?? null,
      };
    } catch (err: unknown) {
      request.log.warn({ err }, 'Token verification failed');

      const errorObj = (err && typeof err === 'object' ? err : {}) as {
        message?: string;
        code?: string;
      };

      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: errorObj.message || 'Invalid or expired authorization token',
          details: errorObj.code,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };

      return reply.status(401).send(response);
    }
  });
};

export const authPlugin = fp(authPluginCallback, {
  name: 'codeforensics-auth',
  fastify: '5.x',
});
