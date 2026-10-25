import { describe, it, expect, beforeEach } from 'vitest';
import { executeRepositorySync } from '../src/sync/pipeline.js';
import { InMemorySyncStorageAdapter } from '../src/sync/prismaAdapter.js';
import { processSyncJob } from '../src/processors/syncProcessor.js';
import type { Job } from 'bullmq';
import type { RepositorySyncJobData } from '../queues/syncQueue.js';

describe('Phase 4: Worker Synchronization Pipeline', () => {
  let inMemoryStorage: InMemorySyncStorageAdapter;

  beforeEach(() => {
    inMemoryStorage = new InMemorySyncStorageAdapter();
  });

  const createMockOctokit = (custom?: {
    issuesPages?: any[][];
    prsPages?: any[][];
    simulateRateLimit?: boolean;
    simulateFatalError?: boolean;
    rateLimitRemaining?: number;
  }) => {
    let issuePageCallCount = 0;
    let prPageCallCount = 0;

    return {
      rest: {
        repos: {
          get: async () => ({
            data: {
              default_branch: 'main',
              description: 'Pipeline test repo',
            },
          }),
        },
        issues: {
          listForRepo: async ({ page = 1 }: { page?: number }) => {
            if (custom?.simulateFatalError) {
              throw new Error('Fatal database connection / network crash');
            }
            if (custom?.simulateRateLimit) {
              const err = new Error('API rate limit exceeded');
              (err as any).status = 403;
              throw err;
            }

            const pages = custom?.issuesPages || [
              [
                {
                  id: 1,
                  number: 1,
                  title: 'Issue 1',
                  body: 'Body 1',
                  state: 'open',
                  user: { login: 'alice' },
                  labels: [{ name: 'bug' }],
                  html_url: 'https://github.com/test/repo/issues/1',
                  created_at: '2026-10-01T00:00:00Z',
                  updated_at: '2026-10-01T00:00:00Z',
                },
                // Pull request item returned by GitHub issues endpoint - should be filtered
                {
                  id: 2,
                  number: 2,
                  title: 'PR 2 in issues endpoint',
                  state: 'open',
                  pull_request: { url: 'https://api.github.com/repos/test/repo/pulls/2' },
                  created_at: '2026-10-01T00:00:00Z',
                  updated_at: '2026-10-01T00:00:00Z',
                },
              ],
            ];

            issuePageCallCount++;
            const data = pages[page - 1] || [];
            return {
              data,
              headers: {
                'x-ratelimit-remaining': String(custom?.rateLimitRemaining ?? 5000),
              },
            };
          },
        },
        pulls: {
          list: async ({ page = 1 }: { page?: number }) => {
            const pages = custom?.prsPages || [
              [
                {
                  id: 201,
                  number: 2,
                  title: 'PR 2',
                  body: 'PR Body 2',
                  state: 'closed',
                  draft: false,
                  merged_at: '2026-10-02T00:00:00Z',
                  user: { login: 'bob' },
                  base: { ref: 'main' },
                  head: { ref: 'feature' },
                  html_url: 'https://github.com/test/repo/pull/2',
                  created_at: '2026-10-01T00:00:00Z',
                  updated_at: '2026-10-02T00:00:00Z',
                },
              ],
            ];

            prPageCallCount++;
            const data = pages[page - 1] || [];
            return {
              data,
              headers: {
                'x-ratelimit-remaining': String(custom?.rateLimitRemaining ?? 5000),
              },
            };
          },
        },
      },
    } as any;
  };

  it('paginates issues and PRs, filtering out PRs from issues API', async () => {
    // 2 pages of issues (100 on page 1, 1 on page 2)
    const page1Issues = Array.from({ length: 100 }, (_, i) => ({
      id: 1000 + i,
      number: i + 1,
      title: `Issue ${i + 1}`,
      body: `Body ${i + 1}`,
      state: 'open',
      user: { login: 'dev' },
      labels: [],
      html_url: `https://github.com/test/repo/issues/${i + 1}`,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    }));

    const page2Issues = [
      {
        id: 1200,
        number: 101,
        title: 'Issue 101',
        body: 'Body 101',
        state: 'closed',
        user: { login: 'dev' },
        labels: [],
        html_url: 'https://github.com/test/repo/issues/101',
        closed_at: '2026-10-05T00:00:00Z',
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-05T00:00:00Z',
      },
    ];

    const mockOctokit = createMockOctokit({
      issuesPages: [page1Issues, page2Issues],
      prsPages: [
        [
          {
            id: 2001,
            number: 200,
            title: 'Fix issue 101',
            body: 'Fixes #101',
            state: 'closed',
            draft: false,
            merged_at: '2026-10-05T00:00:00Z',
            user: { login: 'dev' },
            base: { ref: 'main' },
            head: { ref: 'fix/101' },
            html_url: 'https://github.com/test/repo/pull/200',
            created_at: '2026-10-02T00:00:00Z',
            updated_at: '2026-10-05T00:00:00Z',
          },
        ],
      ],
    });

    const progressUpdates: number[] = [];
    const result = await executeRepositorySync(
      {
        repositoryId: 'repo-test-1',
        owner: 'test',
        repo: 'repo',
      },
      {
        octokit: mockOctokit,
        storage: inMemoryStorage,
        onProgress: async (p) => {
          progressUpdates.push(p);
        },
      }
    );

    expect(result.status).toBe('COMPLETED');
    expect(result.coverageComplete).toBe(true);
    expect(result.recordsImported).toBe(102); // 101 issues + 1 PR
    expect(inMemoryStorage.issues.size).toBe(101);
    expect(inMemoryStorage.pullRequests.size).toBe(1);

    // Verify observable sync state persisted in storage
    const state = inMemoryStorage.syncStates.get('repo-test-1');
    expect(state.status).toBe('COMPLETED');
    expect(state.issuesCount).toBe(101);
    expect(state.prsCount).toBe(1);
    expect(state.progress).toBe(100);

    // Verify progress callbacks escalated monotonically to 100%
    expect(progressUpdates.length).toBeGreaterThan(3);
    expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
  });

  it('guarantees idempotency when re-running sync on the same repository', async () => {
    const mockOctokit = createMockOctokit();
    const target = {
      repositoryId: 'repo-idempotent',
      owner: 'test',
      repo: 'repo',
    };

    // Run sync run 1
    const run1 = await executeRepositorySync(target, {
      octokit: mockOctokit,
      storage: inMemoryStorage,
    });
    expect(run1.status).toBe('COMPLETED');
    expect(inMemoryStorage.issues.size).toBe(1);
    expect(inMemoryStorage.pullRequests.size).toBe(1);

    // Run sync run 2 (exact same repo)
    const run2 = await executeRepositorySync(target, {
      octokit: mockOctokit,
      storage: inMemoryStorage,
    });
    expect(run2.status).toBe('COMPLETED');

    // Storage size must NOT double
    expect(inMemoryStorage.issues.size).toBe(1);
    expect(inMemoryStorage.pullRequests.size).toBe(1);
  });

  it('handles rate limits gracefully by recording PARTIAL status and coverage limitation', async () => {
    const mockOctokit = createMockOctokit({ simulateRateLimit: true });
    const target = {
      repositoryId: 'repo-rate-limited',
      owner: 'test',
      repo: 'repo',
    };

    const result = await executeRepositorySync(target, {
      octokit: mockOctokit,
      storage: inMemoryStorage,
    });

    expect(result.status).toBe('PARTIAL');
    expect(result.coverageComplete).toBe(false);
    expect(result.notes.some((n) => n.includes('rate limit'))).toBe(true);

    const state = inMemoryStorage.syncStates.get('repo-rate-limited');
    expect(state.status).toBe('PARTIAL');
    expect(state.errorSummary).toContain('rate limit');
  });

  it('handles fatal errors by recording FAILED state and rethrowing for BullMQ retry', async () => {
    const mockOctokit = createMockOctokit({ simulateFatalError: true });
    const target = {
      repositoryId: 'repo-fatal-fail',
      owner: 'test',
      repo: 'repo',
    };

    await expect(
      executeRepositorySync(target, {
        octokit: mockOctokit,
        storage: inMemoryStorage,
      })
    ).rejects.toThrow('Fatal database connection');

    const state = inMemoryStorage.syncStates.get('repo-fatal-fail');
    expect(state.status).toBe('FAILED');
    expect(state.errorSummary).toContain('Fatal database connection');
  });

  it('runs through processSyncJob with BullMQ job updateProgress integration', async () => {
    const mockOctokit = createMockOctokit();
    const progressList: number[] = [];

    const mockJob = {
      id: 'job-123',
      data: {
        repositoryId: 'repo-job-1',
        owner: 'test',
        repo: 'repo',
        triggeredBy: 'tester',
      },
      updateProgress: async (p: number) => {
        progressList.push(p);
      },
    } as unknown as Job<RepositorySyncJobData, any>;

    const result = await processSyncJob(mockJob, {
      octokit: mockOctokit,
      storage: inMemoryStorage,
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.recordsImported).toBe(2); // 1 issue + 1 PR
    expect(progressList).toContain(100);
  });
});
