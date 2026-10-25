import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { MockTokenVerifier } from '../src/auth/tokenVerifier.js';
import { InvestigationStore } from '../src/auth/authorization.js';
import type { AppConfig } from '../src/config/env.js';

describe('API Authentication & Authorization (Phase 2)', () => {
  let app: FastifyInstance;
  let mockVerifier: MockTokenVerifier;
  let investigationStore: InvestigationStore;

  const testConfig: AppConfig = {
    NODE_ENV: 'test',
    PORT: 3002,
    HOST: '127.0.0.1',
    CORS_ORIGIN: 'http://localhost:5173',
    PUBLIC_WEB_URL: 'http://localhost:5173',
  };

  const userAlice = {
    uid: 'alice_123',
    email: 'alice@example.com',
    name: 'Alice Cooper',
  };

  const userBob = {
    uid: 'bob_456',
    email: 'bob@example.com',
    name: 'Bob Marley',
  };

  beforeAll(async () => {
    mockVerifier = new MockTokenVerifier();
    mockVerifier.setToken('alice-token', userAlice);
    mockVerifier.setToken('bob-token', userBob);

    investigationStore = new InvestigationStore();

    app = buildApp(testConfig, {
      tokenVerifier: mockVerifier,
      investigationStore,
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    investigationStore.clear();
  });

  describe('Authentication Failures on Protected Endpoints', () => {
    it('rejects requests missing an Authorization header with 401 UNAUTHORIZED', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('Missing authorization header');
      expect(body.meta.requestId).toBeDefined();
    });

    it('rejects requests with malformed Authorization header with 401 UNAUTHORIZED', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Basic dXNlcjpwYXNz',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('Malformed authorization header');
    });

    it('rejects requests with invalid / unrecognized tokens with 401 UNAUTHORIZED', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer non-existent-token-xyz',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('invalid');
    });

    it('rejects requests with expired tokens with 401 UNAUTHORIZED', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer expired-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('expired');
    });
  });

  describe('Successful Authentication', () => {
    it('returns verified user identity for a valid token on GET /api/v1/auth/me', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer alice-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.uid).toBe('alice_123');
      expect(body.data.email).toBe('alice@example.com');
      expect(body.data.displayName).toBe('Alice Cooper');
    });
  });

  describe('Resource Ownership and Authorization Boundaries', () => {
    it('allows an authenticated user to create an investigation owned by their token UID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/user/investigations',
        headers: {
          authorization: 'Bearer alice-token',
        },
        payload: {
          title: 'Memory Leak Investigation in Worker Sync',
          description: 'Investigating high RSS usage during large repository index',
          query: { repo: 'CodeForensics', symbol: 'syncQueue' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.userId).toBe('alice_123');
      expect(body.data.title).toBe('Memory Leak Investigation in Worker Sync');
      expect(body.data.id).toBeDefined();
    });

    it('rejects client attempt to spoof a different userId with 403 FORBIDDEN', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/user/investigations',
        headers: {
          authorization: 'Bearer alice-token',
        },
        payload: {
          title: 'Spoofed Investigation',
          userId: 'bob_456', // Attempting to create on behalf of Bob while logged in as Alice
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('Cannot create resources on behalf of another user ID');
    });

    it('allows owner to access their own investigation', async () => {
      const inv = investigationStore.create('alice_123', {
        title: "Alice's Secret Finding",
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/user/investigations/${inv.id}`,
        headers: {
          authorization: 'Bearer alice-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(inv.id);
      expect(body.data.userId).toBe('alice_123');
    });

    it('denies access to an investigation owned by another user with 403 FORBIDDEN', async () => {
      const aliceInv = investigationStore.create('alice_123', {
        title: "Alice's Investigation",
      });

      // Bob tries to access Alice's investigation
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/user/investigations/${aliceInv.id}`,
        headers: {
          authorization: 'Bearer bob-token',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('Access denied');
    });

    it('denies deletion of an investigation owned by another user with 403 FORBIDDEN', async () => {
      const aliceInv = investigationStore.create('alice_123', {
        title: "Alice's Investigation To Preserve",
      });

      // Bob tries to delete Alice's investigation
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/user/investigations/${aliceInv.id}`,
        headers: {
          authorization: 'Bearer bob-token',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');

      // Verify resource was NOT deleted
      expect(investigationStore.getById(aliceInv.id)).toBeDefined();
    });

    it('lists only investigations owned by the calling user', async () => {
      investigationStore.create('alice_123', { title: 'Alice Inv 1' });
      investigationStore.create('alice_123', { title: 'Alice Inv 2' });
      investigationStore.create('bob_456', { title: 'Bob Inv 1' });

      // Alice lists
      const aliceRes = await app.inject({
        method: 'GET',
        url: '/api/v1/user/investigations',
        headers: {
          authorization: 'Bearer alice-token',
        },
      });

      expect(aliceRes.statusCode).toBe(200);
      const aliceBody = JSON.parse(aliceRes.body);
      expect(aliceBody.data).toHaveLength(2);
      expect(aliceBody.data.every((i: { userId: string }) => i.userId === 'alice_123')).toBe(true);

      // Bob lists
      const bobRes = await app.inject({
        method: 'GET',
        url: '/api/v1/user/investigations',
        headers: {
          authorization: 'Bearer bob-token',
        },
      });

      expect(bobRes.statusCode).toBe(200);
      const bobBody = JSON.parse(bobRes.body);
      expect(bobBody.data).toHaveLength(1);
      expect(bobBody.data[0].userId).toBe('bob_456');
    });
  });
});
