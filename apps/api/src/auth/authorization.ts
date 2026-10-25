import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ApiResponse, UserInvestigation } from '@codeforensics/shared';

export class AuthorizationError extends Error {
  public readonly statusCode = 403;
  public readonly code = 'FORBIDDEN';

  constructor(message = 'Access denied: you do not have permission to access this resource') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Asserts that the authenticated user owns the resource.
 * Throws an AuthorizationError if there is a mismatch.
 */
export function assertResourceOwner(authenticatedUid: string, resourceOwnerUid: string): void {
  if (!authenticatedUid || authenticatedUid !== resourceOwnerUid) {
    throw new AuthorizationError();
  }
}

/**
 * Helper to reject unauthorized access in standard ApiResponse envelope
 */
export function sendForbidden(reply: FastifyReply, requestId?: string, message?: string): FastifyReply {
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: message || 'Access denied: you do not have permission to access this resource',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
  return reply.status(403).send(response);
}

/**
 * In-memory investigation storage for Phase 2 demonstration and authorization testing.
 * (Full PostgreSQL Prisma persistence is connected in Phase 3).
 */
export class InvestigationStore {
  private investigations: Map<string, UserInvestigation> = new Map();

  create(ownerUid: string, data: { title: string; description?: string | null; query?: Record<string, unknown>; findings?: Record<string, unknown> | null }): UserInvestigation {
    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    const investigation: UserInvestigation = {
      id,
      userId: ownerUid,
      title: data.title,
      description: data.description ?? null,
      query: data.query ?? {},
      findings: data.findings ?? null,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    this.investigations.set(id, investigation);
    return investigation;
  }

  getById(id: string): UserInvestigation | undefined {
    return this.investigations.get(id);
  }

  listByUser(ownerUid: string): UserInvestigation[] {
    return Array.from(this.investigations.values()).filter((inv) => inv.userId === ownerUid);
  }

  delete(id: string): boolean {
    return this.investigations.delete(id);
  }

  clear(): void {
    this.investigations.clear();
  }
}

export const defaultInvestigationStore = new InvestigationStore();
