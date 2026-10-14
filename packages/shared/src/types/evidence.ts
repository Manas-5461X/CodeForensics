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
  sourceType: 'ISSUE' | 'PULL_REQUEST' | 'COMMIT' | 'FILE';
  targetId: string;
  targetType: 'ISSUE' | 'PULL_REQUEST' | 'COMMIT' | 'FILE';
  relationshipType: RelationshipType;
  category: ClaimCategory;
  confidence: AssessmentConfidence;
  method: string;
  evidenceSummary: string;
  evidenceItems: EvidenceItem[];
  freshness: string;
}

export interface ResolutionAssessment {
  issueId: string;
  status: ResolutionStatus;
  category: ClaimCategory;
  confidence: AssessmentConfidence;
  evidence: EvidenceItem[];
  counterEvidence: EvidenceItem[];
  assessedAt: string;
  rationale: string;
  coverageNotes: string[];
}
