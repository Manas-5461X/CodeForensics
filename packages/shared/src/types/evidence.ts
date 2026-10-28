/**
 * CodeForensics Claim and Evidence Taxonomies
 * 
 * Non-negotiable architectural rule:
 * Distinguish observed GitHub facts from CodeForensics assessments.
 * Every inferred relationship must retain provenance and uncertainty.
 */

export type ClaimCategory = 'FACT' | 'INFERENCE' | 'HYPOTHESIS' | 'UNKNOWN';

export type AssessmentConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_ASSESSED';

export type RelationshipType =
  | 'DUPLICATES'
  | 'RELATED_TO'
  | 'BLOCKS'
  | 'BLOCKED_BY'
  | 'ADDRESSES'
  | 'PARTIALLY_ADDRESSES'
  | 'SUPERSEDES'
  | 'FOLLOWS_UP_ON'
  | 'REOPENS'
  | 'REGRESSION_OF'
  | 'INTRODUCED_BY'
  | 'FIXED_BY'
  | 'REVERTS'
  | 'BACKPORT_OF'
  | 'CHERRY_PICK_OF';

export type ResolutionStatus =
  | 'RESOLVED'
  | 'PARTIALLY_ADDRESSED'
  | 'UNRESOLVED'
  | 'DUPLICATE'
  | 'OBSOLETE'
  | 'UNKNOWN';

export type SyncStatus =
  | 'IDLE'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL';

export type EntityType = 'ISSUE' | 'PULL_REQUEST' | 'COMMIT' | 'FILE' | 'SYMBOL';

export interface EvidenceReference {
  type: string;
  keyword?: string;
  sourceText: string;
  matchedText: string;
  location?: 'BODY' | 'TITLE' | 'COMMIT' | 'BRANCH';
}

export interface RelationshipEvidence {
  summary: string;
  ruleId: string;
  ruleDescription: string;
  references: EvidenceReference[];
  confidenceRationale: string;
  limitations?: string[];
  missingEvidence?: string[];
}

export interface EvidenceItem {
  id: string;
  category: ClaimCategory;
  sourceType: 'GITHUB_FACT' | 'GIT_DIFF' | 'COMMIT' | 'ISSUE_COMMENT' | 'REVIEW' | 'FILE_CONTENT';
  sourceUrl: string;
  summary: string;
  confidence: AssessmentConfidence;
  provenance: string;
  contradictions?: string[];
  coverageLimitations?: string[];
  recordedAt: string;
}

export interface RelationshipRecord {
  id: string;
  repositoryId: string;
  sourceId: string;
  sourceType: EntityType;
  targetId: string;
  targetType: EntityType;
  relationshipType: RelationshipType;
  category: ClaimCategory;
  confidence: AssessmentConfidence;
  method: string;
  evidenceSummary: string;
  evidenceItems: EvidenceItem[];
  freshness: string;
}

export interface RelationshipInfo {
  id: string;
  repositoryId: string;
  sourceId: string;
  sourceType: EntityType;
  sourceNumber?: number;
  sourceTitle?: string;
  targetId: string;
  targetType: EntityType;
  targetNumber?: number;
  targetTitle?: string;
  relationshipType: RelationshipType;
  category: ClaimCategory;
  confidence: AssessmentConfidence;
  method: string;
  evidenceSummary: string;
  evidenceDetails?: RelationshipEvidence | null;
  evidenceItems?: EvidenceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ResolutionAssessment {
  issueId: string;
  status: ResolutionStatus;
  category: ClaimCategory;
  confidence: AssessmentConfidence;
  evidence: EvidenceItem[];
  counterEvidence?: EvidenceItem[];
  evidenceSummary?: string;
  assessedAt: string;
  rationale: string;
  coverageNotes: string[];
  linkedRelationships?: RelationshipInfo[];
}

export type PrecedentMatchReason =
  | 'SHARED_FILES'
  | 'SHARED_SYMBOL'
  | 'SUBSYSTEM_SCOPE'
  | 'ERROR_KEYWORD'
  | 'SIMILAR_DESCRIPTION';

export interface HistoricalPrecedent {
  id: string;
  targetNumber: number;
  targetTitle: string;
  targetType: 'ISSUE' | 'PULL_REQUEST';
  state: 'open' | 'closed' | 'merged';
  matchReason: PrecedentMatchReason;
  matchDetail: string;
  confidence: AssessmentConfidence;
  subsystem?: string;
  author?: string | null;
  mergedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  sharedItems?: string[];
}
