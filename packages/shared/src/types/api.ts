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

// ============================================================================
// Advanced Architectural & Forensic Intelligence Types
// ============================================================================

/** 1. Temporal Co-Change & Coupling */
export interface CoChangePair {
  sourceFile: string;
  targetFile: string;
  coChangeCount: number;
  couplingPercentage: number; // 0–100%
  sharedPrs: number[];
  crossSubsystem: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CoChangeReport {
  repositoryId: string;
  analyzedPrCount: number;
  totalCoupledPairs: number;
  crossSubsystemPairsCount: number;
  pairs: CoChangePair[];
}

/** 2. Time-Machine Architecture Timeline */
export interface ArchitectureMilestone {
  id: string;
  label: string;
  timestamp: string;
  relativeTime: string;
  totalFiles: number;
  totalDirectories: number;
  hotspotCount: number;
  summaryText: string;
  topSubsystems: RepositoryMapSubsystemSummary[];
  root: RepositoryMapNode;
}

export interface RepositoryMapTimeline {
  repositoryId: string;
  fullName: string;
  currentMilestoneId: string;
  milestones: ArchitectureMilestone[];
}

/** 3. Bus Factor & Knowledge Loss Heatmap */
export interface KnowledgeLossRiskItem {
  path: string;
  subsystem: string;
  churnScore: number;
  busFactor: number; // 1 = single point of failure
  primaryMaintainer: string;
  maintainerStatus: 'ACTIVE' | 'DORMANT' | 'DEPARTED';
  ownershipPercentage: number; // e.g., 85% of lines/commits
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  isZombieHotspot: boolean; // churnScore >= 60 && maintainerStatus !== 'ACTIVE'
  reason: string;
  suggestedAction: string;
}

export interface KnowledgeLossSummary {
  repositoryId: string;
  totalAnalyzedFiles: number;
  zombieHotspotsCount: number;
  singleMaintainerFilesCount: number;
  averageBusFactor: number;
  riskItems: KnowledgeLossRiskItem[];
}

/** 4. Automated Architectural Blast-Radius Predictor */
export interface BlastRadiusInput {
  targetFiles: string[];
}

export interface BlastRadiusCoupledCompanion {
  file: string;
  couplingPercentage: number;
  coChangeCount: number;
  subsystem: string;
  reason: string;
}

export interface BlastRadiusImpact {
  targetFiles: string[];
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  blastRadiusScore: number; // 0–100 overall change hazard score
  directImpactCount: number;
  indirectImpactCount: number;
  coupledCompanions: BlastRadiusCoupledCompanion[];
  affectedTests: string[];
  affectedSubsystems: string[];
  architecturalBoundaryCrossings: string[];
  recommendedReviewers: { name: string; relevance: string }[];
  summary: string;
}

/** 5. Subsystem Dependency Flow */
export interface SubsystemDependencyEdge {
  sourceSubsystem: string;
  targetSubsystem: string;
  importCount: number;
  isCircular: boolean;
  isLayerViolation: boolean;
  sampleImports: string[];
}

export interface DependencyFlowReport {
  repositoryId: string;
  subsystems: string[];
  edges: SubsystemDependencyEdge[];
  circularCycles: string[][];
  layerViolations: string[];
}

/** 6. Self-Contained Offline Forensic Audit Dossier */
export interface AuditDossierMetadata {
  repositoryFullName: string;
  defaultBranch: string;
  generatedAt: string;
  snapshotSha?: string;
  totalFiles: number;
  hotspotsCount: number;
  zombieHotspotsCount: number;
  criticalCouplingsCount: number;
  assessedIssuesCount: number;
  verifiedFactCount: number;
}


