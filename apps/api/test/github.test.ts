import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { MockTokenVerifier } from '../src/auth/tokenVerifier.js';
import { MockGitHubService } from '../src/github/mockGitHubService.js';
import { InMemoryRepositoryStore } from '../src/db/repositoryStore.js';
import type { ApiResponse, GitHubInstallationInfo, RepositoryInfo, SyncTriggerResult } from '@codeforensics/shared';
import crypto from 'node:crypto';

describe('Phase 4: GitHub Integration & Repository Synchronization API', () => {
  const config = loadConfig();
  let mockTokenVerifier: MockTokenVerifier;
  let mockGitHubService: MockGitHubService;
  let inMemoryRepoStore: InMemoryRepositoryStore;
  let app: ReturnType<typeof buildApp>;

  const testUser = {
    uid: 'user-github-tester',
    email: 'tester@codeforensics.dev',
    displayName: 'Forensics Tester',
  };

  beforeEach(() => {
    mockTokenVerifier = new MockTokenVerifier();
    mockTokenVerifier.registerToken('valid-token', testUser);

    mockGitHubService = new MockGitHubService();
    inMemoryRepoStore = new InMemoryRepositoryStore();

    app = buildApp(config, {
      tokenVerifier: mockTokenVerifier,
      githubService: mockGitHubService,
      repositoryStore: inMemoryRepoStore,
    });
  });

  describe('1. Authentication & GitHub Installation Discovery', () => {
    it('rejects unauthenticated requests to list installations with 401', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/github/installations',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns authorized installations for authenticated users and persists them', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/github/installations',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<GitHubInstallationInfo[]>;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data?.length).toBeGreaterThan(0);
      expect(body.data?.[0].accountLogin).toBe('octocat-org');
      expect(body.data?.[0].installationId).toBe(1001);

      // Verify server persisted it in the repository store
      const persisted = await inMemoryRepoStore.findInstallation(1001);
      expect(persisted).not.toBeNull();
      expect(persisted?.accountLogin).toBe('octocat-org');
    });
  });

  describe('2. Installation Repository Discovery', () => {
    it('discovers repositories accessible through an authorized installation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/github/installations/1001/repositories',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<RepositoryInfo[]>;
      expect(body.success).toBe(true);
      expect(body.data?.length).toBe(2);
      expect(body.data?.map((r) => r.fullName)).toContain('octocat-org/test-repo');
      expect(body.data?.map((r) => r.fullName)).toContain('octocat-org/private-service');
    });

    it('rejects invalid or non-integer installation IDs with 400', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/github/installations/invalid-id/repositories',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('BAD_REQUEST');
    });

    it('handles non-existent or inaccessible installations gracefully with 502', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/github/installations/99999/repositories',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(502);
      const body = JSON.parse(response.body) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('GITHUB_ACCESS_DENIED');
    });
  });

  describe('3. Repository Selection & Server-Side Verification', () => {
    it('verifies access against GitHub before tracking and saving repository', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/repositories/select',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        payload: {
          owner: 'octocat-org',
          repo: 'test-repo',
          installationId: 1001,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<RepositoryInfo>;
      expect(body.success).toBe(true);
      expect(body.data?.fullName).toBe('octocat-org/test-repo');
      expect(body.data?.owner).toBe('octocat-org');
      expect(body.data?.name).toBe('test-repo');
      expect(body.data?.defaultBranch).toBe('main');

      // Verify repository is saved in database store
      const dbRepo = await inMemoryRepoStore.findRepository('octocat-org', 'test-repo');
      expect(dbRepo).not.toBeNull();
      expect(dbRepo?.fullName).toBe('octocat-org/test-repo');
      expect(dbRepo?.syncState?.status).toBe('IDLE');
    });

    it('rejects repository selection when the repo is inaccessible or does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/repositories/select',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        payload: {
          owner: 'octocat-org',
          repo: 'secret-unauthorized-repo',
          installationId: 1001,
        },
      });

      // Never trust client claims without server verification!
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('rejects malformed selection payloads with 400 validation error', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/repositories/select',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        payload: {
          owner: '',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('4. Tracked Repositories Listing & Inspection', () => {
    beforeEach(async () => {
      await inMemoryRepoStore.upsertRepository({
        githubRepoId: 9001,
        owner: 'octocat-org',
        name: 'test-repo',
        fullName: 'octocat-org/test-repo',
        defaultBranch: 'main',
        isPrivate: false,
        htmlUrl: 'https://github.com/octocat-org/test-repo',
        description: 'Forensics repository',
      });
    });

    it('lists all tracked repositories', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<RepositoryInfo[]>;
      expect(body.success).toBe(true);
      expect(body.data?.length).toBe(1);
      expect(body.data?.[0].fullName).toBe('octocat-org/test-repo');
    });

    it('gets detailed repository information for tracked repo', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/octocat-org/test-repo',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<RepositoryInfo>;
      expect(body.success).toBe(true);
      expect(body.data?.fullName).toBe('octocat-org/test-repo');
      expect(body.data?.syncState?.status).toBe('IDLE');
    });

    it('returns 404 for untracked repository queries', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/unknown-org/untracked-repo',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('5. Observable Repository Sync Endpoints', () => {
    let repoId: string;

    beforeEach(async () => {
      const repo = await inMemoryRepoStore.upsertRepository({
        githubRepoId: 9001,
        owner: 'octocat-org',
        name: 'test-repo',
        fullName: 'octocat-org/test-repo',
        defaultBranch: 'main',
        isPrivate: false,
        htmlUrl: 'https://github.com/octocat-org/test-repo',
        description: 'Forensics repository',
      });
      repoId = repo.id;
    });

    it('triggers sync, marks state as QUEUED, and returns 202', async () => {
      let triggeredJobData: any = null;
      app = buildApp(config, {
        tokenVerifier: mockTokenVerifier,
        githubService: mockGitHubService,
        repositoryStore: inMemoryRepoStore,
        onSyncTrigger: async (jobData) => {
          triggeredJobData = jobData;
          return `mock-job-${Date.now()}`;
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/repositories/octocat-org/test-repo/sync',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body) as ApiResponse<SyncTriggerResult>;
      expect(body.success).toBe(true);
      expect(body.data?.status).toBe('QUEUED');
      expect(body.data?.owner).toBe('octocat-org');
      expect(body.data?.repo).toBe('test-repo');
      expect(triggeredJobData?.owner).toBe('octocat-org');

      // Verify sync state in store is now QUEUED
      const syncState = await inMemoryRepoStore.getSyncState(repoId);
      expect(syncState?.status).toBe('QUEUED');
      expect(syncState?.startedAt).not.toBeNull();
    });

    it('returns existing running status without duplicate job if sync is RUNNING and not forced', async () => {
      await inMemoryRepoStore.updateSyncState(repoId, {
        status: 'RUNNING',
        startedAt: new Date(),
        progress: 45,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/repositories/octocat-org/test-repo/sync',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApiResponse<SyncTriggerResult>;
      expect(body.success).toBe(true);
      expect(body.data?.status).toBe('RUNNING');
      expect(body.data?.message).toContain('already running');
    });

    it('fetches observable sync state for a repository', async () => {
      await inMemoryRepoStore.updateSyncState(repoId, {
        status: 'RUNNING',
        progress: 65,
        issuesCount: 42,
        prsCount: 18,
        recordsImported: 60,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/octocat-org/test-repo/sync',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as any;
      expect(body.success).toBe(true);
      expect(body.data?.status).toBe('RUNNING');
      expect(body.data?.progress).toBe(65);
      expect(body.data?.issuesCount).toBe(42);
      expect(body.data?.prsCount).toBe(18);
      expect(body.data?.recordsImported).toBe(60);
    });
  });

  describe('6. Webhook Signature Verification', () => {
    it('accepts webhooks with valid HMAC-SHA256 signature', async () => {
      const payload = {
        action: 'created',
        installation: { id: 1001, account: { login: 'octocat-org' } },
      };
      const rawPayload = JSON.stringify(payload);
      const secret = mockGitHubService.webhookSecret;
      const hmac = crypto.createHmac('sha256', secret);
      const signature = 'sha256=' + hmac.update(rawPayload).digest('hex');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/github/webhook',
        headers: {
          'x-hub-signature-256': signature,
          'x-github-event': 'installation',
          'content-type': 'application/json',
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data?.received).toBe(true);
    });

    it('rejects webhooks with missing signature with 401', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/github/webhook',
        headers: {
          'x-github-event': 'installation',
          'content-type': 'application/json',
        },
        payload: { test: true },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('rejects webhooks with invalid signature with 401', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/github/webhook',
        headers: {
          'x-hub-signature-256': 'sha256=invalidhexsignature00000000000000000000000000000000000000000000000',
          'x-github-event': 'installation',
          'content-type': 'application/json',
        },
        payload: { test: true },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('INVALID_SIGNATURE');
    });
  });
});
