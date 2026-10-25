import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { MockTokenVerifier } from '../src/auth/tokenVerifier.js';
import { MockGitHubService } from '../src/github/mockGitHubService.js';
import { InMemoryRepositoryStore } from '../src/db/repositoryStore.js';
import type { ApiResponse, InvestigationRecord } from '@codeforensics/shared';

describe('Phase 8: Saved Investigations & Persistent Forensic Records', () => {
  const config = loadConfig();
  let mockTokenVerifier: MockTokenVerifier;
  let mockGitHubService: MockGitHubService;
  let repoStore: InMemoryRepositoryStore;
  let app: ReturnType<typeof buildApp>;

  const alice = {
    uid: 'user-alice-investigator',
    email: 'alice@codeforensics.dev',
    displayName: 'Alice Lead Investigator',
  };

  const bob = {
    uid: 'user-bob-unauthorized',
    email: 'bob@codeforensics.dev',
    displayName: 'Bob External',
  };

  let repoId: string;

  beforeEach(async () => {
    mockTokenVerifier = new MockTokenVerifier();
    mockTokenVerifier.registerToken('alice-token', alice);
    mockTokenVerifier.registerToken('bob-token', bob);

    mockGitHubService = new MockGitHubService();
    repoStore = new InMemoryRepositoryStore();

    app = buildApp(config, {
      tokenVerifier: mockTokenVerifier,
      githubService: mockGitHubService,
      repositoryStore: repoStore,
    });

    const repo = await repoStore.upsertRepository({
      githubRepoId: 54321,
      owner: 'facebook',
      name: 'react',
      fullName: 'facebook/react',
      defaultBranch: 'main',
      isPrivate: false,
      htmlUrl: 'https://github.com/facebook/react',
      description: 'The library for web and native user interfaces',
    });
    repoId = repo.id;
  });

  describe('Investigation Lifecycle CRUD', () => {
    it('creates a structured investigation with hypotheses, evidence items, and uncertainty notes', async () => {
      const payload = {
        repositoryId: repoId,
        question: 'Did PR #29012 fully resolve the concurrent tearing issue reported in #28941?',
        scope: 'React 19 RC • packages/react/src/ReactHooks.js • commit b84f291',
        status: 'in_progress',
        hypotheses: [
          'H1: PR #29012 only addressed single-transition tearing, leaving nested transitions vulnerable.',
          'H2: The issue was superseded by lane scheduler rewrite in commit 8a129f.',
        ],
        observations: [
          'Observed commit b84f291 introduces snapshotting logic inside useDeferredValue.',
        ],
        findings: [
          'Snapshotting transition lanes prevents primary lane tearing but does not synchronize child fiber roots.',
        ],
        limitations: [
          'Without end-to-end regression fixture in CI, resolution remains inconclusive.',
        ],
        evidenceItems: [
          {
            id: 'ev-1',
            type: 'pull_request',
            identifier: '#29012',
            title: 'Fix tearing in useDeferredValue by snapshotting transition lanes',
            url: 'https://github.com/facebook/react/pull/29012',
            category: 'FACT',
            confidence: 'HIGH',
            summary: 'Merged commit b84f291 with snapshot implementation.',
            addedAt: '2024-05-16T12:00:00Z',
          },
        ],
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/investigations',
        headers: { authorization: 'Bearer alice-token' },
        payload,
      });

      expect(res.statusCode).toBe(201);
      const body = res.json() as ApiResponse<InvestigationRecord>;
      expect(body.success).toBe(true);
      expect(body.data?.id).toBeDefined();
      expect(body.data?.userId).toBe(alice.uid);
      expect(body.data?.question).toBe(payload.question);
      expect(body.data?.hypotheses.length).toBe(2);
      expect(body.data?.evidenceItems.length).toBe(1);
      expect(body.data?.evidenceItems[0]?.identifier).toBe('#29012');
    });

    it('lists user investigations with repository and status filtering', async () => {
      // Create two investigations for Alice
      await repoStore.createInvestigation(alice.uid, {
        repositoryId: repoId,
        question: 'Question 1: Active investigation',
        scope: 'Scope 1',
        status: 'in_progress',
      });
      await repoStore.createInvestigation(alice.uid, {
        repositoryId: repoId,
        question: 'Question 2: Concluded investigation',
        scope: 'Scope 2',
        status: 'resolved',
      });

      // Filter by status=resolved
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/investigations?repositoryId=${repoId}&status=resolved`,
        headers: { authorization: 'Bearer alice-token' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as ApiResponse<InvestigationRecord[]>;
      expect(body.success).toBe(true);
      expect(body.data?.length).toBe(1);
      expect(body.data?.[0]?.question).toContain('Question 2');
    });

    it('retrieves and updates an investigation detail record', async () => {
      const created = await repoStore.createInvestigation(alice.uid, {
        repositoryId: repoId,
        question: 'Initial question',
        scope: 'Initial scope',
        status: 'open',
      });

      // GET by ID
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/investigations/${created.id}`,
        headers: { authorization: 'Bearer alice-token' },
      });
      expect(getRes.statusCode).toBe(200);

      // PATCH update
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/investigations/${created.id}`,
        headers: { authorization: 'Bearer alice-token' },
        payload: {
          status: 'resolved',
          findings: ['Confirmed fix via regression test in #29050'],
        },
      });

      expect(updateRes.statusCode).toBe(200);
      const updateBody = updateRes.json() as ApiResponse<InvestigationRecord>;
      expect(updateBody.data?.status).toBe('resolved');
      expect(updateBody.data?.findings[0]).toContain('Confirmed fix');
    });

    it('deletes an investigation record with confirmation', async () => {
      const created = await repoStore.createInvestigation(alice.uid, {
        repositoryId: repoId,
        question: 'To be deleted',
        scope: 'Temporary scope',
      });

      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/investigations/${created.id}`,
        headers: { authorization: 'Bearer alice-token' },
      });

      expect(delRes.statusCode).toBe(200);
      const delBody = delRes.json() as ApiResponse<{ id: string; deleted: boolean }>;
      expect(delBody.data?.deleted).toBe(true);

      // Verify no longer accessible
      const verifyRes = await app.inject({
        method: 'GET',
        url: `/api/v1/investigations/${created.id}`,
        headers: { authorization: 'Bearer alice-token' },
      });
      expect(verifyRes.statusCode).toBe(404);
    });
  });

  describe('Authorization & Cross-User Security', () => {
    it('denies access when User B attempts to view User A investigation', async () => {
      const created = await repoStore.createInvestigation(alice.uid, {
        repositoryId: repoId,
        question: 'Alice Confidential Investigation',
        scope: 'Internal Core',
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/investigations/${created.id}`,
        headers: { authorization: 'Bearer bob-token' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('denies access when User B attempts to update or delete User A investigation', async () => {
      const created = await repoStore.createInvestigation(alice.uid, {
        repositoryId: repoId,
        question: 'Alice Protected Investigation',
        scope: 'Internal Core',
      });

      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/investigations/${created.id}`,
        headers: { authorization: 'Bearer bob-token' },
        payload: { status: 'resolved' },
      });
      expect(patchRes.statusCode).toBe(404);

      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/investigations/${created.id}`,
        headers: { authorization: 'Bearer bob-token' },
      });
      expect(delRes.statusCode).toBe(404);
    });

    it('rejects client-supplied spoofed userId in creation payload with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/investigations',
        headers: { authorization: 'Bearer alice-token' },
        payload: {
          userId: 'spoofed-admin-uid',
          repositoryId: repoId,
          question: 'Spoof attempt question',
          scope: 'Security test',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json() as ApiResponse<never>;
      expect(body.error?.code).toBe('FORBIDDEN');
    });

    it('returns empty list when User B queries investigations when only Alice has records', async () => {
      await repoStore.createInvestigation(alice.uid, {
        repositoryId: repoId,
        question: 'Alice Only Question',
        scope: 'Scope',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/investigations',
        headers: { authorization: 'Bearer bob-token' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as ApiResponse<InvestigationRecord[]>;
      expect(body.data).toEqual([]);
    });
  });
});
