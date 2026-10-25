import type { FastifyPluginAsync } from 'fastify';
import {
  CreateSavedInvestigationSchema,
  UpdateSavedInvestigationSchema,
  InvestigationQuerySchema,
  type ApiResponse,
  type AuthUser,
  type InvestigationRecord,
} from '@codeforensics/shared';
import type { RepositoryStore } from '../db/repositoryStore.js';
import { sendForbidden } from '../auth/authorization.js';

export interface InvestigationRoutesOptions {
  repositoryStore: RepositoryStore;
}

export const investigationRoutes: FastifyPluginAsync<InvestigationRoutesOptions> = async (
  fastify,
  opts
) => {
  const { repositoryStore } = opts;

  // 1. List investigations owned by the authenticated user
  fastify.get(
    '/investigations',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const queryResult = InvestigationQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid investigation query parameters',
            details: queryResult.error.format(),
          },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const items = await repositoryStore.listInvestigations(user.uid, queryResult.data);

      const response: ApiResponse<InvestigationRecord[]> = {
        success: true,
        data: items,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };

      return reply.status(200).send(response);
    }
  );

  // 2. Create a new saved investigation for authenticated user
  fastify.post(
    '/investigations',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const body = request.body as Record<string, unknown> | undefined;

      // Security check: NEVER trust client-supplied user ID
      if (body && 'userId' in body && body.userId && body.userId !== user.uid) {
        return sendForbidden(
          reply,
          request.id,
          'Cannot create investigations on behalf of another user ID'
        );
      }

      const parseResult = CreateSavedInvestigationSchema.safeParse(body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid investigation payload',
            details: parseResult.error.issues,
          },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      // Check repository exists and user is authorized
      const repo = await repositoryStore.findRepositoryById(parseResult.data.repositoryId);
      if (!repo) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'REPOSITORY_NOT_FOUND',
            message: `Repository with ID '${parseResult.data.repositoryId}' does not exist`,
          },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const created = await repositoryStore.createInvestigation(user.uid, parseResult.data);

      const response: ApiResponse<InvestigationRecord> = {
        success: true,
        data: created,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };

      return reply.status(201).send(response);
    }
  );

  // 3. Retrieve investigation by ID with ownership verification
  fastify.get(
    '/investigations/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const { id } = request.params as { id: string };

      const investigation = await repositoryStore.getInvestigation(user.uid, id);
      if (!investigation) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Investigation '${id}' not found or access denied`,
          },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const response: ApiResponse<InvestigationRecord> = {
        success: true,
        data: investigation,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };

      return reply.status(200).send(response);
    }
  );

  // 4. Update investigation by ID with ownership verification
  fastify.patch(
    '/investigations/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const { id } = request.params as { id: string };

      const parseResult = UpdateSavedInvestigationSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update investigation payload',
            details: parseResult.error.issues,
          },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const updated = await repositoryStore.updateInvestigation(user.uid, id, parseResult.data);
      if (!updated) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Investigation '${id}' not found or access denied`,
          },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const response: ApiResponse<InvestigationRecord> = {
        success: true,
        data: updated,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };

      return reply.status(200).send(response);
    }
  );

  // 5. Delete investigation by ID with ownership verification
  fastify.delete(
    '/investigations/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const { id } = request.params as { id: string };

      const deleted = await repositoryStore.deleteInvestigation(user.uid, id);
      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Investigation '${id}' not found or access denied`,
          },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const response: ApiResponse<{ id: string; deleted: boolean }> = {
        success: true,
        data: { id, deleted: true },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };

      return reply.status(200).send(response);
    }
  );
};
