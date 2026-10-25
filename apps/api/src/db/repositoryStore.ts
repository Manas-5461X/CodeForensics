import { getPrismaClient } from './prisma.js';
import { Prisma } from '@prisma/client';
import type {
  RepositoryInfo,
  RepositorySyncStateInfo,
  GitHubInstallationInfo,
  WorkItemSummary,
  WorkItemDetail,
  WorkItemFilters,
  PaginatedResult,
  RelationshipInfo,
  RelationshipType,
  ResolutionAssessment,
  ContributionAnalysisResult,
  ArchaeologyTraceResult,
  InvestigationRecord,
  CreateInvestigationInput,
  UpdateInvestigationInput,
} from '@codeforensics/shared';
import {
  RelationshipEngine,
  type RawIssueRecord,
  type RawPullRequestRecord,
} from '../intelligence/relationshipEngine.js';
import { ContributionEngine } from '../intelligence/contributionEngine.js';
import { ArchaeologyEngine, type RawCommitRecord } from '../intelligence/archaeologyEngine.js';

export interface UpsertIssueInput {
  githubIssueId: bigint | number;
  repositoryId: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  author: string | null;
  labels: unknown;
  htmlUrl: string;
  closedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UpsertPullRequestInput {
  githubPrId: bigint | number;
  repositoryId: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  isDraft: boolean;
  merged: boolean;
  mergedAt: Date | string | null;
  author: string | null;
  baseRef: string | null;
  headRef: string | null;
  htmlUrl: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RepositoryRecord {
  id: string;
  githubRepoId: bigint | number | string;
  installationId: string | null;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  htmlUrl: string;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  syncState?: RepositorySyncStateRecord | null;
}

export interface RepositorySyncStateRecord {
  id: string;
  repositoryId: string;
  status: 'IDLE' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  lastSuccessfulSyncAt: Date | string | null;
  recordsImported: number;
  issuesCount: number;
  prsCount: number;
  progress?: number;
  checkpoints?: Record<string, unknown> | null;
  errorSummary: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RepositoryStore {
  findInstallation(installationId: number): Promise<GitHubInstallationInfo | null>;
  upsertInstallation(data: {
    installationId: number;
    accountLogin: string;
    accountType: string;
    targetType: string;
    permissions: Record<string, string>;
  }): Promise<GitHubInstallationInfo>;
  listInstallations(): Promise<GitHubInstallationInfo[]>;

  findRepository(owner: string, name: string): Promise<RepositoryRecord | null>;
  findRepositoryById(id: string): Promise<RepositoryRecord | null>;
  listRepositories(): Promise<RepositoryRecord[]>;
  upsertRepository(data: {
    githubRepoId: bigint | number;
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    isPrivate: boolean;
    htmlUrl: string;
    description: string | null;
    installationId?: string | null;
  }): Promise<RepositoryRecord>;

  getSyncState(repositoryId: string): Promise<RepositorySyncStateRecord | null>;
  updateSyncState(
    repositoryId: string,
    updates: Partial<Omit<RepositorySyncStateRecord, 'id' | 'repositoryId'>>
  ): Promise<RepositorySyncStateRecord>;

  upsertIssues(issues: UpsertIssueInput[]): Promise<number>;
  upsertPullRequests(prs: UpsertPullRequestInput[]): Promise<number>;

  listWorkItems(
    repositoryId: string,
    filters: WorkItemFilters
  ): Promise<PaginatedResult<WorkItemSummary>>;
  getWorkItem(
    repositoryId: string,
    number: number
  ): Promise<WorkItemDetail | null>;

  getRelationships(
    repositoryId: string,
    filter?: { itemNumber?: number; type?: RelationshipType }
  ): Promise<RelationshipInfo[]>;
  assessResolution(
    repositoryId: string,
    issueNumber: number
  ): Promise<ResolutionAssessment | null>;
  getContributorRecommendations(
    repositoryId: string,
    options?: { itemNumber?: number; subsystem?: string; limit?: number; now?: Date }
  ): Promise<ContributionAnalysisResult>;

  traceArchaeology(
    repositoryId: string,
    options: {
      query: string;
      filePath?: string;
      sourceContent?: string;
      commits?: RawCommitRecord[];
    }
  ): Promise<ArchaeologyTraceResult>;

  listInvestigations(
    userId: string,
    filter?: { repositoryId?: string; search?: string; status?: string }
  ): Promise<InvestigationRecord[]>;

  getInvestigation(
    userId: string,
    id: string
  ): Promise<InvestigationRecord | null>;

  createInvestigation(
    userId: string,
    data: CreateInvestigationInput
  ): Promise<InvestigationRecord>;

  updateInvestigation(
    userId: string,
    id: string,
    data: UpdateInvestigationInput
  ): Promise<InvestigationRecord | null>;

  deleteInvestigation(
    userId: string,
    id: string
  ): Promise<boolean>;
}

/**
 * Format repository record to shared API type
 */
export function formatRepositoryInfo(repo: RepositoryRecord): RepositoryInfo {
  return {
    id: repo.id,
    githubRepoId: repo.githubRepoId.toString(),
    installationId: repo.installationId,
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
    defaultBranch: repo.defaultBranch,
    isPrivate: repo.isPrivate,
    htmlUrl: repo.htmlUrl,
    description: repo.description,
    createdAt: new Date(repo.createdAt).toISOString(),
    updatedAt: new Date(repo.updatedAt).toISOString(),
    syncState: repo.syncState
      ? {
          id: repo.syncState.id,
          repositoryId: repo.syncState.repositoryId,
          status: repo.syncState.status,
          startedAt: repo.syncState.startedAt ? new Date(repo.syncState.startedAt).toISOString() : null,
          completedAt: repo.syncState.completedAt ? new Date(repo.syncState.completedAt).toISOString() : null,
          lastSuccessfulSyncAt: repo.syncState.lastSuccessfulSyncAt
            ? new Date(repo.syncState.lastSuccessfulSyncAt).toISOString()
            : null,
          recordsImported: repo.syncState.recordsImported,
          issuesCount: repo.syncState.issuesCount,
          prsCount: repo.syncState.prsCount,
          progress: repo.syncState.progress,
          checkpoints: repo.syncState.checkpoints,
          errorSummary: repo.syncState.errorSummary,
          createdAt: new Date(repo.syncState.createdAt).toISOString(),
          updatedAt: new Date(repo.syncState.updatedAt).toISOString(),
        }
      : null,
  };
}

/**
 * In-memory repository store for fast isolated testing and offline operation
 */
export class InMemoryRepositoryStore implements RepositoryStore {
  private installations = new Map<number, GitHubInstallationInfo>();
  private repositories = new Map<string, RepositoryRecord>();
  private syncStates = new Map<string, RepositorySyncStateRecord>();
  private issues = new Map<string, UpsertIssueInput>();
  private pullRequests = new Map<string, UpsertPullRequestInput>();
  private relationships = new Map<string, RelationshipInfo>();
  private investigations = new Map<string, InvestigationRecord>();

  private recomputeRelationships(repositoryId: string): RelationshipInfo[] {
    const rawIssues: RawIssueRecord[] = [];
    for (const issue of this.issues.values()) {
      if (issue.repositoryId === repositoryId) {
        rawIssues.push({
          id: String(issue.githubIssueId),
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          closedAt: issue.closedAt,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
        });
      }
    }

    const rawPRs: RawPullRequestRecord[] = [];
    for (const pr of this.pullRequests.values()) {
      if (pr.repositoryId === repositoryId) {
        rawPRs.push({
          id: String(pr.githubPrId),
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: pr.state,
          isDraft: pr.isDraft,
          merged: pr.merged,
          mergedAt: pr.mergedAt,
          baseRef: pr.baseRef,
          headRef: pr.headRef,
          createdAt: pr.createdAt,
          updatedAt: pr.updatedAt,
        });
      }
    }

    const detected = RelationshipEngine.detectRelationships(repositoryId, rawIssues, rawPRs);
    for (const [key, rel] of this.relationships.entries()) {
      if (rel.repositoryId === repositoryId) {
        this.relationships.delete(key);
      }
    }
    for (const rel of detected) {
      this.relationships.set(rel.id, rel);
    }
    return detected;
  }

  public async findInstallation(installationId: number): Promise<GitHubInstallationInfo | null> {
    return this.installations.get(installationId) || null;
  }

  public async upsertInstallation(data: {
    installationId: number;
    accountLogin: string;
    accountType: string;
    targetType: string;
    permissions: Record<string, string>;
  }): Promise<GitHubInstallationInfo> {
    const existing = this.installations.get(data.installationId);
    const record: GitHubInstallationInfo = {
      id: existing ? existing.id : `inst-${data.installationId}`,
      ...data,
    };
    this.installations.set(data.installationId, record);
    return record;
  }

  public async listInstallations(): Promise<GitHubInstallationInfo[]> {
    return Array.from(this.installations.values());
  }

  public async findRepository(owner: string, name: string): Promise<RepositoryRecord | null> {
    const key = `${owner.toLowerCase()}/${name.toLowerCase()}`;
    const repo = this.repositories.get(key);
    if (!repo) return null;
    const syncState = this.syncStates.get(repo.id) || null;
    return { ...repo, syncState };
  }

  public async findRepositoryById(id: string): Promise<RepositoryRecord | null> {
    for (const repo of this.repositories.values()) {
      if (repo.id === id) {
        const syncState = this.syncStates.get(repo.id) || null;
        return { ...repo, syncState };
      }
    }
    return null;
  }

  public async listRepositories(): Promise<RepositoryRecord[]> {
    return Array.from(this.repositories.values()).map((repo) => ({
      ...repo,
      syncState: this.syncStates.get(repo.id) || null,
    }));
  }

  public async upsertRepository(data: {
    githubRepoId: bigint | number;
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    isPrivate: boolean;
    htmlUrl: string;
    description: string | null;
    installationId?: string | null;
  }): Promise<RepositoryRecord> {
    const key = `${data.owner.toLowerCase()}/${data.name.toLowerCase()}`;
    const existing = this.repositories.get(key);
    const now = new Date();

    const repo: RepositoryRecord = {
      id: existing ? existing.id : `repo-${data.githubRepoId}`,
      githubRepoId: data.githubRepoId,
      installationId: data.installationId ?? existing?.installationId ?? null,
      owner: data.owner,
      name: data.name,
      fullName: data.fullName,
      defaultBranch: data.defaultBranch,
      isPrivate: data.isPrivate,
      htmlUrl: data.htmlUrl,
      description: data.description,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    this.repositories.set(key, repo);

    // Initialize sync state if not present
    if (!this.syncStates.has(repo.id)) {
      this.syncStates.set(repo.id, {
        id: `sync-${repo.id}`,
        repositoryId: repo.id,
        status: 'IDLE',
        startedAt: null,
        completedAt: null,
        lastSuccessfulSyncAt: null,
        recordsImported: 0,
        issuesCount: 0,
        prsCount: 0,
        checkpoints: null,
        errorSummary: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { ...repo, syncState: this.syncStates.get(repo.id) || null };
  }

  public async getSyncState(repositoryId: string): Promise<RepositorySyncStateRecord | null> {
    return this.syncStates.get(repositoryId) || null;
  }

  public async updateSyncState(
    repositoryId: string,
    updates: Partial<Omit<RepositorySyncStateRecord, 'id' | 'repositoryId'>>
  ): Promise<RepositorySyncStateRecord> {
    const existing = this.syncStates.get(repositoryId);
    const now = new Date();
    const updated: RepositorySyncStateRecord = {
      id: existing ? existing.id : `sync-${repositoryId}`,
      repositoryId,
      status: updates.status ?? existing?.status ?? 'IDLE',
      startedAt: updates.startedAt !== undefined ? updates.startedAt : (existing?.startedAt ?? null),
      completedAt: updates.completedAt !== undefined ? updates.completedAt : (existing?.completedAt ?? null),
      lastSuccessfulSyncAt:
        updates.lastSuccessfulSyncAt !== undefined
          ? updates.lastSuccessfulSyncAt
          : (existing?.lastSuccessfulSyncAt ?? null),
      recordsImported: updates.recordsImported ?? existing?.recordsImported ?? 0,
      issuesCount: updates.issuesCount ?? existing?.issuesCount ?? 0,
      prsCount: updates.prsCount ?? existing?.prsCount ?? 0,
      progress: updates.progress ?? existing?.progress ?? 0,
      checkpoints: updates.checkpoints !== undefined ? updates.checkpoints : (existing?.checkpoints ?? null),
      errorSummary: updates.errorSummary !== undefined ? updates.errorSummary : (existing?.errorSummary ?? null),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.syncStates.set(repositoryId, updated);
    return updated;
  }

  public async upsertIssues(issues: UpsertIssueInput[]): Promise<number> {
    for (const issue of issues) {
      const key = `${issue.repositoryId}:${issue.number}`;
      this.issues.set(key, issue);
    }
    return issues.length;
  }

  public async upsertPullRequests(prs: UpsertPullRequestInput[]): Promise<number> {
    for (const pr of prs) {
      const key = `${pr.repositoryId}:${pr.number}`;
      this.pullRequests.set(key, pr);
    }
    return prs.length;
  }

  public async listWorkItems(
    repositoryId: string,
    filters: WorkItemFilters
  ): Promise<PaginatedResult<WorkItemSummary>> {
    const items: WorkItemSummary[] = [];

    // 1. Gather issues if requested
    if (filters.type === undefined || filters.type === 'all' || filters.type === 'issue') {
      for (const issue of this.issues.values()) {
        if (issue.repositoryId !== repositoryId) continue;
        const labelsList = Array.isArray(issue.labels)
          ? issue.labels.map((l) => (typeof l === 'string' ? l : (l as any).name || String(l)))
          : [];
        const state: 'open' | 'closed' =
          issue.state.toLowerCase() === 'open' ? 'open' : 'closed';
        items.push({
          id: String(issue.githubIssueId),
          type: 'issue',
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state,
          author: issue.author,
          labels: labelsList,
          htmlUrl: issue.htmlUrl,
          closedAt: issue.closedAt ? new Date(issue.closedAt).toISOString() : null,
          createdAt: new Date(issue.createdAt).toISOString(),
          updatedAt: new Date(issue.updatedAt).toISOString(),
        });
      }
    }

    // 2. Gather pull requests if requested
    if (filters.type === undefined || filters.type === 'all' || filters.type === 'pull_request') {
      for (const pr of this.pullRequests.values()) {
        if (pr.repositoryId !== repositoryId) continue;
        const isMerged = Boolean(
          pr.merged || pr.mergedAt !== null || pr.state.toLowerCase() === 'merged'
        );
        const state: 'open' | 'closed' | 'merged' = isMerged
          ? 'merged'
          : pr.state.toLowerCase() === 'open'
          ? 'open'
          : 'closed';
        items.push({
          id: String(pr.githubPrId),
          type: 'pull_request',
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state,
          isDraft: pr.isDraft,
          merged: isMerged,
          mergedAt: pr.mergedAt ? new Date(pr.mergedAt).toISOString() : null,
          author: pr.author,
          labels: [],
          htmlUrl: pr.htmlUrl,
          closedAt: isMerged
            ? (pr.mergedAt ? new Date(pr.mergedAt).toISOString() : null)
            : pr.state.toLowerCase() === 'closed'
            ? new Date(pr.updatedAt).toISOString()
            : null,
          createdAt: new Date(pr.createdAt).toISOString(),
          updatedAt: new Date(pr.updatedAt).toISOString(),
        });
      }
    }

    // 3. Filter by state
    let filtered = items;
    if (filters.state && filters.state !== 'all') {
      if (filters.state === 'open') {
        filtered = filtered.filter((item) => item.state === 'open');
      } else if (filters.state === 'closed') {
        filtered = filtered.filter(
          (item) => item.state === 'closed' || item.state === 'merged'
        );
      }
    }

    // 4. Filter by search query
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.body && item.body.toLowerCase().includes(q)) ||
          item.number.toString() === q ||
          `#${item.number}` === q
      );
    }

    // 5. Filter by label
    if (filters.label && filters.label.trim()) {
      const l = filters.label.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        item.labels.some((label) => label.toLowerCase().includes(l))
      );
    }

    // 6. Stable Sorting
    const sort = filters.sort || 'created_desc';
    filtered.sort((a, b) => {
      switch (sort) {
        case 'created_asc':
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
            a.number - b.number
          );
        case 'updated_desc':
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() ||
            b.number - a.number
          );
        case 'updated_asc':
          return (
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime() ||
            a.number - b.number
          );
        case 'number_desc':
          return b.number - a.number;
        case 'number_asc':
          return a.number - b.number;
        case 'created_desc':
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
            b.number - a.number
          );
      }
    });

    // 7. Paginate
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedItems = filtered.slice((page - 1) * limit, page * limit);

    // Enrich with relationship intelligence & resolution status
    const allRels = await this.getRelationships(repositoryId);
    const syncState = await this.getSyncState(repositoryId);

    for (const item of paginatedItems) {
      const itemRels = allRels.filter(
        (r) => r.sourceNumber === item.number || r.targetNumber === item.number
      );
      item.relationshipsCount = itemRels.length;

      if (item.type === 'issue') {
        const rawIssue: RawIssueRecord = {
          id: item.id,
          number: item.number,
          title: item.title,
          body: item.body,
          state: item.state,
          closedAt: item.closedAt,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
        const assessment = RelationshipEngine.assessIssueResolution(rawIssue, itemRels, syncState);
        item.resolutionStatus = assessment.status;
      }
    }

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async getWorkItem(
    repositoryId: string,
    number: number
  ): Promise<WorkItemDetail | null> {
    const prKey = `${repositoryId}:${number}`;
    const pr = this.pullRequests.get(prKey);
    if (pr) {
      const isMerged = Boolean(
        pr.merged || pr.mergedAt !== null || pr.state.toLowerCase() === 'merged'
      );
      const state: 'open' | 'closed' | 'merged' = isMerged
        ? 'merged'
        : pr.state.toLowerCase() === 'open'
        ? 'open'
        : 'closed';
      const rels = await this.getRelationships(repositoryId, { itemNumber: number });
      return {
        id: String(pr.githubPrId),
        type: 'pull_request',
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state,
        isDraft: pr.isDraft,
        merged: isMerged,
        mergedAt: pr.mergedAt ? new Date(pr.mergedAt).toISOString() : null,
        author: pr.author,
        labels: [],
        baseRef: pr.baseRef,
        headRef: pr.headRef,
        htmlUrl: pr.htmlUrl,
        closedAt: isMerged
          ? (pr.mergedAt ? new Date(pr.mergedAt).toISOString() : null)
          : pr.state.toLowerCase() === 'closed'
          ? new Date(pr.updatedAt).toISOString()
          : null,
        createdAt: new Date(pr.createdAt).toISOString(),
        updatedAt: new Date(pr.updatedAt).toISOString(),
        timelineAvailable: false,
        diffAvailable: false,
        timelineNotes: 'Discussion timeline was not collected in the initial sync tier.',
        diffNotes: 'Diff details were not collected in the initial sync tier.',
        relationshipsCount: rels.length,
        relationships: rels,
        resolutionAssessment: null,
      };
    }

    const issueKey = `${repositoryId}:${number}`;
    const issue = this.issues.get(issueKey);
    if (issue) {
      const labelsList = Array.isArray(issue.labels)
        ? issue.labels.map((l) => (typeof l === 'string' ? l : (l as any).name || String(l)))
        : [];
      const rels = await this.getRelationships(repositoryId, { itemNumber: number });
      const assessment = await this.assessResolution(repositoryId, number);
      return {
        id: String(issue.githubIssueId),
        type: 'issue',
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state.toLowerCase() === 'open' ? 'open' : 'closed',
        author: issue.author,
        labels: labelsList,
        htmlUrl: issue.htmlUrl,
        closedAt: issue.closedAt ? new Date(issue.closedAt).toISOString() : null,
        createdAt: new Date(issue.createdAt).toISOString(),
        updatedAt: new Date(issue.updatedAt).toISOString(),
        timelineAvailable: false,
        diffAvailable: false,
        timelineNotes: 'Discussion timeline was not collected in the initial sync tier.',
        relationshipsCount: rels.length,
        resolutionStatus: assessment?.status,
        relationships: rels,
        resolutionAssessment: assessment,
      };
    }

    return null;
  }

  public async getRelationships(
    repositoryId: string,
    filter?: { itemNumber?: number; type?: RelationshipType }
  ): Promise<RelationshipInfo[]> {
    this.recomputeRelationships(repositoryId);
    let results = Array.from(this.relationships.values()).filter(
      (r) => r.repositoryId === repositoryId
    );
    if (filter?.itemNumber !== undefined) {
      const num = filter.itemNumber;
      results = results.filter(
        (r) => r.sourceNumber === num || r.targetNumber === num
      );
    }
    if (filter?.type !== undefined) {
      results = results.filter((r) => r.relationshipType === filter.type);
    }
    return results;
  }

  public async assessResolution(
    repositoryId: string,
    issueNumber: number
  ): Promise<ResolutionAssessment | null> {
    const key = `${repositoryId}:${issueNumber}`;
    const issue = this.issues.get(key);
    if (!issue) return null;

    const rels = await this.getRelationships(repositoryId, { itemNumber: issueNumber });
    const syncState = await this.getSyncState(repositoryId);

    const rawIssue: RawIssueRecord = {
      id: String(issue.githubIssueId),
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      closedAt: issue.closedAt,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    };

    return RelationshipEngine.assessIssueResolution(rawIssue, rels, syncState);
  }

  public async getContributorRecommendations(
    repositoryId: string,
    options?: { itemNumber?: number; subsystem?: string; limit?: number; now?: Date }
  ): Promise<ContributionAnalysisResult> {
    const issues = Array.from(this.issues.values())
      .filter((i) => i.repositoryId === repositoryId)
      .map((i) => ({
        id: String(i.githubIssueId),
        number: i.number,
        title: i.title,
        body: i.body,
        state: i.state,
        author: i.author,
        labels: i.labels,
        closedAt: i.closedAt,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      }));

    const prs = Array.from(this.pullRequests.values())
      .filter((p) => p.repositoryId === repositoryId)
      .map((p) => ({
        id: String(p.githubPrId),
        number: p.number,
        title: p.title,
        body: p.body,
        state: p.state,
        isDraft: p.isDraft,
        merged: p.merged,
        mergedAt: p.mergedAt,
        author: p.author,
        baseRef: p.baseRef,
        headRef: p.headRef,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));

    const rels = await this.getRelationships(repositoryId);
    const syncState = await this.getSyncState(repositoryId);

    return ContributionEngine.rankContributors(
      repositoryId,
      options || {},
      issues,
      prs,
      rels,
      syncState
    );
  }

  public async traceArchaeology(
    repositoryId: string,
    options: {
      query: string;
      filePath?: string;
      sourceContent?: string;
      commits?: RawCommitRecord[];
    }
  ): Promise<ArchaeologyTraceResult> {
    const repo = await this.findRepositoryById(repositoryId);
    if (!repo) {
      throw new Error(`Repository with ID ${repositoryId} not found`);
    }

    const prs: RawPullRequestRecord[] = Array.from(this.pullRequests.values())
      .filter((p) => p.repositoryId === repositoryId)
      .map((p) => ({
        id: String(p.githubPrId),
        number: p.number,
        title: p.title,
        body: p.body,
        state: p.state,
        isDraft: p.isDraft,
        merged: p.merged,
        mergedAt: p.mergedAt ? new Date(p.mergedAt) : null,
        author: p.author,
        baseRef: p.baseRef,
        headRef: p.headRef,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      }));

    const engine = new ArchaeologyEngine();
    return engine.trace({
      query: options.query,
      filePath: options.filePath,
      repoOwner: repo.owner,
      repoName: repo.name,
      defaultBranch: repo.defaultBranch,
      sourceCode: options.sourceContent,
      pullRequests: prs,
      commitRecords: options.commits ?? [],
    });
  }

  public async listInvestigations(
    userId: string,
    filter?: { repositoryId?: string; search?: string; status?: string }
  ): Promise<InvestigationRecord[]> {
    let items = Array.from(this.investigations.values()).filter(
      (inv) => inv.userId === userId
    );

    if (filter?.repositoryId) {
      items = items.filter((inv) => inv.repositoryId === filter.repositoryId);
    }

    if (filter?.status && filter.status !== 'all') {
      items = items.filter((inv) => inv.status === filter.status);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(
        (inv) =>
          inv.question.toLowerCase().includes(q) ||
          inv.scope.toLowerCase().includes(q)
      );
    }

    return items.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public async getInvestigation(
    userId: string,
    id: string
  ): Promise<InvestigationRecord | null> {
    const inv = this.investigations.get(id);
    if (!inv || inv.userId !== userId) {
      return null;
    }
    return inv;
  }

  public async createInvestigation(
    userId: string,
    data: CreateInvestigationInput
  ): Promise<InvestigationRecord> {
    const repo = await this.findRepositoryById(data.repositoryId);
    const repoName = repo ? `${repo.owner}/${repo.name}` : undefined;

    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const record: InvestigationRecord = {
      id,
      userId,
      repositoryId: data.repositoryId,
      repositoryName: repoName,
      question: data.question,
      scope: data.scope,
      status: data.status ?? 'open',
      hypotheses: data.hypotheses ?? [],
      observations: data.observations ?? [],
      findings: data.findings ?? [],
      limitations: data.limitations ?? [],
      evidenceItems: data.evidenceItems ?? [],
      createdAt: now,
      updatedAt: now,
    };

    this.investigations.set(id, record);
    return record;
  }

  public async updateInvestigation(
    userId: string,
    id: string,
    data: UpdateInvestigationInput
  ): Promise<InvestigationRecord | null> {
    const inv = this.investigations.get(id);
    if (!inv || inv.userId !== userId) {
      return null;
    }

    const updated: InvestigationRecord = {
      ...inv,
      question: data.question !== undefined ? data.question : inv.question,
      scope: data.scope !== undefined ? data.scope : inv.scope,
      status: data.status !== undefined ? data.status : inv.status,
      hypotheses: data.hypotheses !== undefined ? data.hypotheses : inv.hypotheses,
      observations: data.observations !== undefined ? data.observations : inv.observations,
      findings: data.findings !== undefined ? data.findings : inv.findings,
      limitations: data.limitations !== undefined ? data.limitations : inv.limitations,
      evidenceItems: data.evidenceItems !== undefined ? data.evidenceItems : inv.evidenceItems,
      updatedAt: new Date().toISOString(),
    };

    this.investigations.set(id, updated);
    return updated;
  }

  public async deleteInvestigation(userId: string, id: string): Promise<boolean> {
    const inv = this.investigations.get(id);
    if (!inv || inv.userId !== userId) {
      return false;
    }
    return this.investigations.delete(id);
  }
}

/**
 * Prisma-backed repository store for live PostgreSQL production usage
 */
export class PrismaRepositoryStore implements RepositoryStore {
  public async findInstallation(installationId: number): Promise<GitHubInstallationInfo | null> {
    const prisma = getPrismaClient();
    const inst = await prisma.gitHubInstallation.findUnique({
      where: { installationId },
    });
    if (!inst) return null;
    return {
      id: inst.id,
      installationId: inst.installationId,
      accountLogin: inst.accountLogin,
      accountType: inst.accountType,
      targetType: inst.targetType,
      permissions: (inst.permissions as Record<string, string>) || {},
    };
  }

  public async upsertInstallation(data: {
    installationId: number;
    accountLogin: string;
    accountType: string;
    targetType: string;
    permissions: Record<string, string>;
  }): Promise<GitHubInstallationInfo> {
    const prisma = getPrismaClient();
    const inst = await prisma.gitHubInstallation.upsert({
      where: { installationId: data.installationId },
      create: {
        installationId: data.installationId,
        accountLogin: data.accountLogin,
        accountType: data.accountType,
        targetType: data.targetType,
        permissions: data.permissions,
      },
      update: {
        accountLogin: data.accountLogin,
        accountType: data.accountType,
        targetType: data.targetType,
        permissions: data.permissions,
      },
    });

    return {
      id: inst.id,
      installationId: inst.installationId,
      accountLogin: inst.accountLogin,
      accountType: inst.accountType,
      targetType: inst.targetType,
      permissions: (inst.permissions as Record<string, string>) || {},
    };
  }

  public async listInstallations(): Promise<GitHubInstallationInfo[]> {
    const prisma = getPrismaClient();
    const list = await prisma.gitHubInstallation.findMany();
    return list.map((inst) => ({
      id: inst.id,
      installationId: inst.installationId,
      accountLogin: inst.accountLogin,
      accountType: inst.accountType,
      targetType: inst.targetType,
      permissions: (inst.permissions as Record<string, string>) || {},
    }));
  }

  public async findRepository(owner: string, name: string): Promise<RepositoryRecord | null> {
    const prisma = getPrismaClient();
    const repo = await prisma.repository.findUnique({
      where: { owner_name: { owner, name } },
      include: { syncState: true },
    });
    if (!repo) return null;
    return {
      ...repo,
      githubRepoId: repo.githubRepoId.toString(),
      syncState: repo.syncState
        ? {
            ...repo.syncState,
            checkpoints: (repo.syncState.checkpoints as Record<string, unknown>) || null,
          }
        : null,
    };
  }

  public async findRepositoryById(id: string): Promise<RepositoryRecord | null> {
    const prisma = getPrismaClient();
    const repo = await prisma.repository.findUnique({
      where: { id },
      include: { syncState: true },
    });
    if (!repo) return null;
    return {
      ...repo,
      githubRepoId: repo.githubRepoId.toString(),
      syncState: repo.syncState
        ? {
            ...repo.syncState,
            checkpoints: (repo.syncState.checkpoints as Record<string, unknown>) || null,
          }
        : null,
    };
  }

  public async listRepositories(): Promise<RepositoryRecord[]> {
    const prisma = getPrismaClient();
    const list = await prisma.repository.findMany({
      include: { syncState: true },
      orderBy: { updatedAt: 'desc' },
    });
    return list.map((repo) => ({
      ...repo,
      githubRepoId: repo.githubRepoId.toString(),
      syncState: repo.syncState
        ? {
            ...repo.syncState,
            checkpoints: (repo.syncState.checkpoints as Record<string, unknown>) || null,
          }
        : null,
    }));
  }

  public async upsertRepository(data: {
    githubRepoId: bigint | number;
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    isPrivate: boolean;
    htmlUrl: string;
    description: string | null;
    installationId?: string | null;
  }): Promise<RepositoryRecord> {
    const prisma = getPrismaClient();
    const bigIntRepoId = BigInt(data.githubRepoId);

    const repo = await prisma.repository.upsert({
      where: { owner_name: { owner: data.owner, name: data.name } },
      create: {
        githubRepoId: bigIntRepoId,
        owner: data.owner,
        name: data.name,
        fullName: data.fullName,
        defaultBranch: data.defaultBranch,
        isPrivate: data.isPrivate,
        htmlUrl: data.htmlUrl,
        description: data.description,
        installationId: data.installationId ?? null,
        syncState: {
          create: {
            status: 'IDLE',
          },
        },
      },
      update: {
        githubRepoId: bigIntRepoId,
        fullName: data.fullName,
        defaultBranch: data.defaultBranch,
        isPrivate: data.isPrivate,
        htmlUrl: data.htmlUrl,
        description: data.description,
        ...(data.installationId ? { installationId: data.installationId } : {}),
      },
      include: { syncState: true },
    });

    return {
      ...repo,
      githubRepoId: repo.githubRepoId.toString(),
      syncState: repo.syncState
        ? {
            ...repo.syncState,
            checkpoints: (repo.syncState.checkpoints as Record<string, unknown>) || null,
          }
        : null,
    };
  }

  public async getSyncState(repositoryId: string): Promise<RepositorySyncStateRecord | null> {
    const prisma = getPrismaClient();
    const syncState = await prisma.repositorySyncState.findUnique({
      where: { repositoryId },
    });
    if (!syncState) return null;
    return {
      ...syncState,
      checkpoints: (syncState.checkpoints as Record<string, unknown>) || null,
    };
  }

  public async updateSyncState(
    repositoryId: string,
    updates: Partial<Omit<RepositorySyncStateRecord, 'id' | 'repositoryId'>>
  ): Promise<RepositorySyncStateRecord> {
    const prisma = getPrismaClient();
    const { progress: _, checkpoints, ...restUpdates } = updates;
    const jsonCheckpoints =
      checkpoints === null
        ? Prisma.JsonNull
        : checkpoints !== undefined
        ? (checkpoints as Prisma.InputJsonValue)
        : undefined;

    const dataToSave = {
      ...restUpdates,
      ...(checkpoints !== undefined ? { checkpoints: jsonCheckpoints } : {}),
    };

    const syncState = await prisma.repositorySyncState.upsert({
      where: { repositoryId },
      create: {
        repositoryId,
        ...dataToSave,
      },
      update: {
        ...dataToSave,
      },
    });

    return {
      ...syncState,
      checkpoints: (syncState.checkpoints as Record<string, unknown>) || null,
    };
  }

  public async upsertIssues(issues: UpsertIssueInput[]): Promise<number> {
    const prisma = getPrismaClient();
    let count = 0;
    for (const issue of issues) {
      await prisma.issue.upsert({
        where: {
          repositoryId_number: {
            repositoryId: issue.repositoryId,
            number: issue.number,
          },
        },
        create: {
          githubIssueId: BigInt(issue.githubIssueId),
          repositoryId: issue.repositoryId,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          author: issue.author,
          labels: (issue.labels as any) || [],
          htmlUrl: issue.htmlUrl,
          closedAt: issue.closedAt ? new Date(issue.closedAt) : null,
          createdAt: new Date(issue.createdAt),
          updatedAt: new Date(issue.updatedAt),
        },
        update: {
          title: issue.title,
          body: issue.body,
          state: issue.state,
          author: issue.author,
          labels: (issue.labels as any) || [],
          htmlUrl: issue.htmlUrl,
          closedAt: issue.closedAt ? new Date(issue.closedAt) : null,
          updatedAt: new Date(issue.updatedAt),
        },
      });
      count++;
    }
    return count;
  }

  public async upsertPullRequests(prs: UpsertPullRequestInput[]): Promise<number> {
    const prisma = getPrismaClient();
    let count = 0;
    for (const pr of prs) {
      await prisma.pullRequest.upsert({
        where: {
          repositoryId_number: {
            repositoryId: pr.repositoryId,
            number: pr.number,
          },
        },
        create: {
          githubPrId: BigInt(pr.githubPrId),
          repositoryId: pr.repositoryId,
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: pr.state,
          isDraft: pr.isDraft,
          merged: pr.merged,
          mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
          author: pr.author,
          baseRef: pr.baseRef,
          headRef: pr.headRef,
          htmlUrl: pr.htmlUrl,
          createdAt: new Date(pr.createdAt),
          updatedAt: new Date(pr.updatedAt),
        },
        update: {
          title: pr.title,
          body: pr.body,
          state: pr.state,
          isDraft: pr.isDraft,
          merged: pr.merged,
          mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
          author: pr.author,
          baseRef: pr.baseRef,
          headRef: pr.headRef,
          htmlUrl: pr.htmlUrl,
          updatedAt: new Date(pr.updatedAt),
        },
      });
      count++;
    }
    return count;
  }

  public async listWorkItems(
    repositoryId: string,
    filters: WorkItemFilters
  ): Promise<PaginatedResult<WorkItemSummary>> {
    const prisma = getPrismaClient();
    const items: WorkItemSummary[] = [];

    const shouldIncludeIssues =
      filters.type === undefined || filters.type === 'all' || filters.type === 'issue';
    const shouldIncludePRs =
      filters.type === undefined || filters.type === 'all' || filters.type === 'pull_request';

    const issueWhere: Prisma.IssueWhereInput = { repositoryId };
    const prWhere: Prisma.PullRequestWhereInput = { repositoryId };

    if (filters.state && filters.state !== 'all') {
      if (filters.state === 'open') {
        issueWhere.state = { equals: 'open', mode: 'insensitive' };
        prWhere.state = { equals: 'open', mode: 'insensitive' };
        prWhere.merged = false;
      } else if (filters.state === 'closed') {
        issueWhere.state = { equals: 'closed', mode: 'insensitive' };
        prWhere.OR = [
          { state: { equals: 'closed', mode: 'insensitive' } },
          { merged: true },
        ];
      }
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      const num = parseInt(q.replace(/^#/, ''), 10);
      if (!isNaN(num)) {
        issueWhere.OR = [{ title: { contains: q, mode: 'insensitive' } }, { number: num }];
        prWhere.OR = [{ title: { contains: q, mode: 'insensitive' } }, { number: num }];
      } else {
        issueWhere.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { body: { contains: q, mode: 'insensitive' } },
        ];
        prWhere.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { body: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    if (shouldIncludeIssues) {
      const dbIssues = await prisma.issue.findMany({
        where: issueWhere,
      });
      for (const issue of dbIssues) {
        const labelsList = Array.isArray(issue.labels)
          ? (issue.labels as any[]).map((l) => (typeof l === 'string' ? l : l.name || String(l)))
          : [];

        if (filters.label && filters.label.trim()) {
          const l = filters.label.trim().toLowerCase();
          if (!labelsList.some((lbl: string) => lbl.toLowerCase().includes(l))) {
            continue;
          }
        }

        items.push({
          id: issue.githubIssueId.toString(),
          type: 'issue',
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state.toLowerCase() === 'open' ? 'open' : 'closed',
          author: issue.author,
          labels: labelsList,
          htmlUrl: issue.htmlUrl,
          closedAt: issue.closedAt ? issue.closedAt.toISOString() : null,
          createdAt: issue.createdAt.toISOString(),
          updatedAt: issue.updatedAt.toISOString(),
        });
      }
    }

    if (shouldIncludePRs && (!filters.label || !filters.label.trim())) {
      const dbPRs = await prisma.pullRequest.findMany({
        where: prWhere,
      });
      for (const pr of dbPRs) {
        const isMerged = Boolean(
          pr.merged || pr.mergedAt !== null || pr.state.toLowerCase() === 'merged'
        );
        const state: 'open' | 'closed' | 'merged' = isMerged
          ? 'merged'
          : pr.state.toLowerCase() === 'open'
          ? 'open'
          : 'closed';
        items.push({
          id: pr.githubPrId.toString(),
          type: 'pull_request',
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state,
          isDraft: pr.isDraft,
          merged: isMerged,
          mergedAt: pr.mergedAt ? pr.mergedAt.toISOString() : null,
          author: pr.author,
          labels: [],
          htmlUrl: pr.htmlUrl,
          closedAt: isMerged
            ? (pr.mergedAt ? pr.mergedAt.toISOString() : null)
            : pr.state.toLowerCase() === 'closed'
            ? pr.updatedAt.toISOString()
            : null,
          createdAt: pr.createdAt.toISOString(),
          updatedAt: pr.updatedAt.toISOString(),
        });
      }
    }

    // Stable Sorting
    const sort = filters.sort || 'created_desc';
    items.sort((a, b) => {
      switch (sort) {
        case 'created_asc':
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
            a.number - b.number
          );
        case 'updated_desc':
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() ||
            b.number - a.number
          );
        case 'updated_asc':
          return (
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime() ||
            a.number - b.number
          );
        case 'number_desc':
          return b.number - a.number;
        case 'number_asc':
          return a.number - b.number;
        case 'created_desc':
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
            b.number - a.number
          );
      }
    });

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const total = items.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedItems = items.slice((page - 1) * limit, page * limit);

    // Enrich with relationship intelligence & resolution status
    const allRels = await this.getRelationships(repositoryId);
    const syncState = await this.getSyncState(repositoryId);

    for (const item of paginatedItems) {
      const itemRels = allRels.filter(
        (r) => r.sourceNumber === item.number || r.targetNumber === item.number
      );
      item.relationshipsCount = itemRels.length;

      if (item.type === 'issue') {
        const rawIssue: RawIssueRecord = {
          id: item.id,
          number: item.number,
          title: item.title,
          body: item.body,
          state: item.state,
          closedAt: item.closedAt,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
        const assessment = RelationshipEngine.assessIssueResolution(rawIssue, itemRels, syncState);
        item.resolutionStatus = assessment.status;
      }
    }

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async getWorkItem(
    repositoryId: string,
    number: number
  ): Promise<WorkItemDetail | null> {
    const prisma = getPrismaClient();

    const pr = await prisma.pullRequest.findUnique({
      where: {
        repositoryId_number: { repositoryId, number },
      },
    });

    if (pr) {
      const isMerged = Boolean(
        pr.merged || pr.mergedAt !== null || pr.state.toLowerCase() === 'merged'
      );
      const state: 'open' | 'closed' | 'merged' = isMerged
        ? 'merged'
        : pr.state.toLowerCase() === 'open'
        ? 'open'
        : 'closed';
      const rels = await this.getRelationships(repositoryId, { itemNumber: number });
      return {
        id: pr.githubPrId.toString(),
        type: 'pull_request',
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state,
        isDraft: pr.isDraft,
        merged: isMerged,
        mergedAt: pr.mergedAt ? pr.mergedAt.toISOString() : null,
        author: pr.author,
        labels: [],
        baseRef: pr.baseRef,
        headRef: pr.headRef,
        htmlUrl: pr.htmlUrl,
        closedAt: isMerged
          ? (pr.mergedAt ? pr.mergedAt.toISOString() : null)
          : pr.state.toLowerCase() === 'closed'
          ? pr.updatedAt.toISOString()
          : null,
        createdAt: pr.createdAt.toISOString(),
        updatedAt: pr.updatedAt.toISOString(),
        timelineAvailable: false,
        diffAvailable: false,
        timelineNotes: 'Discussion timeline was not collected in the initial sync tier.',
        diffNotes: 'Diff details were not collected in the initial sync tier.',
        relationshipsCount: rels.length,
        relationships: rels,
        resolutionAssessment: null,
      };
    }

    const issue = await prisma.issue.findUnique({
      where: {
        repositoryId_number: { repositoryId, number },
      },
    });

    if (issue) {
      const labelsList = Array.isArray(issue.labels)
        ? (issue.labels as any[]).map((l) => (typeof l === 'string' ? l : l.name || String(l)))
        : [];
      const rels = await this.getRelationships(repositoryId, { itemNumber: number });
      const assessment = await this.assessResolution(repositoryId, number);
      return {
        id: issue.githubIssueId.toString(),
        type: 'issue',
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state.toLowerCase() === 'open' ? 'open' : 'closed',
        author: issue.author,
        labels: labelsList,
        htmlUrl: issue.htmlUrl,
        closedAt: issue.closedAt ? issue.closedAt.toISOString() : null,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
        timelineAvailable: false,
        diffAvailable: false,
        timelineNotes: 'Discussion timeline was not collected in the initial sync tier.',
        relationshipsCount: rels.length,
        resolutionStatus: assessment?.status,
        relationships: rels,
        resolutionAssessment: assessment,
      };
    }

    return null;
  }

  public async getRelationships(
    repositoryId: string,
    filter?: { itemNumber?: number; type?: RelationshipType }
  ): Promise<RelationshipInfo[]> {
    const prisma = getPrismaClient();

    const dbIssues = await prisma.issue.findMany({ where: { repositoryId } });
    const dbPRs = await prisma.pullRequest.findMany({ where: { repositoryId } });

    const rawIssues: RawIssueRecord[] = dbIssues.map((i) => ({
      id: i.githubIssueId.toString(),
      number: i.number,
      title: i.title,
      body: i.body,
      state: i.state,
      closedAt: i.closedAt,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));

    const rawPRs: RawPullRequestRecord[] = dbPRs.map((p) => ({
      id: p.githubPrId.toString(),
      number: p.number,
      title: p.title,
      body: p.body,
      state: p.state,
      isDraft: p.isDraft,
      merged: p.merged,
      mergedAt: p.mergedAt,
      baseRef: p.baseRef,
      headRef: p.headRef,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    const detected = RelationshipEngine.detectRelationships(repositoryId, rawIssues, rawPRs);

    // Persist to Prisma if DB is available (swallowing connection errors gracefully)
    try {
      for (const rel of detected) {
        await prisma.relationship.upsert({
          where: { id: rel.id },
          create: {
            id: rel.id,
            repositoryId: rel.repositoryId,
            sourceId: rel.sourceId,
            sourceType: rel.sourceType as any,
            targetId: rel.targetId,
            targetType: rel.targetType as any,
            relationshipType: rel.relationshipType as any,
            category: rel.category as any,
            confidence: rel.confidence as any,
            method: rel.method,
            evidenceSummary: rel.evidenceSummary,
            evidenceDetails: (rel.evidenceDetails || Prisma.DbNull) as any,
          },
          update: {
            relationshipType: rel.relationshipType as any,
            category: rel.category as any,
            confidence: rel.confidence as any,
            method: rel.method,
            evidenceSummary: rel.evidenceSummary,
            evidenceDetails: (rel.evidenceDetails || Prisma.DbNull) as any,
          },
        });
      }
    } catch {
      // In offline or testing mode, return detected relationships in memory
    }

    let results = detected;
    if (filter?.itemNumber !== undefined) {
      const num = filter.itemNumber;
      results = results.filter(
        (r) => r.sourceNumber === num || r.targetNumber === num
      );
    }
    if (filter?.type !== undefined) {
      results = results.filter((r) => r.relationshipType === filter.type);
    }
    return results;
  }

  public async assessResolution(
    repositoryId: string,
    issueNumber: number
  ): Promise<ResolutionAssessment | null> {
    const prisma = getPrismaClient();
    const issue = await prisma.issue.findUnique({
      where: { repositoryId_number: { repositoryId, number: issueNumber } },
    });
    if (!issue) return null;

    const rels = await this.getRelationships(repositoryId, { itemNumber: issueNumber });
    const syncState = await this.getSyncState(repositoryId);

    const rawIssue: RawIssueRecord = {
      id: issue.githubIssueId.toString(),
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      closedAt: issue.closedAt,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    };

    return RelationshipEngine.assessIssueResolution(rawIssue, rels, syncState);
  }

  public async getContributorRecommendations(
    repositoryId: string,
    options?: { itemNumber?: number; subsystem?: string; limit?: number; now?: Date }
  ): Promise<ContributionAnalysisResult> {
    const prisma = getPrismaClient();
    const [dbIssues, dbPRs] = await Promise.all([
      prisma.issue.findMany({ where: { repositoryId } }),
      prisma.pullRequest.findMany({ where: { repositoryId } }),
    ]);

    const issues: RawIssueRecord[] = dbIssues.map((i) => ({
      id: i.githubIssueId.toString(),
      number: i.number,
      title: i.title,
      body: i.body,
      state: i.state,
      author: i.author,
      labels: i.labels,
      closedAt: i.closedAt,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));

    const prs: RawPullRequestRecord[] = dbPRs.map((p) => ({
      id: p.githubPrId.toString(),
      number: p.number,
      title: p.title,
      body: p.body,
      state: p.state,
      isDraft: p.isDraft,
      merged: p.merged,
      mergedAt: p.mergedAt,
      author: p.author,
      baseRef: p.baseRef,
      headRef: p.headRef,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    const rels = await this.getRelationships(repositoryId);
    const syncState = await this.getSyncState(repositoryId);

    return ContributionEngine.rankContributors(
      repositoryId,
      options || {},
      issues,
      prs,
      rels,
      syncState
    );
  }

  public async traceArchaeology(
    repositoryId: string,
    options: {
      query: string;
      filePath?: string;
      sourceContent?: string;
      commits?: RawCommitRecord[];
    }
  ): Promise<ArchaeologyTraceResult> {
    const prisma = getPrismaClient();
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
    });
    if (!repo) {
      throw new Error(`Repository with ID ${repositoryId} not found`);
    }

    const dbPRs = await prisma.pullRequest.findMany({
      where: { repositoryId },
    });

    const prs: RawPullRequestRecord[] = dbPRs.map((p) => ({
      id: p.githubPrId.toString(),
      number: p.number,
      title: p.title,
      body: p.body,
      state: p.state,
      isDraft: p.isDraft,
      merged: p.merged,
      mergedAt: p.mergedAt,
      author: p.author,
      baseRef: p.baseRef,
      headRef: p.headRef,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    const engine = new ArchaeologyEngine();
    return engine.trace({
      query: options.query,
      filePath: options.filePath,
      repoOwner: repo.owner,
      repoName: repo.name,
      defaultBranch: repo.defaultBranch,
      sourceCode: options.sourceContent,
      pullRequests: prs,
      commitRecords: options.commits ?? [],
    });
  }

  public async listInvestigations(
    userId: string,
    filter?: { repositoryId?: string; search?: string; status?: string }
  ): Promise<InvestigationRecord[]> {
    const prisma = getPrismaClient();
    const dbUser = await prisma.user.findUnique({
      where: { firebaseUid: userId },
    });
    if (!dbUser) {
      return [];
    }

    const where: Prisma.InvestigationWhereInput = {
      userId: dbUser.id,
    };

    if (filter?.repositoryId) {
      where.repositoryId = filter.repositoryId;
    }

    if (filter?.status && filter.status !== 'all') {
      where.status = filter.status;
    }

    const rows = await prisma.investigation.findMany({
      where,
      include: { repository: true },
      orderBy: { updatedAt: 'desc' },
    });

    let results = rows.map((row) => {
      const findingsJson = row.findings as Record<string, unknown> | unknown[];
      let findingsList: string[] = [];
      let evidenceItems: InvestigationRecord['evidenceItems'] = [];

      if (Array.isArray(findingsJson)) {
        findingsList = findingsJson as string[];
      } else if (findingsJson && typeof findingsJson === 'object') {
        findingsList = (findingsJson.findings as string[]) ?? [];
        evidenceItems = (findingsJson.evidenceItems as InvestigationRecord['evidenceItems']) ?? [];
      }

      return {
        id: row.id,
        userId,
        repositoryId: row.repositoryId,
        repositoryName: `${row.repository.owner}/${row.repository.name}`,
        question: row.question,
        scope: row.scope,
        status: row.status as InvestigationRecord['status'],
        hypotheses: (row.hypotheses as string[]) ?? [],
        observations: (row.observations as string[]) ?? [],
        findings: findingsList,
        limitations: (row.limitations as string[]) ?? [],
        evidenceItems,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    });

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      results = results.filter(
        (inv) =>
          inv.question.toLowerCase().includes(q) ||
          inv.scope.toLowerCase().includes(q)
      );
    }

    return results;
  }

  public async getInvestigation(
    userId: string,
    id: string
  ): Promise<InvestigationRecord | null> {
    const prisma = getPrismaClient();
    const dbUser = await prisma.user.findUnique({
      where: { firebaseUid: userId },
    });
    if (!dbUser) return null;

    const row = await prisma.investigation.findFirst({
      where: { id, userId: dbUser.id },
      include: { repository: true },
    });

    if (!row) return null;

    const findingsJson = row.findings as Record<string, unknown> | unknown[];
    let findingsList: string[] = [];
    let evidenceItems: InvestigationRecord['evidenceItems'] = [];

    if (Array.isArray(findingsJson)) {
      findingsList = findingsJson as string[];
    } else if (findingsJson && typeof findingsJson === 'object') {
      findingsList = (findingsJson.findings as string[]) ?? [];
      evidenceItems = (findingsJson.evidenceItems as InvestigationRecord['evidenceItems']) ?? [];
    }

    return {
      id: row.id,
      userId,
      repositoryId: row.repositoryId,
      repositoryName: `${row.repository.owner}/${row.repository.name}`,
      question: row.question,
      scope: row.scope,
      status: row.status as InvestigationRecord['status'],
      hypotheses: (row.hypotheses as string[]) ?? [],
      observations: (row.observations as string[]) ?? [],
      findings: findingsList,
      limitations: (row.limitations as string[]) ?? [],
      evidenceItems,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  public async createInvestigation(
    userId: string,
    data: CreateInvestigationInput
  ): Promise<InvestigationRecord> {
    const prisma = getPrismaClient();
    const dbUser = await prisma.user.upsert({
      where: { firebaseUid: userId },
      update: {},
      create: {
        firebaseUid: userId,
        displayName: 'Forensic Investigator',
      },
    });

    const repo = await prisma.repository.findUnique({
      where: { id: data.repositoryId },
    });
    if (!repo) {
      throw new Error(`Repository with ID ${data.repositoryId} not found`);
    }

    const row = await prisma.investigation.create({
      data: {
        userId: dbUser.id,
        repositoryId: data.repositoryId,
        question: data.question,
        scope: data.scope,
        status: data.status ?? 'open',
        hypotheses: data.hypotheses ?? [],
        observations: data.observations ?? [],
        findings: {
          findings: data.findings ?? [],
          evidenceItems: data.evidenceItems ?? [],
        } as unknown as Prisma.InputJsonValue,
        limitations: data.limitations ?? [],
      },
      include: { repository: true },
    });

    return {
      id: row.id,
      userId,
      repositoryId: row.repositoryId,
      repositoryName: `${repo.owner}/${repo.name}`,
      question: row.question,
      scope: row.scope,
      status: row.status as InvestigationRecord['status'],
      hypotheses: (row.hypotheses as string[]) ?? [],
      observations: (row.observations as string[]) ?? [],
      findings: data.findings ?? [],
      limitations: data.limitations ?? [],
      evidenceItems: data.evidenceItems ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  public async updateInvestigation(
    userId: string,
    id: string,
    data: UpdateInvestigationInput
  ): Promise<InvestigationRecord | null> {
    const prisma = getPrismaClient();
    const dbUser = await prisma.user.findUnique({
      where: { firebaseUid: userId },
    });
    if (!dbUser) return null;

    const existing = await prisma.investigation.findFirst({
      where: { id, userId: dbUser.id },
      include: { repository: true },
    });
    if (!existing) return null;

    const updateData: Prisma.InvestigationUpdateInput = {};
    if (data.question !== undefined) updateData.question = data.question;
    if (data.scope !== undefined) updateData.scope = data.scope;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.hypotheses !== undefined) updateData.hypotheses = data.hypotheses;
    if (data.observations !== undefined) updateData.observations = data.observations;
    if (data.limitations !== undefined) updateData.limitations = data.limitations;

    if (data.findings !== undefined || data.evidenceItems !== undefined) {
      const existingFindingsJson = existing.findings as Record<string, unknown> | unknown[];
      let oldFindings: string[] = [];
      let oldEvidence: InvestigationRecord['evidenceItems'] = [];
      if (Array.isArray(existingFindingsJson)) {
        oldFindings = existingFindingsJson as string[];
      } else if (existingFindingsJson && typeof existingFindingsJson === 'object') {
        oldFindings = (existingFindingsJson.findings as string[]) ?? [];
        oldEvidence = (existingFindingsJson.evidenceItems as InvestigationRecord['evidenceItems']) ?? [];
      }

      updateData.findings = {
        findings: data.findings !== undefined ? data.findings : oldFindings,
        evidenceItems: data.evidenceItems !== undefined ? data.evidenceItems : oldEvidence,
      } as unknown as Prisma.InputJsonValue;
    }

    const row = await prisma.investigation.update({
      where: { id },
      data: updateData,
      include: { repository: true },
    });

    const findingsJson = row.findings as Record<string, unknown> | unknown[];
    let findingsList: string[] = [];
    let evidenceItems: InvestigationRecord['evidenceItems'] = [];

    if (Array.isArray(findingsJson)) {
      findingsList = findingsJson as string[];
    } else if (findingsJson && typeof findingsJson === 'object') {
      findingsList = (findingsJson.findings as string[]) ?? [];
      evidenceItems = (findingsJson.evidenceItems as InvestigationRecord['evidenceItems']) ?? [];
    }

    return {
      id: row.id,
      userId,
      repositoryId: row.repositoryId,
      repositoryName: `${row.repository.owner}/${row.repository.name}`,
      question: row.question,
      scope: row.scope,
      status: row.status as InvestigationRecord['status'],
      hypotheses: (row.hypotheses as string[]) ?? [],
      observations: (row.observations as string[]) ?? [],
      findings: findingsList,
      limitations: (row.limitations as string[]) ?? [],
      evidenceItems,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  public async deleteInvestigation(userId: string, id: string): Promise<boolean> {
    const prisma = getPrismaClient();
    const dbUser = await prisma.user.findUnique({
      where: { firebaseUid: userId },
    });
    if (!dbUser) return false;

    const existing = await prisma.investigation.findFirst({
      where: { id, userId: dbUser.id },
    });
    if (!existing) return false;

    await prisma.investigation.delete({ where: { id } });
    return true;
  }
}

