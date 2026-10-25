import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';

describe('API Server Foundation', () => {
  let app: FastifyInstance;

  const testConfig: AppConfig = {
    NODE_ENV: 'test',
    PORT: 3001,
    HOST: '127.0.0.1',
    CORS_ORIGIN: 'http://localhost:5173',
    PUBLIC_WEB_URL: 'http://localhost:5173',
  };

  beforeAll(async () => {
    app = buildApp(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 with standard health envelope', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.version).toBe('0.1.0');
    expect(body.meta).toBeDefined();
    expect(body.meta.requestId).toBeDefined();
    expect(body.meta.timestamp).toBeDefined();
  });

  it('GET /ready returns 200 with readiness data', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.ready).toBe(true);
  });

  it('GET /api/v1/meta returns platform metadata', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/meta',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('CodeForensics API');
  });

  it('Non-existent route returns 404 in standard error envelope', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/non-existent-route',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.meta.requestId).toBeDefined();
  });

  it('Injects strict security headers on all responses', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('GET /health reflects degraded status when database is disconnected', async () => {
    const degradedApp = buildApp(
      { ...testConfig, DATABASE_URL: 'postgresql://localhost:5432/mock_db' },
      {
        dbChecker: async () => ({ isConnected: false, error: 'Connection refused' }),
      }
    );
    await degradedApp.ready();

    const response = await degradedApp.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('degraded');
    expect(body.data.services.database).toBe('disconnected');

    await degradedApp.close();
  });
});

