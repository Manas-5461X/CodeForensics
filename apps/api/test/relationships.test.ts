import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { MockTokenVerifier } from '../src/auth/tokenVerifier.js';
import { MockGitHubService } from '../src/github/mockGitHubService.js';
import { InMemoryRepositoryStore } from '../src/db/repositoryStore.js';
import { RelationshipEngine } from '../src/intelligence/relationshipEngine.js';
import type {
  ApiResponse,
  RelationshipInfo,
  ResolutionAssessment,
} from '@codeforensics/shared';

describe('Phase 6: Deterministic Relationship Intelligence & Resolution Assessment', () => {
  const config = loadConfig();
  let mockTokenVerifier: MockTokenVerifier;
  let mockGitHubService: MockGitHubService;
  let inMemoryRepoStore: InMemoryRepositoryStore;
  let app: ReturnType<typeof buildApp>;

  const testUser = {
    uid: 'user-phase6-forensics',
    email: 'investigator@codeforensics.dev',
    displayName: 'Lead Forensics Investigator',
  };

  let repoId: string;

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
      githubRepoId: 554433,
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
      recordsImported: 10,
      issuesCount: 4,
      prsCount: 4,
      lastSuccessfulSyncAt: new Date(),
    });

    // 1. Seed Issues
    await inMemoryRepoStore.upsertIssues([
      // Issue 101: Closed, targeted by merged PR 201 with explicit "Fixes #101"
      {
        repositoryId: repoId,
        githubIssueId: 101,
        number: 101,
        title: 'Memory leak in Suspense list during early unmount',
        body: 'Boundary aborts prematurely without clean up.',
        state: 'CLOSED',
        author: 'acdlite',
        labels: ['Bug'],
        htmlUrl: 'https://github.com/facebook/react/issues/101',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-05T12:00:00Z'),
        closedAt: new Date('2024-01-05T12:00:00Z'),
      },
      // Issue 102: Open, targeted by unmerged PR 202 with "Closes #102"
      {
        repositoryId: repoId,
        githubIssueId: 102,
        number: 102,
        title: 'useDeferredValue causes tearing in transitions',
        body: 'Tearing reproduced in concurrent mode.',
        state: 'OPEN',
        author: 'gaearon',
        labels: ['Bug'],
        htmlUrl: 'https://github.com/facebook/react/issues/102',
        createdAt: new Date('2024-01-02T10:00:00Z'),
        updatedAt: new Date('2024-01-06T12:00:00Z'),
        closedAt: null,
      },
      // Issue 103: Closed, but closed without ANY linked pull requests in repository
      {
        repositoryId: repoId,
        githubIssueId: 103,
        number: 103,
        title: 'Mysterious closure without commit link',
        body: 'Was closed directly via web UI by author.',
        state: 'CLOSED',
        author: 'bvaughn',
        labels: ['Investigate'],
        htmlUrl: 'https://github.com/facebook/react/issues/103',
        createdAt: new Date('2024-01-03T10:00:00Z'),
        updatedAt: new Date('2024-01-07T12:00:00Z'),
        closedAt: new Date('2024-01-07T12:00:00Z'),
      },
      // Issue 104: Open, zero PR references
      {
        repositoryId: repoId,
        githubIssueId: 104,
        number: 104,
        title: 'Feature request: Async Server Component streaming event hook',
        body: 'Proposing new lifecycle hook.',
        state: 'OPEN',
        author: 'sebmarkbage',
        labels: ['Enhancement'],
        htmlUrl: 'https://github.com/facebook/react/issues/104',
        createdAt: new Date('2024-01-04T10:00:00Z'),
        updatedAt: new Date('2024-01-08T12:00:00Z'),
        closedAt: null,
      },
    ]);

    // 2. Seed Pull Requests
    await inMemoryRepoStore.upsertPullRequests([
      // PR 201: Merged, fixes #101
      {
        repositoryId: repoId,
        githubPrId: 201,
        number: 201,
        title: 'Fix Suspense boundary leak on abort',
        body: 'This patch fixes #101 by resetting subscriber listener in abort signal.',
        state: 'CLOSED',
        isDraft: false,
        merged: true,
        mergedAt: new Date('2024-01-05T11:50:00Z'),
        author: 'acdlite',
        baseRef: 'main',
        headRef: 'fix-suspense-leak',
        htmlUrl: 'https://github.com/facebook/react/pull/201',
        createdAt: new Date('2024-01-04T10:00:00Z'),
        updatedAt: new Date('2024-01-05T12:00:00Z'),
      },
      // PR 202: Open, unmerged, closes #102
      {
        repositoryId: repoId,
        githubPrId: 202,
        number: 202,
        title: 'Draft fix for tearing in useDeferredValue',
        body: 'Initial attempt. Closes #102 once completed.',
        state: 'OPEN',
        isDraft: false,
        merged: false,
        mergedAt: null,
        author: 'sophiebits',
        baseRef: 'main',
        headRef: 'draft-tearing',
        htmlUrl: 'https://github.com/facebook/react/pull/202',
        createdAt: new Date('2024-01-05T10:00:00Z'),
        updatedAt: new Date('2024-01-06T12:00:00Z'),
      },
      // PR 203: Open, supersedes PR 202
      {
        repositoryId: repoId,
        githubPrId: 203,
        number: 203,
        title: 'Proper architecture fix for tearing',
        body: 'This PR supersedes #202 with an atomic snapshot approach.',
        state: 'OPEN',
        isDraft: false,
        merged: false,
        mergedAt: null,
        author: 'acdlite',
        baseRef: 'main',
        headRef: 'atomic-snapshot',
        htmlUrl: 'https://github.com/facebook/react/pull/203',
        createdAt: new Date('2024-01-06T10:00:00Z'),
        updatedAt: new Date('2024-01-07T12:00:00Z'),
      },
      // PR 204: Similar title to Issue 104, but ZERO reference/closing keywords
      {
        repositoryId: repoId,
        githubPrId: 204,
        number: 204,
        title: 'Async Server Component streaming event hook',
        body: 'Independent exploratory PR without any numeric citations or directives.',
        state: 'OPEN',
        isDraft: true,
        merged: false,
        mergedAt: null,
        author: 'random-contributor',
        baseRef: 'main',
        headRef: 'experimental-hook',
        htmlUrl: 'https://github.com/facebook/react/pull/204',
        createdAt: new Date('2024-01-07T10:00:00Z'),
        updatedAt: new Date('2024-01-08T12:00:00Z'),
      },
    ]);
  });

  describe('Deterministic Engine Rules & Conservative Assessments', () => {
    it('detects HIGH-confidence FIXED_BY and ADDRESSES relationships for merged PR with explicit closing keyword', async () => {
      const rels = await inMemoryRepoStore.getRelationships(repoId, { itemNumber: 101 });
      expect(rels.length).toBeGreaterThanOrEqual(1);

      const fixedBy = rels.find((r) => r.relationshipType === 'FIXED_BY');
      expect(fixedBy).toBeDefined();
      expect(fixedBy?.sourceType).toBe('ISSUE');
      expect(fixedBy?.sourceNumber).toBe(101);
      expect(fixedBy?.targetType).toBe('PULL_REQUEST');
      expect(fixedBy?.targetNumber).toBe(201);
      expect(fixedBy?.confidence).toBe('HIGH');
      expect(fixedBy?.method).toBe('DETERMINISTIC_MERGED_CLOSING_KEYWORD');
      expect(fixedBy?.evidenceDetails?.references[0].keyword).toBe('fixes');

      const addresses = rels.find((r) => r.relationshipType === 'ADDRESSES');
      expect(addresses).toBeDefined();
      expect(addresses?.sourceNumber).toBe(201);
      expect(addresses?.confidence).toBe('HIGH');
    });

    it('assigns MEDIUM confidence when PR is unmerged even with closing keyword', async () => {
      const rels = await inMemoryRepoStore.getRelationships(repoId, { itemNumber: 102 });
      const addresses = rels.find((r) => r.relationshipType === 'ADDRESSES' && r.sourceNumber === 202);

      expect(addresses).toBeDefined();
      expect(addresses?.confidence).toBe('MEDIUM');
      expect(addresses?.evidenceDetails?.ruleId).toBe('RULE_UNMERGED_CLOSING_DIRECTIVE');
      expect(addresses?.evidenceDetails?.confidenceRationale).toContain('unmerged');
    });

    it('detects SUPERSEDES relationship between pull requests', async () => {
      const rels = await inMemoryRepoStore.getRelationships(repoId, { itemNumber: 203 });
      const supersedes = rels.find((r) => r.relationshipType === 'SUPERSEDES');

      expect(supersedes).toBeDefined();
      expect(supersedes?.sourceNumber).toBe(203);
      expect(supersedes?.targetNumber).toBe(202);
      expect(supersedes?.confidence).toBe('HIGH');
      expect(supersedes?.evidenceDetails?.references[0].keyword).toBe('supersedes');
    });

    it('NEVER creates a relationship merely due to shared keyword or similar title', async () => {
      // Issue 104 and PR 204 share identical titles, but no explicit citation
      const rels = await inMemoryRepoStore.getRelationships(repoId, { itemNumber: 104 });
      const falseLink = rels.find((r) => r.targetNumber === 204 || r.sourceNumber === 204);

      expect(falseLink).toBeUndefined();
    });

    it('produces UNKNOWN resolution for closed issue without linked PR in ingested data', async () => {
      const assessment = await inMemoryRepoStore.assessResolution(repoId, 103);
      expect(assessment).toBeDefined();
      expect(assessment?.status).toBe('UNKNOWN');
      expect(assessment?.confidence).toBe('NOT_ASSESSED');
      expect(assessment?.coverageNotes.length).toBeGreaterThan(0);
      expect(assessment?.rationale).toContain('no referencing pull request');
    });

    it('assesses RESOLVED for closed issue with merged fixing PR', async () => {
      const assessment = await inMemoryRepoStore.assessResolution(repoId, 101);
      expect(assessment).toBeDefined();
      expect(assessment?.status).toBe('RESOLVED');
      expect(assessment?.confidence).toBe('HIGH');
      expect(assessment?.evidence.length).toBeGreaterThan(0);
    });

    it('assesses UNRESOLVED for open issue targeted by unmerged PR', async () => {
      const assessment = await inMemoryRepoStore.assessResolution(repoId, 102);
      expect(assessment).toBeDefined();
      expect(assessment?.status).toBe('UNRESOLVED');
    });

    it('is idempotent and prevents duplicate relationships on repeated computation', async () => {
      const run1 = await inMemoryRepoStore.getRelationships(repoId);
      const run2 = await inMemoryRepoStore.getRelationships(repoId);

      expect(run1.length).toBe(run2.length);
      const ids = run2.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('lowers confidence or notes coverage limitations when repository sync is incomplete', () => {
      const issue = {
        id: '101',
        number: 101,
        title: 'Bug',
        body: 'Body',
        state: 'CLOSED',
        closedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const partialSyncState = { status: 'PARTIAL' };
      const assessment = RelationshipEngine.assessIssueResolution(issue, [], partialSyncState);

      expect(assessment.status).toBe('UNKNOWN');
      expect(assessment.coverageNotes.some((n) => n.includes('incomplete'))).toBe(true);
    });
  });

  describe('API Endpoints: /relationships and /resolution', () => {
    it('GET /repositories/:owner/:repo/relationships returns detected relationships', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/relationships',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as ApiResponse<RelationshipInfo[]>;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data?.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /repositories/:owner/:repo/relationships filters by itemNumber and type', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/relationships?itemNumber=101&type=FIXED_BY',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as ApiResponse<RelationshipInfo[]>;
      expect(body.success).toBe(true);
      expect(body.data?.every((r) => r.relationshipType === 'FIXED_BY')).toBe(true);
      expect(body.data?.every((r) => r.sourceNumber === 101 || r.targetNumber === 101)).toBe(true);
    });

    it('GET /repositories/:owner/:repo/items/:number/relationships returns relationships for specific item', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items/101/relationships',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as ApiResponse<RelationshipInfo[]>;
      expect(body.success).toBe(true);
      expect(body.data?.length).toBeGreaterThanOrEqual(1);
      expect(body.data?.[0].sourceNumber === 101 || body.data?.[0].targetNumber === 101).toBe(true);
    });

    it('GET /repositories/:owner/:repo/items/:number/resolution returns resolution assessment', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items/101/resolution',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as ApiResponse<ResolutionAssessment>;
      expect(body.success).toBe(true);
      expect(body.data?.status).toBe('RESOLVED');
      expect(body.data?.confidence).toBe('HIGH');
      expect(body.data?.evidence.length).toBeGreaterThan(0);
    });

    it('rejects resolution assessment on pull requests with 400 NOT_AN_ISSUE', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items/201/resolution',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_AN_ISSUE');
    });

    it('requires authentication for relationship and resolution routes', async () => {
      const unauthRels = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/relationships',
      });
      expect(unauthRels.statusCode).toBe(401);

      const unauthRes = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items/101/resolution',
      });
      expect(unauthRes.statusCode).toBe(401);
    });

    it('returns 404 for nonexistent repository or item', async () => {
      const resNotFound = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/items/99999/relationships',
        headers: { authorization: 'Bearer valid-token' },
      });
      expect(resNotFound.statusCode).toBe(404);
    });
  });
});
