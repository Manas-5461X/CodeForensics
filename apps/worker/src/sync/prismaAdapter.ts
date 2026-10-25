import { PrismaClient, Prisma } from '@prisma/client';
import type {
  SyncStorageAdapter,
  SyncIssueRecord,
  SyncPullRequestRecord,
} from './pipeline.js';

let sharedPrismaClient: PrismaClient | null = null;

export function getWorkerPrismaClient(): PrismaClient {
  if (!sharedPrismaClient) {
    sharedPrismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return sharedPrismaClient;
}

export class PrismaSyncStorageAdapter implements SyncStorageAdapter {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? getWorkerPrismaClient();
  }

  public async updateSyncState(
    repositoryId: string,
    updates: {
      status?: 'IDLE' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
      startedAt?: Date;
      completedAt?: Date;
      lastSuccessfulSyncAt?: Date;
      recordsImported?: number;
      issuesCount?: number;
      prsCount?: number;
      progress?: number;
      checkpoints?: Record<string, unknown> | null;
      errorSummary?: string | null;
    }
  ): Promise<void> {
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

    await this.prisma.repositorySyncState.upsert({
      where: { repositoryId },
      create: {
        repositoryId,
        ...dataToSave,
      },
      update: {
        ...dataToSave,
      },
    });
  }

  public async upsertIssues(issues: SyncIssueRecord[]): Promise<number> {
    let count = 0;
    for (const issue of issues) {
      await this.prisma.issue.upsert({
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

  public async upsertPullRequests(prs: SyncPullRequestRecord[]): Promise<number> {
    let count = 0;
    for (const pr of prs) {
      await this.prisma.pullRequest.upsert({
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

  public async updateRepositoryMetadata(
    repositoryId: string,
    metadata: { defaultBranch?: string; description?: string | null }
  ): Promise<void> {
    await this.prisma.repository.update({
      where: { id: repositoryId },
      data: {
        ...(metadata.defaultBranch ? { defaultBranch: metadata.defaultBranch } : {}),
        ...(metadata.description !== undefined ? { description: metadata.description } : {}),
      },
    });
  }
}

/**
 * In-memory adapter for testing worker pipelines without live PostgreSQL
 */
export class InMemorySyncStorageAdapter implements SyncStorageAdapter {
  public syncStates = new Map<string, any>();
  public issues = new Map<string, SyncIssueRecord>();
  public pullRequests = new Map<string, SyncPullRequestRecord>();
  public metadata = new Map<string, any>();

  public async updateSyncState(repositoryId: string, updates: any): Promise<void> {
    const existing = this.syncStates.get(repositoryId) || {};
    this.syncStates.set(repositoryId, { ...existing, ...updates });
  }

  public async upsertIssues(issues: SyncIssueRecord[]): Promise<number> {
    for (const issue of issues) {
      const key = `${issue.repositoryId}:${issue.number}`;
      this.issues.set(key, issue);
    }
    return issues.length;
  }

  public async upsertPullRequests(prs: SyncPullRequestRecord[]): Promise<number> {
    for (const pr of prs) {
      const key = `${pr.repositoryId}:${pr.number}`;
      this.pullRequests.set(key, pr);
    }
    return prs.length;
  }

  public async updateRepositoryMetadata(repositoryId: string, metadata: any): Promise<void> {
    this.metadata.set(repositoryId, metadata);
  }
}
