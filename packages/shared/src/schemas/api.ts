import { z } from 'zod';

export const ClaimCategorySchema = z.enum(['FACT', 'INFERENCE', 'HYPOTHESIS', 'UNKNOWN']);

export const AssessmentConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW', 'NOT_ASSESSED']);

export const RelationshipTypeSchema = z.enum([
  'DUPLICATES',
  'RELATED_TO',
  'BLOCKS',
  'BLOCKED_BY',
  'ADDRESSES',
  'PARTIALLY_ADDRESSES',
  'SUPERSEDES',
  'FOLLOWS_UP_ON',
  'REOPENS',
  'REGRESSION_OF',
  'INTRODUCED_BY',
  'FIXED_BY',
  'REVERTS',
  'BACKPORT_OF',
  'CHERRY_PICK_OF',
]);

export const ResolutionStatusSchema = z.enum([
  'RESOLVED',
  'PARTIALLY_ADDRESSED',
  'UNRESOLVED',
  'DUPLICATE',
  'OBSOLETE',
  'UNKNOWN',
]);

export const SyncStatusSchema = z.enum([
  'IDLE',
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'PARTIAL',
]);

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const RepositoryParamsSchema = z.object({
  owner: z.string().min(1, 'Repository owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
});

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  version: z.string(),
  timestamp: z.string(),
  uptimeSeconds: z.number(),
  services: z.object({
    database: z.enum(['connected', 'disconnected', 'disabled']),
    redis: z.enum(['connected', 'disconnected', 'disabled']),
  }),
});
