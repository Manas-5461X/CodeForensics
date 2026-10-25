import type { ClaimCategory, AssessmentConfidence } from './evidence.js';

export type InvestigationStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'inconclusive';

export interface InvestigationEvidenceItem {
  id: string;
  type: 'issue' | 'pull_request' | 'commit' | 'file' | 'symbol' | 'relationship';
  identifier: string;
  title: string;
  url?: string;
  category: ClaimCategory;
  confidence?: AssessmentConfidence;
  summary?: string;
  addedAt: string;
}

export interface InvestigationRecord {
  id: string;
  userId: string;
  repositoryId: string;
  repositoryName?: string;
  question: string;
  scope: string;
  status: InvestigationStatus;
  hypotheses: string[];
  observations: string[];
  findings: string[];
  limitations: string[];
  evidenceItems: InvestigationEvidenceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvestigationInput {
  repositoryId: string;
  question: string;
  scope: string;
  status?: InvestigationStatus;
  hypotheses?: string[];
  observations?: string[];
  findings?: string[];
  limitations?: string[];
  evidenceItems?: InvestigationEvidenceItem[];
}

export interface UpdateInvestigationInput {
  question?: string;
  scope?: string;
  status?: InvestigationStatus;
  hypotheses?: string[];
  observations?: string[];
  findings?: string[];
  limitations?: string[];
  evidenceItems?: InvestigationEvidenceItem[];
}
