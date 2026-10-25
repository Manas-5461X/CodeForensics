import { FastifyPluginAsync } from 'fastify';
import { CreateInvestigationSchema, type ApiResponse, type AuthUser, type UserInvestigation } from '@codeforensics/shared';
import { defaultInvestigationStore, InvestigationStore, sendForbidden } from '../auth/authorization.js';

export interface AuthRoutesOptions {
  investigationStore?: InvestigationStore;
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (fastify, options) => {
  const store = options.investigationStore || defaultInvestigationStore;

  // 1. Authenticated user profile: returns verified caller identity
  fastify.get('/auth/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as AuthUser;

    const response: ApiResponse<AuthUser> = {
      success: true,
      data: user,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };

    return reply.status(200).send(response);
  });

  // 2. List investigations owned by the authenticated user
  fastify.get('/user/investigations', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as AuthUser;
    const items = store.listByUser(user.uid);

    const response: ApiResponse<UserInvestigation[]> = {
      success: true,
      data: items,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };

    return reply.status(200).send(response);
  });

  // 3. Create a new investigation for the authenticated user
  fastify.post('/user/investigations', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as AuthUser;
    const body = request.body as Record<string, unknown> | undefined;

    // Security check: NEVER trust a client-supplied userId
    if (body && 'userId' in body && body.userId && body.userId !== user.uid) {
      return sendForbidden(
        reply,
        request.id,
        'Cannot create resources on behalf of another user ID',
      );
    }

    const parseResult = CreateInvestigationSchema.safeParse(body);
    if (!parseResult.success) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid investigation payload',
          details: parseResult.error.issues,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(400).send(response);
    }

    const created = store.create(user.uid, parseResult.data);

    const response: ApiResponse<UserInvestigation> = {
      success: true,
      data: created,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };

    return reply.status(201).send(response);
  });

  // 4. Retrieve a specific investigation with strict ownership verification
  fastify.get('/user/investigations/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as AuthUser;
    const { id } = request.params as { id: string };

    const investigation = store.getById(id);
    if (!investigation) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Investigation '${id}' not found`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(404).send(response);
    }

    // Ownership check: Verify caller matches resource owner
    if (investigation.userId !== user.uid) {
      return sendForbidden(reply, request.id);
    }

    const response: ApiResponse<UserInvestigation> = {
      success: true,
      data: investigation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };

    return reply.status(200).send(response);
  });

  // 5. Delete a specific investigation with strict ownership verification
  fastify.delete('/user/investigations/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as AuthUser;
    const { id } = request.params as { id: string };

    const investigation = store.getById(id);
    if (!investigation) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Investigation '${id}' not found`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(404).send(response);
    }

    // Ownership check: Verify caller matches resource owner
    if (investigation.userId !== user.uid) {
      return sendForbidden(reply, request.id);
    }

    store.delete(id);

    const response: ApiResponse<{ id: string; deleted: boolean }> = {
      success: true,
      data: { id, deleted: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };

    return reply.status(200).send(response);
  });
};
