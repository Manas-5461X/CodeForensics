import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { MockTokenVerifier } from '../src/auth/tokenVerifier.js';
import { MockGitHubService } from '../src/github/mockGitHubService.js';
import { InMemoryRepositoryStore } from '../src/db/repositoryStore.js';
import { ContributionEngine } from '../src/intelligence/contributionEngine.js';
import type {
  ApiResponse,
  ContributionAnalysisResult,
  ContributorRecommendation,
} from '@codeforensics/shared';

describe('Phase 7: Contribution Finder & Contributor Intelligence Engine', () => {
  const config = loadConfig();
  let mockTokenVerifier: MockTokenVerifier;
  let mockGitHubService: MockGitHubService;
  let inMemoryRepoStore: InMemoryRepositoryStore;
  let app: ReturnType<typeof buildApp>;

  const testUser = {
    uid: 'user-phase7-contributor',
    email: 'contributor-lead@codeforensics.dev',
    displayName: 'Contributor Discovery Lead',
  };

  let repoId: string;
  const fixedNow = new Date('2024-06-01T12:00:00Z');

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
    repoId = repo.id;

    await inMemoryRepoStore.updateSyncState(repoId, {
      status: 'COMPLETED',
      recordsImported: 20,
      issuesCount: 5,
      prsCount: 6,
      lastSuccessfulSyncAt: new Date('2024-05-30T10:00:00Z'),
    });
  });

  it('ranks contributors with direct fix links highest with explainable signals', async () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // Issue 101 in devtools subsystem
    await inMemoryRepoStore.upsertIssues([
      {
        githubIssueId: 101,
        repositoryId: repoId,
        number: 101,
        title: '[devtools] Profiler timeline drops commits',
        body: 'Fails under high load in packages/react-devtools.',
        state: 'open',
        author: 'reporter_dan',
        labels: ['Component: Developer Tools'],
        htmlUrl: 'https://github.com/facebook/react/issues/101',
        closedAt: null,
        createdAt: tenDaysAgo,
        updatedAt: fiveDaysAgo,
      },
    ]);

    // PR 201 by 'brian_devtools' directly addresses/fixes issue 101
    // PR 202 by 'alice_specialist' has merged PRs in devtools
    // PR 203 by 'charlie_general' has PR in unrelated compiler subsystem
    await inMemoryRepoStore.upsertPullRequests([
      {
        githubPrId: 201,
        repositoryId: repoId,
        number: 201,
        title: '[devtools] Fix dropped commits on high load',
        body: 'Fixes #101 by buffering commits.',
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: twoDaysAgo,
        author: 'brian_devtools',
        baseRef: 'main',
        headRef: 'fix-101',
        htmlUrl: 'https://github.com/facebook/react/pull/201',
        createdAt: fiveDaysAgo,
        updatedAt: twoDaysAgo,
      },
      {
        githubPrId: 202,
        repositoryId: repoId,
        number: 202,
        title: '[devtools] Enhance flamegraph zooming',
        body: 'Improves zooming responsiveness.',
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: fiveDaysAgo,
        author: 'alice_specialist',
        baseRef: 'main',
        headRef: 'flamegraph-zoom',
        htmlUrl: 'https://github.com/facebook/react/pull/202',
        createdAt: tenDaysAgo,
        updatedAt: fiveDaysAgo,
      },
      {
        githubPrId: 203,
        repositoryId: repoId,
        number: 203,
        title: '[compiler] Constant folding pass',
        body: 'Optimizes constant expressions in compiler.',
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: fiveDaysAgo,
        author: 'charlie_general',
        baseRef: 'main',
        headRef: 'compiler-constants',
        htmlUrl: 'https://github.com/facebook/react/pull/203',
        createdAt: tenDaysAgo,
        updatedAt: fiveDaysAgo,
      },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/repositories/facebook/react/contributors/recommendations?itemNumber=101',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<ContributionAnalysisResult> = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    const result = body.data!;
    expect(result.targetItem?.number).toBe(101);
    expect(result.subsystem).toBe('devtools');

    // brian_devtools should be #1 because he directly fixed issue #101
    const topRec = result.recommendations[0];
    expect(topRec.login).toBe('brian_devtools');
    expect(topRec.rank).toBe(1);
    expect(topRec.normalizedScore).toBeGreaterThan(60);

    const fixSignal = topRec.signals.find((s) => s.type === 'DIRECT_FIX');
    expect(fixSignal).toBeDefined();
    expect(fixSignal?.weight).toBe(35);
    expect(fixSignal?.referenceNumbers).toContain(201);

    // alice_specialist should be ranked next due to subsystem PR
    const aliceRec = result.recommendations.find((r) => r.login === 'alice_specialist');
    expect(aliceRec).toBeDefined();
    expect(aliceRec?.signals.some((s) => s.type === 'SUBSYSTEM_PR')).toBe(true);

    // charlie_general has no devtools work, so should have significantly lower score or incidental rank
    const charlieRec = result.recommendations.find((r) => r.login === 'charlie_general');
    if (charlieRec) {
      expect(charlieRec.normalizedScore).toBeLessThan(topRec.normalizedScore);
    }
  });

  it('normalizes volume with logarithmic dampening so raw count does not dominate', async () => {
    // Contributor A ('specialist') has 2 merged PRs in target subsystem 'reconciler' (recent)
    // Contributor B ('volume_bot_author') has 20 merged PRs in other areas ('dom') but only 1 in 'reconciler'
    const issues = [
      {
        id: '1',
        number: 301,
        title: '[reconciler] Suspense boundary early abort bug',
        body: 'packages/react-reconciler unmount bug',
        state: 'open',
        author: 'user_x',
        closedAt: null,
        createdAt: new Date('2024-05-01'),
        updatedAt: new Date('2024-05-01'),
      },
    ];

    const pullRequests = [
      {
        id: 'pr-1',
        number: 401,
        title: '[reconciler] Fix suspense unmount abort',
        body: null,
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: new Date('2024-05-10'),
        author: 'specialist',
        baseRef: 'main',
        headRef: 'fix-suspense',
        createdAt: new Date('2024-05-01'),
        updatedAt: new Date('2024-05-10'),
      },
      {
        id: 'pr-2',
        number: 402,
        title: '[reconciler] Fiber queue cleanup',
        body: null,
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: new Date('2024-05-15'),
        author: 'specialist',
        baseRef: 'main',
        headRef: 'fiber-queue',
        createdAt: new Date('2024-05-02'),
        updatedAt: new Date('2024-05-15'),
      },
      {
        id: 'pr-3',
        number: 403,
        title: '[reconciler] Minor reconciler rename',
        body: null,
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: new Date('2024-05-05'),
        author: 'volume_author',
        baseRef: 'main',
        headRef: 'rename',
        createdAt: new Date('2024-05-01'),
        updatedAt: new Date('2024-05-05'),
      },
    ];

    // Add 15 merged PRs in [dom] for volume_author
    for (let i = 1; i <= 15; i++) {
      pullRequests.push({
        id: `pr-dom-${i}`,
        number: 500 + i,
        title: `[dom] Trivial DOM test fixture ${i}`,
        body: null,
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: new Date('2024-05-01'),
        author: 'volume_author',
        baseRef: 'main',
        headRef: `dom-${i}`,
        createdAt: new Date('2024-04-01'),
        updatedAt: new Date('2024-05-01'),
      });
    }

    const result = ContributionEngine.rankContributors(
      'repo-1',
      { itemNumber: 301, now: fixedNow },
      issues,
      pullRequests,
      [],
      null
    );

    const specialist = result.recommendations.find((r) => r.login === 'specialist');
    const volumeAuthor = result.recommendations.find((r) => r.login === 'volume_author');

    expect(specialist).toBeDefined();
    expect(volumeAuthor).toBeDefined();

    // Specialist should rank higher than volume_author for reconciler issue despite 15 extra DOM PRs
    expect(specialist!.rank).toBeLessThan(volumeAuthor!.rank);
    expect(specialist!.normalizedScore).toBeGreaterThanOrEqual(volumeAuthor!.normalizedScore);
  });

  it('guarantees deterministic tie-breaking by login alphabetical order', () => {
    // Two contributors with identical signals and identical activity dates
    const issues = [
      {
        id: '1',
        number: 601,
        title: '[compiler] Compiler optimization issue',
        body: null,
        state: 'open',
        author: 'reporter',
        closedAt: null,
        createdAt: new Date('2024-05-01'),
        updatedAt: new Date('2024-05-01'),
      },
    ];

    const pullRequests = [
      {
        id: 'p-1',
        number: 701,
        title: '[compiler] Optimize AST node',
        body: null,
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: new Date('2024-05-10T12:00:00Z'),
        author: 'zack_developer',
        baseRef: 'main',
        headRef: 'zack-ast',
        createdAt: new Date('2024-05-01'),
        updatedAt: new Date('2024-05-10T12:00:00Z'),
      },
      {
        id: 'p-2',
        number: 702,
        title: '[compiler] Optimize AST visitor',
        body: null,
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: new Date('2024-05-10T12:00:00Z'),
        author: 'adam_developer',
        baseRef: 'main',
        headRef: 'adam-ast',
        createdAt: new Date('2024-05-01'),
        updatedAt: new Date('2024-05-10T12:00:00Z'),
      },
    ];

    const result = ContributionEngine.rankContributors(
      'repo-tie',
      { itemNumber: 601, now: fixedNow },
      issues,
      pullRequests,
      [],
      null
    );

    expect(result.recommendations.length).toBeGreaterThanOrEqual(2);
    // adam_developer should precede zack_developer alphabetically
    expect(result.recommendations[0].login).toBe('adam_developer');
    expect(result.recommendations[0].rank).toBe(1);
    expect(result.recommendations[1].login).toBe('zack_developer');
    expect(result.recommendations[1].rank).toBe(2);
  });

  it('detects concentrated ownership risk when one contributor dominates a subsystem', () => {
    // Subsystem 'scheduler' has 4 PRs, 3 authored by 'lone_maintainer' (75% concentration)
    const pullRequests = [
      {
        id: 'p-1',
        number: 801,
        title: '[scheduler] Priority queue fix',
        body: null,
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: new Date('2024-05-10'),
        author: 'lone_maintainer',
        baseRef: 'main',
        headRef: 'pq-fix',
        createdAt: new Date('2024-05-01'),
        updatedAt: new Date('2024-05-10'),
      },
      {
        id: 'p-2',
        number: 802,
        title: '[scheduler] Yield interval tweak',
        body: null,
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: new Date('2024-05-12'),
        author: 'lone_maintainer',
        baseRef: 'main',
        headRef: 'yield-tweak',
        createdAt: new Date('2024-05-02'),
        updatedAt: new Date('2024-05-12'),
      },
      {
        id: 'p-3',
        number: 803,
        title: '[scheduler] PostMessage fallback',
        body: null,
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: new Date('2024-05-14'),
        author: 'lone_maintainer',
        baseRef: 'main',
        headRef: 'postmessage',
        createdAt: new Date('2024-05-03'),
        updatedAt: new Date('2024-05-14'),
      },
      {
        id: 'p-4',
        number: 804,
        title: '[scheduler] Microtask queue test',
        body: null,
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: new Date('2024-05-15'),
        author: 'guest_helper',
        baseRef: 'main',
        headRef: 'microtask-test',
        createdAt: new Date('2024-05-04'),
        updatedAt: new Date('2024-05-15'),
      },
    ];

    const result = ContributionEngine.rankContributors(
      'repo-ownership',
      { subsystem: 'scheduler', now: fixedNow },
      [],
      pullRequests,
      [],
      null
    );

    const concentrationRisk = result.maintenanceRisks.find(
      (r) => r.riskType === 'CONCENTRATED_OWNERSHIP' && r.subsystem === 'scheduler'
    );
    expect(concentrationRisk).toBeDefined();
    expect(concentrationRisk?.dominantContributor).toBe('lone_maintainer');
    expect(concentrationRisk?.concentrationRatio).toBe(0.75);
    expect(concentrationRisk?.severity).toBe('HIGH');
  });

  it('detects stale maintenance risk when last subsystem activity is > 180 days old', () => {
    // Subsystem 'react-native' has merged PR from 200 days before fixedNow (fixedNow is 2024-06-01)
    const pullRequests = [
      {
        id: 'p-stale',
        number: 901,
        title: '[native] Hermes integration bridge',
        body: null,
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: new Date('2023-10-01T12:00:00Z'), // ~244 days prior to 2024-06-01
        author: 'old_author',
        baseRef: 'main',
        headRef: 'hermes',
        createdAt: new Date('2023-09-15T12:00:00Z'),
        updatedAt: new Date('2023-10-01T12:00:00Z'),
      },
    ];

    const result = ContributionEngine.rankContributors(
      'repo-stale',
      { subsystem: 'react-native', now: fixedNow },
      [],
      pullRequests,
      [],
      null
    );

    const staleRisk = result.maintenanceRisks.find(
      (r) => r.riskType === 'STALE_MAINTENANCE' && r.subsystem === 'react-native'
    );
    expect(staleRisk).toBeDefined();
    expect(staleRisk?.daysInactive).toBeGreaterThan(180);
  });

  it('detects incomplete synchronization coverage when sync state is PARTIAL', () => {
    const syncState = {
      id: 'sync-1',
      repositoryId: 'repo-partial',
      status: 'PARTIAL' as const,
      startedAt: new Date(),
      completedAt: null,
      lastSuccessfulSyncAt: null,
      recordsImported: 5,
      issuesCount: 3,
      prsCount: 2,
      errorSummary: 'Rate limit exceeded during pull requests pagination',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = ContributionEngine.rankContributors(
      'repo-partial',
      { now: fixedNow },
      [],
      [],
      [],
      syncState
    );

    const incompleteRisk = result.maintenanceRisks.find((r) => r.riskType === 'INCOMPLETE_HISTORY');
    expect(incompleteRisk).toBeDefined();
    expect(incompleteRisk?.severity).toBe('MEDIUM');
  });

  it('rejects unauthenticated requests to contributor endpoints with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/repositories/facebook/react/contributors/recommendations',
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for invalid query parameters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/repositories/facebook/react/contributors/recommendations?limit=-5',
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for unknown repository', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/repositories/nonexistent/repo/contributors/recommendations',
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('supports the work-item specific shortcut route /items/:number/contributors', async () => {
    await inMemoryRepoStore.upsertIssues([
      {
        githubIssueId: 28719,
        repositoryId: repoId,
        number: 28719,
        title: '[devtools] Timeline drops commits',
        body: 'Profiler issue',
        state: 'open',
        author: 'dan_abramov',
        labels: ['Component: Developer Tools'],
        htmlUrl: 'https://github.com/facebook/react/issues/28719',
        closedAt: null,
        createdAt: new Date('2024-05-01T10:00:00Z'),
        updatedAt: new Date('2024-05-02T10:00:00Z'),
      },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/repositories/facebook/react/items/28719/contributors',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<ContributionAnalysisResult> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.targetItem?.number).toBe(28719);
  });
});
