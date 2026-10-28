import type {
  RelationshipInfo,
  ResolutionAssessment,
  ResolutionStatus,
  HistoricalPrecedent,
} from './evidence.js';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiMeta {
  timestamp: string;
  requestId?: string;
  coverage?: {
    isComplete: boolean;
    warnings?: string[];
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: ApiMeta;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  services: {
    database: 'connected' | 'disconnected' | 'disabled';
    redis: 'connected' | 'disconnected' | 'disabled';
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: string;
}

export interface UserInvestigation {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  query: Record<string, unknown>;
  findings: Record<string, unknown> | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubInstallationInfo {
  id: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  targetType: string;
  permissions: Record<string, string>;
}

export interface RepositorySyncStateInfo {
  id: string;
  repositoryId: string;
  status: 'IDLE' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  startedAt: string | null;
  completedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  recordsImported: number;
  issuesCount: number;
  prsCount: number;
  progress?: number;
  checkpoints?: Record<string, unknown> | null;
  errorSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryInfo {
  id: string;
  githubRepoId: number | string;
  installationId: string | null;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  htmlUrl: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  syncState?: RepositorySyncStateInfo | null;
}

export interface SelectRepositoryInput {
  owner: string;
  repo: string;
  installationId?: number;
}

export interface SyncTriggerResult {
  jobId: string;
  repositoryId: string;
  owner: string;
  repo: string;
  status: 'IDLE' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  message: string;
}

export type WorkItemType = 'issue' | 'pull_request';

export interface WorkItemSummary {
  id: string;
  type: WorkItemType;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  isDraft?: boolean;
  merged?: boolean;
  mergedAt?: string | null;
  author: string | null;
  labels: string[];
  htmlUrl: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  relationshipsCount?: number;
  resolutionStatus?: ResolutionStatus;
}

export interface TimelineEvent {
  id: string;
  type: 'comment' | 'commit' | 'review' | 'closed' | 'merged' | 'referenced';
  author: string | null;
  body?: string;
  createdAt: string;
  htmlUrl?: string;
}

export interface DiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface DiffSummary {
  additions: number;
  deletions: number;
  changedFiles: number;
  files: DiffFile[];
}

export interface WorkItemDetail extends WorkItemSummary {
  baseRef?: string | null;
  headRef?: string | null;
  timelineAvailable: boolean;
  diffAvailable: boolean;
  timelineNotes?: string | null;
  diffNotes?: string | null;
  timelineEvents?: TimelineEvent[];
  diffSummary?: DiffSummary | null;
  relationships?: RelationshipInfo[];
  resolutionAssessment?: ResolutionAssessment | null;
  historicalPrecedents?: HistoricalPrecedent[];
}

export interface RepositoryMapNode {
  id: string;
  name: string;
  path: string;
  type: 'directory' | 'file';
  size?: number;
  fileCount?: number;
  churnScore: number; // 0-100 Hotspot churn score based on commit & PR activity
  topMaintainer?: string;
  subsystem?: string;
  extension?: string;
  children?: RepositoryMapNode[];
}

export interface RepositoryMapSubsystemSummary {
  name: string;
  path: string;
  fileCount: number;
  churnScore: number;
  topMaintainer?: string;
}

export interface RepositoryMapData {
  repositoryId: string;
  fullName: string;
  defaultBranch: string;
  analyzedAt: string;
  root: RepositoryMapNode;
  summary: {
    totalFiles: number;
    totalDirectories: number;
    hotspotCount: number;
    topSubsystems: RepositoryMapSubsystemSummary[];
    topMaintainers: { name: string; commitCount: number }[];
  };
}

export interface WorkItemFilters {
  type?: 'all' | 'issue' | 'pull_request';
  state?: 'all' | 'open' | 'closed';
  search?: string;
  label?: string;
  sort?:
    | 'created_desc'
    | 'created_asc'
    | 'updated_desc'
    | 'updated_asc'
    | 'number_desc'
    | 'number_asc';
  page?: number;
  limit?: number;
}

