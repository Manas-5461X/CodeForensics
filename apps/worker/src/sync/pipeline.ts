import type { Octokit } from 'octokit';
import { sanitizeLog, type SyncJobResult } from '../processors/syncProcessor.js';

export interface SyncTarget {
  repositoryId: string;
  owner: string;
  repo: string;
  installationId?: number;
}

export interface SyncIssueRecord {
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

export interface SyncPullRequestRecord {
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

export interface SyncStorageAdapter {
  updateSyncState(
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
  ): Promise<void>;
  upsertIssues(issues: SyncIssueRecord[]): Promise<number>;
  upsertPullRequests(prs: SyncPullRequestRecord[]): Promise<number>;
  updateRepositoryMetadata?(
    repositoryId: string,
    metadata: { defaultBranch?: string; description?: string | null }
  ): Promise<void>;
}

export interface SyncPipelineOptions {
  octokit: Octokit;
  storage: SyncStorageAdapter;
  onProgress?: (progressPercent: number, status: string) => Promise<void> | void;
  maxPagesPerEntity?: number; // Protection limit
  retryDelayMs?: number;
}

/**
 * Executes the observable, resilient repository sync pipeline.
 */
export async function executeRepositorySync(
  target: SyncTarget,
  options: SyncPipelineOptions
): Promise<SyncJobResult> {
  const { repositoryId, owner, repo } = target;
  const { octokit, storage, onProgress, maxPagesPerEntity = 50 } = options;

  const notes: string[] = [];
  let totalIssuesImported = 0;
  let totalPrsImported = 0;
  let isPartial = false;
  let partialReason: string | null = null;

  // 1. Mark as RUNNING and report initial progress
  await storage.updateSyncState(repositoryId, {
    status: 'RUNNING',
    startedAt: new Date(),
    progress: 5,
    errorSummary: null,
  });
  if (onProgress) await onProgress(5, 'Starting repository sync');

  try {
    // 2. Fetch and verify repository metadata
    try {
      const repoResp = await octokit.rest.repos.get({ owner, repo });
      if (storage.updateRepositoryMetadata && repoResp.data) {
        await storage.updateRepositoryMetadata(repositoryId, {
          defaultBranch: repoResp.data.default_branch,
          description: repoResp.data.description,
        });
      }
      notes.push(`Verified repository metadata: default branch '${repoResp.data.default_branch}'`);
    } catch (err) {
      notes.push(`Repository metadata check note: ${sanitizeLog(err instanceof Error ? err.message : String(err))}`);
    }

    if (onProgress) await onProgress(15, 'Repository metadata verified');
    await storage.updateSyncState(repositoryId, { progress: 15 });

    // 3. Paginated Issues Ingestion
    let issuePage = 1;
    let hasMoreIssues = true;

    while (hasMoreIssues && issuePage <= maxPagesPerEntity) {
      try {
        const issuesResp = await octokit.rest.issues.listForRepo({
          owner,
          repo,
          state: 'all',
          per_page: 100,
          page: issuePage,
        });

        const items = issuesResp.data || [];
        if (items.length === 0) {
          hasMoreIssues = false;
          break;
        }

        // Filter out pull requests which GitHub includes in issues endpoint
        const pureIssues = items.filter((item) => !(item as { pull_request?: unknown }).pull_request);

        const mappedIssues: SyncIssueRecord[] = pureIssues.map((item) => ({
          githubIssueId: item.id,
          repositoryId,
          number: item.number,
          title: item.title,
          body: item.body || null,
          state: item.state,
          author: item.user?.login || null,
          labels: item.labels?.map((l) => (typeof l === 'string' ? l : l.name)) || [],
          htmlUrl: item.html_url,
          closedAt: item.closed_at ? new Date(item.closed_at) : null,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
        }));

        if (mappedIssues.length > 0) {
          const count = await storage.upsertIssues(mappedIssues);
          totalIssuesImported += count;
        }

        // Check rate-limit header
        const remaining = issuesResp.headers?.['x-ratelimit-remaining'];
        if (remaining && parseInt(remaining, 10) === 0) {
          isPartial = true;
          partialReason = 'GitHub API rate limit exhausted during issues pagination.';
          notes.push(partialReason);
          break;
        }

        if (items.length < 100) {
          hasMoreIssues = false;
        } else {
          issuePage++;
        }

        const issuesProgress = Math.min(45, 15 + Math.floor(issuePage * 5));
        await storage.updateSyncState(repositoryId, {
          progress: issuesProgress,
          issuesCount: totalIssuesImported,
          recordsImported: totalIssuesImported,
          checkpoints: { issuePage, issuesImported: totalIssuesImported },
        });
        if (onProgress) await onProgress(issuesProgress, `Imported ${totalIssuesImported} issues`);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.toLowerCase().includes('fatal')) {
          throw err;
        }
        const status = (err as { status?: number })?.status;
        if (status === 403 || status === 429) {
          isPartial = true;
          partialReason = `GitHub rate limit exceeded at issue page ${issuePage}.`;
          notes.push(partialReason);
          break;
        }
        // If transient error, record note and break to PRs
        isPartial = true;
        partialReason = `Transient issue fetching error: ${sanitizeLog(err instanceof Error ? err.message : String(err))}`;
        notes.push(partialReason);
        break;
      }
    }

    if (onProgress) await onProgress(50, `Completed issues ingestion (${totalIssuesImported} issues)`);

    // 4. Paginated Pull Requests Ingestion
    let prPage = 1;
    let hasMorePrs = !isPartial; // If already rate limited, skip PRs or try

    while (hasMorePrs && prPage <= maxPagesPerEntity) {
      try {
        const prsResp = await octokit.rest.pulls.list({
          owner,
          repo,
          state: 'all',
          per_page: 100,
          page: prPage,
        });

        const items = prsResp.data || [];
        if (items.length === 0) {
          hasMorePrs = false;
          break;
        }

        const mappedPrs: SyncPullRequestRecord[] = items.map((item) => ({
          githubPrId: item.id,
          repositoryId,
          number: item.number,
          title: item.title,
          body: item.body || null,
          state: item.state,
          isDraft: item.draft || false,
          merged: Boolean(item.merged_at),
          mergedAt: item.merged_at ? new Date(item.merged_at) : null,
          author: item.user?.login || null,
          baseRef: item.base?.ref || null,
          headRef: item.head?.ref || null,
          htmlUrl: item.html_url,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
        }));

        if (mappedPrs.length > 0) {
          const count = await storage.upsertPullRequests(mappedPrs);
          totalPrsImported += count;
        }

        const remaining = prsResp.headers?.['x-ratelimit-remaining'];
        if (remaining && parseInt(remaining, 10) === 0) {
          isPartial = true;
          partialReason = 'GitHub API rate limit exhausted during pull request pagination.';
          notes.push(partialReason);
          break;
        }

        if (items.length < 100) {
          hasMorePrs = false;
        } else {
          prPage++;
        }

        const prsProgress = Math.min(85, 50 + Math.floor(prPage * 5));
        await storage.updateSyncState(repositoryId, {
          progress: prsProgress,
          prsCount: totalPrsImported,
          recordsImported: totalIssuesImported + totalPrsImported,
          checkpoints: { issuePage, prPage, prsImported: totalPrsImported },
        });
        if (onProgress) await onProgress(prsProgress, `Imported ${totalPrsImported} pull requests`);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.toLowerCase().includes('fatal')) {
          throw err;
        }
        const status = (err as { status?: number })?.status;
        if (status === 403 || status === 429) {
          isPartial = true;
          partialReason = `GitHub rate limit exceeded at PR page ${prPage}.`;
          notes.push(partialReason);
          break;
        }
        isPartial = true;
        partialReason = `Transient PR fetching error: ${sanitizeLog(err instanceof Error ? err.message : String(err))}`;
        notes.push(partialReason);
        break;
      }
    }

