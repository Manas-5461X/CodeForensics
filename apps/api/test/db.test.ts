import { describe, it, expect, vi } from 'vitest';
import { checkDatabaseConnection, disconnectDatabase } from '../src/db/prisma.js';
import { buildApp } from '../src/app.js';
import type { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 3: Database & Health Check Infrastructure', () => {
  describe('checkDatabaseConnection', () => {
    it('returns isConnected: true with latencyMs when database responds', async () => {
      const mockPrisma = {
        $queryRawUnsafe: vi.fn().mockResolvedValue([{ result: 1 }]),
      } as unknown as PrismaClient;

      const result = await checkDatabaseConnection(mockPrisma);
      expect(result.isConnected).toBe(true);
      expect(typeof result.latencyMs).toBe('number');
      expect(result.error).toBeUndefined();
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1 as result');
    });

    it('returns isConnected: false with descriptive error when query fails', async () => {
      const mockPrisma = {
        $queryRawUnsafe: vi.fn().mockRejectedValue(new Error('Connection refused at 127.0.0.1:5432')),
      } as unknown as PrismaClient;

      const result = await checkDatabaseConnection(mockPrisma);
      expect(result.isConnected).toBe(false);
      expect(result.error).toContain('Connection refused at 127.0.0.1:5432');
    });

    it('returns isConnected: false when query times out', async () => {
      const mockPrisma = {
        $queryRawUnsafe: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 500))
        ),
      } as unknown as PrismaClient;

      const result = await checkDatabaseConnection(mockPrisma, 50); // 50ms timeout
      expect(result.isConnected).toBe(false);
      expect(result.error).toContain('timed out after 50ms');
    });

    it('disconnects gracefully without throwing errors', async () => {
      const mockDisconnect = vi.fn().mockResolvedValue(undefined);
      const mockPrisma = {
        $disconnect: mockDisconnect,
      } as unknown as PrismaClient;

      await expect(disconnectDatabase(mockPrisma)).resolves.not.toThrow();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fastify /health Endpoint Service Verification', () => {
    it('reports database: connected when DATABASE_URL is configured and database is healthy', async () => {
      const app = buildApp(
        {
          NODE_ENV: 'test',
          PORT: 4000,
          HOST: '127.0.0.1',
          CORS_ORIGIN: 'http://localhost:5173',
          PUBLIC_WEB_URL: 'http://localhost:5173',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/codeforensics_dev',
        },
        {
          dbChecker: async () => ({ isConnected: true }),
        }
      );

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ok');
      expect(body.data.services.database).toBe('connected');
    });

    it('reports database: disconnected and status: degraded when database connection fails', async () => {
      const app = buildApp(
        {
          NODE_ENV: 'test',
          PORT: 4000,
          HOST: '127.0.0.1',
          CORS_ORIGIN: 'http://localhost:5173',
          PUBLIC_WEB_URL: 'http://localhost:5173',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/codeforensics_dev',
        },
        {
          dbChecker: async () => ({ isConnected: false, error: 'Database unreachable' }),
        }
      );

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('degraded');
      expect(body.data.services.database).toBe('disconnected');
    });

    it('reports database: disabled when DATABASE_URL is not set', async () => {
      const app = buildApp({
        NODE_ENV: 'test',
        PORT: 4000,
        HOST: '127.0.0.1',
        CORS_ORIGIN: 'http://localhost:5173',
        PUBLIC_WEB_URL: 'http://localhost:5173',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ok');
      expect(body.data.services.database).toBe('disabled');
      expect(body.data.services.redis).toBe('disabled');
    });
  });

  describe('Prisma Migration Files Integrity', () => {
    it('verifies the initial migration directory and SQL script exist', () => {
      const migrationDir = path.resolve(process.cwd(), '../../prisma/migrations/20261023000000_init');
      const migrationSqlPath = path.join(migrationDir, 'migration.sql');
      const lockFilePath = path.resolve(process.cwd(), '../../prisma/migrations/migration_lock.toml');

      // Check migration directory and files
      expect(fs.existsSync(migrationSqlPath)).toBe(true);
      expect(fs.existsSync(lockFilePath)).toBe(true);

      const sqlContent = fs.readFileSync(migrationSqlPath, 'utf8');

      // Check that all core Phase 3 entities are represented in the migration DDL
      expect(sqlContent).toContain('CREATE TABLE "users"');
      expect(sqlContent).toContain('CREATE TABLE "repositories"');
      expect(sqlContent).toContain('CREATE TABLE "repository_sync_states"');
      expect(sqlContent).toContain('CREATE TABLE "issues"');
      expect(sqlContent).toContain('CREATE TABLE "pull_requests"');
      expect(sqlContent).toContain('CREATE TABLE "relationships"');
      expect(sqlContent).toContain('CREATE TABLE "investigations"');
      expect(sqlContent).toContain('CREATE TABLE "job_records"');
      expect(sqlContent).toContain('CREATE TYPE "SyncStatus"');
      expect(sqlContent).toContain('CREATE TYPE "ClaimCategory"');
    });
  });
});
