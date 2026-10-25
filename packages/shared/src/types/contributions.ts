/**
 * CodeForensics Contributor Intelligence & Maintenance Risk Taxonomies
 */

export type ContributorExperienceTier =
  | 'PRIMARY_MAINTAINER'
  | 'ACTIVE_CONTRIBUTOR'
  | 'HISTORICAL_CONTRIBUTOR'
  | 'INCIDENTAL';

export type RecencySignal = 'RECENT' | 'STALE' | 'DORMANT';

export type SignalType =
  | 'DIRECT_FIX'
  | 'DIRECT_ADDRESS'
  | 'SUBSYSTEM_PR'
  | 'SUBSYSTEM_ISSUE'
  | 'RECENCY_BOOST'
  | 'HISTORICAL_EXPERIENCE';

export interface ContributorSignal {
  type: SignalType;
  label: string;
  description: string;
  weight: number;
  count: number;
  lastActiveAt?: string | null;
  referenceNumbers?: number[];
}

export interface RelevantWorkItem {
  number: number;
  type: 'issue' | 'pull_request';
  title: string;
  state: 'open' | 'closed' | 'merged';
  merged?: boolean;
  closedAt?: string | null;
  updatedAt: string;
  subsystem?: string;
}

export interface ContributorRecommendation {
  login: string;
  avatarUrl?: string;
  rank: number;
  normalizedScore: number; // 0 - 100
  experienceTier: ContributorExperienceTier;
  recencySignal: RecencySignal;
  lastActiveAt: string | null;
  signals: ContributorSignal[];
  relevantWorkItems: RelevantWorkItem[];
  limitations: string[];
}

export type RiskType =
  | 'CONCENTRATED_OWNERSHIP'
  | 'STALE_MAINTENANCE'
  | 'INCOMPLETE_HISTORY';

export type RiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface MaintenanceRisk {
  riskType: RiskType;
  severity: RiskSeverity;
  subsystem: string;
  title: string;
  description: string;
  dominantContributor?: string;
  concentrationRatio?: number; // e.g. 0.75 for 75%
  lastActivityAt?: string | null;
  daysInactive?: number;
  recommendationHint?: string;
}

export interface TargetItemSummary {
  number: number;
  type: 'issue' | 'pull_request';
  title: string;
  subsystem?: string;
  labels: string[];
}

export interface ContributionAnalysisResult {
  targetItem?: TargetItemSummary | null;
  subsystem?: string | null;
  totalContributorsAnalyzed: number;
  recommendations: ContributorRecommendation[];
  maintenanceRisks: MaintenanceRisk[];
  coverageNotes: string[];
}