    // 5. Finalize Sync State
    const now = new Date();
    const finalStatus = isPartial ? 'PARTIAL' : 'COMPLETED';
    const totalRecords = totalIssuesImported + totalPrsImported;

    await storage.updateSyncState(repositoryId, {
      status: finalStatus,
      completedAt: now,
      lastSuccessfulSyncAt: finalStatus === 'COMPLETED' ? now : undefined,
      recordsImported: totalRecords,
      issuesCount: totalIssuesImported,
      prsCount: totalPrsImported,
      progress: 100,
      errorSummary: partialReason,
      checkpoints: {
        completed: !isPartial,
        issuesCount: totalIssuesImported,
        prsCount: totalPrsImported,
      },
    });

    if (onProgress) await onProgress(100, `Sync ${finalStatus.toLowerCase()}: ${totalRecords} records`);

    return {
      repositoryId,
      status: finalStatus,
      recordsImported: totalRecords,
      coverageComplete: !isPartial,
      notes: [
        ...notes,
        `Imported ${totalIssuesImported} issues and ${totalPrsImported} pull requests.`,
        ...(partialReason ? [`Coverage warning: ${partialReason}`] : []),
      ],
    };
  } catch (fatalErr: unknown) {
    const errorMsg = sanitizeLog(fatalErr instanceof Error ? fatalErr.message : String(fatalErr));
    await storage.updateSyncState(repositoryId, {
      status: 'FAILED',
      completedAt: new Date(),
      errorSummary: errorMsg,
      progress: 100,
    });

    throw fatalErr;
  }
}
