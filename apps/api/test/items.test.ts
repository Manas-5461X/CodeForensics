import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { MockTokenVerifier } from '../src/auth/tokenVerifier.js';
import { MockGitHubService } from '../src/github/mockGitHubService.js';
import { InMemoryRepositoryStore } from '../src/db/repositoryStore.js';
import type {
  ApiResponse,
  WorkItemSummary,
  WorkItemDetail,
  PaginatedResult,
} from '@codeforensics/shared';

describe('Phase 5: Issue & PR Explorer API', () => {
  const config = loadConfig();
  let mockTokenVerifier: MockTokenVerifier;
  let mockGitHubService: MockGitHubService;
  let inMemoryRepoStore: InMemoryRepositoryStore;
  let app: ReturnType<typeof buildApp>;

  const testUser = {
    uid: 'user-phase5-tester',
    email: 'tester@codeforensics.dev',
    displayName: 'Forensics Investigator',
  };

  beforeEach(async () => {
    mockTokenVerifier = new MockTokenVerifier();
    mockTokenVerifier.registerToken('valid-token', testUser);

    mockGitHubService = new MockGitHubService();
    inMemoryRepoStore = new InMemoryRepositoryStore();

    app = buildApp(config, {
      tokenVerifier: mockTokenVerifier,
      githubService: mockGitHubService,
      repositoryStore: inMemoryRepoStore,
    });

    // Seed test repository
    const repo = await inMemoryRepoStore.upsertRepository({
      githubRepoId: 998877,
      owner: 'facebook',
      name: 'react',
      fullName: 'facebook/react',
      defaultBranch: 'main',
      isPrivate: false,
      htmlUrl: 'https://github.com/facebook/react',
      description: 'The library for web and native user interfaces.',
      installationId: '1001',
    });

    // Seed test issues
    await inMemoryRepoStore.upsertIssues([
      {
        repositoryId: repo.id,
        githubIssueId: 101,
        number: 101,
        title: 'Memory leak in Suspense list during early unmount',
        body: 'Investigating potential leak when suspense boundary aborts.',
        state: 'CLOSED',
        author: 'acdlite',
        labels: ['Component: Suspense', 'Type: Bug'],
        htmlUrl: 'https://github.com/facebook/react/issues/101',
        createdAt: new Date('2024-01-10T10:00:00Z'),
        updatedAt: new Date('2024-01-15T12:00:00Z'),
        closedAt: new Date('2024-01-15T12:00:00Z'),
      },
      {
        repositoryId: repo.id,
        githubIssueId: 102,
        number: 102,
        title: 'useDeferredValue causes tearing in concurrent root transitions',
        body: 'Reproduction demo shows tearing under concurrent rendering stress.',
        state: 'OPEN',
        author: 'gaearon',
        labels: ['Component: Concurrent', 'Resolution: Uncertain'],
        htmlUrl: 'https://github.com/facebook/react/issues/102',
        createdAt: new Date('2024-02-01T14:00:00Z'),
        updatedAt: new Date('2024-02-05T16:00:00Z'),
        closedAt: null,
      },
      {
        repositoryId: repo.id,
        githubIssueId: 103,
        number: 103,
        title: 'SSR streaming hydration mismatch with inline scripts',
        body: 'Hydration mismatch when inline script runs before boundary completes.',
        state: 'CLOSED',
        author: 'sebmarkbage',
        labels: ['Component: Suspense'],
        htmlUrl: 'https://github.com/facebook/react/issues/103',
        createdAt: new Date('2024-01-08T09:00:00Z'),
        updatedAt: new Date('2024-01-09T10:00:00Z'),
        closedAt: new Date('2024-01-09T10:00:00Z'),
      },
    ]);

    // Seed test pull requests
    await inMemoryRepoStore.upsertPullRequests([
      {
        repositoryId: repo.id,
        githubPrId: 201,
        number: 201,
        title: 'Fix: clean up Suspense subscriptions on unmount',
        body: 'Disposes subscriptions and prevents memory leak on unmount.',
        state: 'MERGED',
        author: 'sebmarkbage',
        htmlUrl: 'https://github.com/facebook/react/pull/201',
        mergedAt: new Date('2024-01-14T18:00:00Z'),
        isDraft: false,
        baseRef: 'main',
        headRef: 'fix-suspense-leak',
        createdAt: new Date('2024-01-12T08:00:00Z'),
        updatedAt: new Date('2024-01-14T18:00:00Z'),
        closedAt: new Date('2024-01-14T18:00:00Z'),
      },
      {
        repositoryId: repo.id,
        githubPrId: 202,
        number: 202,
        title: 'Draft: Concurrent root scheduling improvements',
        body: 'WIP experiment to throttle deferred values.',
        state: 'OPEN',
        author: 'sophiebits',
        htmlUrl: 'https://github.com/facebook/react/pull/202',
        mergedAt: null,
        isDraft: true,
        baseRef: 'main',
        headRef: 'draft-concurrent-sched',
        createdAt: new Date('2024-02-10T11:00:00Z'),
        updatedAt: new Date('2024-02-12T09:00:00Z'),
        closedAt: null,
      },
    ]);
  });

  describe('Authorization and Validation', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 404 for an untracked repository', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/untracked/repo/items',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('rejects invalid query parameters with 400', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items?type=invalid_type',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('BAD_REQUEST');
    });
  });

  describe('List Work Items (Pagination, Filtering, Sorting, Search)', () => {
    it('returns all unified items with pagination metadata', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items?page=1&limit=10',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<PaginatedResult<WorkItemSummary>>;
      expect(body.success).toBe(true);
      expect(body.data?.total).toBe(5);
      expect(body.data?.page).toBe(1);
      expect(body.data?.items.length).toBe(5);
      expect(body.meta.coverage?.isComplete).toBe(false); // No completed sync recorded yet
      expect(body.meta.coverage?.warnings?.[0]).toContain('Repository has not been synchronized yet');
    });

    it('filters strictly by type=issue', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items?type=issue',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<PaginatedResult<WorkItemSummary>>;
      expect(body.data?.total).toBe(3);
      expect(body.data?.items.every((item) => item.type === 'issue')).toBe(true);
    });

    it('filters strictly by type=pull_request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items?type=pull_request',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<PaginatedResult<WorkItemSummary>>;
      expect(body.data?.total).toBe(2);
      expect(body.data?.items.every((item) => item.type === 'pull_request')).toBe(true);
    });

    it('filters strictly by state=open', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items?state=open',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<PaginatedResult<WorkItemSummary>>;
      expect(body.data?.total).toBe(2);
      expect(body.data?.items.map((i) => i.number)).toEqual(expect.arrayContaining([102, 202]));
    });

    it('filters strictly by state=closed (including merged PRs)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items?state=closed',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<PaginatedResult<WorkItemSummary>>;
      expect(body.data?.total).toBe(3);
      expect(body.data?.items.map((i) => i.number)).toEqual(expect.arrayContaining([101, 103, 201]));
    });

    it('searches by keyword matching title or body', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items?search=leak',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<PaginatedResult<WorkItemSummary>>;
      expect(body.data?.total).toBe(2);
      expect(body.data?.items.map((i) => i.number)).toEqual(expect.arrayContaining([101, 201]));
    });

    it('searches by item number', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items?search=102',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<PaginatedResult<WorkItemSummary>>;
      expect(body.data?.total).toBe(1);
      expect(body.data?.items[0].number).toBe(102);
    });

    it('filters by label', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items?label=Component%3A%20Suspense',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<PaginatedResult<WorkItemSummary>>;
      expect(body.data?.total).toBe(2);
      expect(body.data?.items.map((i) => i.number)).toEqual(expect.arrayContaining([101, 103]));
    });

    it('sorts by creation date descending by default', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items?sort=created_desc',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<PaginatedResult<WorkItemSummary>>;
      // Items created order: 202 (Feb 10), 102 (Feb 1), 201 (Jan 12), 101 (Jan 10), 103 (Jan 8)
      expect(body.data?.items.map((i) => i.number)).toEqual([202, 102, 201, 101, 103]);
    });

    it('paginates deterministically', async () => {
      const page1Res = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items?page=1&limit=2&sort=created_desc',
        headers: { authorization: 'Bearer valid-token' },
      });
      const page1 = JSON.parse(page1Res.body) as ApiResponse<PaginatedResult<WorkItemSummary>>;
      expect(page1.data?.items.length).toBe(2);
      expect(page1.data?.items.map((i) => i.number)).toEqual([202, 102]);

      const page2Res = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items?page=2&limit=2&sort=created_desc',
        headers: { authorization: 'Bearer valid-token' },
      });
      const page2 = JSON.parse(page2Res.body) as ApiResponse<PaginatedResult<WorkItemSummary>>;
      expect(page2.data?.items.length).toBe(2);
      expect(page2.data?.items.map((i) => i.number)).toEqual([201, 101]);
    });
  });

  describe('Work Item Detail View', () => {
    it('returns detailed metadata for an issue', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items/101',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<WorkItemDetail>;
      expect(body.success).toBe(true);
      expect(body.data?.number).toBe(101);
      expect(body.data?.type).toBe('issue');
      expect(body.data?.author).toBe('acdlite');
      expect(body.data?.state).toBe('closed');
      expect(body.data?.body).toContain('leak');
      expect(body.data?.labels).toEqual(['Component: Suspense', 'Type: Bug']);
      // Honest timeline status
      expect(body.data?.timelineAvailable).toBe(false);
      expect(body.data?.timelineNotes).toBeTruthy();
    });

    it('returns detailed metadata for a pull request including merge and branch info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items/201',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<WorkItemDetail>;
      expect(body.success).toBe(true);
      expect(body.data?.number).toBe(201);
      expect(body.data?.type).toBe('pull_request');
      expect(body.data?.state).toBe('merged');
      expect(body.data?.isDraft).toBe(false);
      expect(body.data?.baseRef).toBe('main');
      expect(body.data?.headRef).toBe('fix-suspense-leak');
      expect(body.data?.mergedAt).toBeTruthy();
      // Honest diff status
      expect(body.data?.diffAvailable).toBe(false);
      expect(body.data?.diffNotes).toBeTruthy();
    });

    it('returns 404 for non-existent item number', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items/999999',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('ITEM_NOT_FOUND');
    });

    it('returns 400 for non-numeric item number', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items/not-a-number',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('BAD_REQUEST');
    });

    it('handles timeline sub-endpoint honestly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items/101/timeline',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<{
        available: boolean;
        notes: string;
        events: unknown[];
      }>;
      expect(body.success).toBe(true);
      expect(body.data?.available).toBe(false);
      expect(body.data?.events).toEqual([]);
    });

    it('handles diff sub-endpoint honestly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items/201/diff',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<{
        available: boolean;
        notes: string;
        diff: unknown;
      }>;
      expect(body.success).toBe(true);
      expect(body.data?.available).toBe(false);
    });
  });
});
