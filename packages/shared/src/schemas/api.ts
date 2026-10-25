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

export const AuthUserSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email().nullable(),
  displayName: z.string().nullable(),
  photoURL: z.string().nullable().optional(),
});

export const CreateInvestigationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  query: z.record(z.unknown()).default({}),
  findings: z.record(z.unknown()).nullable().optional(),
});

export const SelectRepositorySchema = z.object({
  owner: z.string().min(1, 'Owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
  installationId: z.coerce.number().int().positive().optional(),
});

export const SyncTriggerSchema = z.object({
  force: z.boolean().optional(),
});

export const WorkItemQuerySchema = z.object({
  type: z.enum(['all', 'issue', 'pull_request']).default('all'),
  state: z.enum(['all', 'open', 'closed']).default('all'),
  search: z.string().trim().max(100).optional(),
  label: z.string().trim().max(50).optional(),
  sort: z
    .enum([
      'created_desc',
      'created_asc',
      'updated_desc',
      'updated_asc',
      'number_desc',
      'number_asc',
    ])
    .default('created_desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const RelationshipQuerySchema = z.object({
  itemNumber: z.coerce.number().int().positive().optional(),
  type: z
    .enum(['ADDRESSES', 'SUPERSEDES', 'FIXED_BY', 'DUPLICATES', 'RELATED_TO', 'all'])
    .default('all'),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NOT_ASSESSED', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const ContributorQuerySchema = z.object({
  itemNumber: z.coerce.number().int().positive().optional(),
  subsystem: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const ArchaeologyQuerySchema = z.object({
  query: z.string().trim().min(1, 'Symbol query or file path is required').max(200),
  filePath: z.string().trim().max(500).optional(),
});

export const InvestigationStatusSchema = z.enum([
  'open',
  'in_progress',
  'resolved',
  'inconclusive',
]);

export const InvestigationEvidenceItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['issue', 'pull_request', 'commit', 'file', 'symbol', 'relationship']),
  identifier: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url().optional(),
  category: ClaimCategorySchema.default('FACT'),
  confidence: AssessmentConfidenceSchema.optional(),
  summary: z.string().max(2000).optional(),
  addedAt: z.string().default(() => new Date().toISOString()),
});

export const CreateSavedInvestigationSchema = z.object({
  repositoryId: z.string().min(1, 'Repository ID is required'),
  question: z.string().min(3, 'Question must be at least 3 characters').max(300),
  scope: z.string().min(1, 'Scope is required').max(300),
  status: InvestigationStatusSchema.default('open'),
  hypotheses: z.array(z.string().max(1000)).default([]),
  observations: z.array(z.string().max(1000)).default([]),
  findings: z.array(z.string().max(1000)).default([]),
  limitations: z.array(z.string().max(1000)).default([]),
  evidenceItems: z.array(InvestigationEvidenceItemSchema).default([]),
});

export const UpdateSavedInvestigationSchema = z.object({
  question: z.string().min(3).max(300).optional(),
  scope: z.string().min(1).max(300).optional(),
  status: InvestigationStatusSchema.optional(),
  hypotheses: z.array(z.string().max(1000)).optional(),
  observations: z.array(z.string().max(1000)).optional(),
  findings: z.array(z.string().max(1000)).optional(),
  limitations: z.array(z.string().max(1000)).optional(),
  evidenceItems: z.array(InvestigationEvidenceItemSchema).optional(),
});

export const InvestigationQuerySchema = z.object({
  repositoryId: z.string().optional(),
  search: z.string().trim().max(100).optional(),
  status: z
    .enum(['open', 'in_progress', 'resolved', 'inconclusive', 'all'])
    .default('all'),
});



