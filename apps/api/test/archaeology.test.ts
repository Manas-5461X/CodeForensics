import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { MockTokenVerifier } from '../src/auth/tokenVerifier.js';
import { MockGitHubService } from '../src/github/mockGitHubService.js';
import { InMemoryRepositoryStore } from '../src/db/repositoryStore.js';
import { ArchaeologyEngine } from '../src/intelligence/archaeologyEngine.js';
import type { ApiResponse, ArchaeologyTraceResult } from '@codeforensics/shared';

describe('Phase 8: Code Archaeology & Safe Source Analysis', () => {
  const config = loadConfig();
  let mockTokenVerifier: MockTokenVerifier;
  let mockGitHubService: MockGitHubService;
  let repoStore: InMemoryRepositoryStore;
  let app: ReturnType<typeof buildApp>;

  const testUser = {
    uid: 'user-phase8-archaeologist',
    email: 'archaeologist@codeforensics.dev',
    displayName: 'Forensic Archaeologist',
  };

  const sampleTypeScriptSource = `
import { useState, useEffect } from 'react';

export interface DeferredValueConfig {
  timeoutMs: number;
}

export type ValueTransformer<T> = (val: T) => T;

export function useDeferredValue<T>(value: T, initialValue?: T): T {
  const [deferredValue, setDeferredValue] = useState<T>(initialValue !== undefined ? initialValue : value);

  useEffect(() => {
    setDeferredValue(value);
  }, [value]);

  return deferredValue;
}

export class LaneScheduler {
  private laneId: number;

  constructor(laneId: number) {
    this.laneId = laneId;
  }

  public scheduleWork(priority: number): void {
    // work scheduling logic
  }
}

export const createScheduler = () => new LaneScheduler(1);
`;

  beforeEach(async () => {
    mockTokenVerifier = new MockTokenVerifier();
    mockTokenVerifier.registerToken('archaeology-token', testUser);

    mockGitHubService = new MockGitHubService();
    repoStore = new InMemoryRepositoryStore();

    app = buildApp(config, {
      tokenVerifier: mockTokenVerifier,
      githubService: mockGitHubService,
      repositoryStore: repoStore,
    });

    const repo = await repoStore.upsertRepository({
      githubRepoId: 102030,
      owner: 'facebook',
      name: 'react',
      fullName: 'facebook/react',
      defaultBranch: 'main',
      isPrivate: false,
      htmlUrl: 'https://github.com/facebook/react',
      description: 'A JavaScript library for building user interfaces',
    });

    await repoStore.upsertPullRequests([
      {
        githubPrId: 29012,
        repositoryId: repo.id,
        number: 29012,
        title: 'Fix tearing in useDeferredValue by snapshotting transition lanes',
        body: 'Touches packages/react/src/ReactHooks.js to prevent memory leak',
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: '2024-05-15T10:00:00Z',
        author: 'acdlite',
        baseRef: 'main',
        headRef: 'fix-deferred-value',
        htmlUrl: 'https://github.com/facebook/react/pull/29012',
        createdAt: '2024-05-10T08:00:00Z',
        updatedAt: '2024-05-15T10:00:00Z',
      },
      {
        githubPrId: 27514,
        repositoryId: repo.id,
        number: 27514,
        title: 'Add initialValue parameter to useDeferredValue signature',
        body: 'Updates packages/react/src/ReactHooks.js for RFC #219',
        state: 'closed',
        isDraft: false,
        merged: true,
        mergedAt: '2023-11-20T14:30:00Z',
        author: 'gnoff',
        baseRef: 'main',
        headRef: 'deferred-initial-val',
        htmlUrl: 'https://github.com/facebook/react/pull/27514',
        createdAt: '2023-11-15T09:00:00Z',
        updatedAt: '2023-11-20T14:30:00Z',
      },
    ]);
  });

  describe('AST Symbol Discovery & Source Parsing', () => {
    it('discovers functions, hooks, interfaces, classes, and methods with accurate line ranges', () => {
      const engine = new ArchaeologyEngine();
      const catalog = engine.extractSymbols(
        sampleTypeScriptSource,
        'packages/react/src/ReactHooks.ts'
      );

      expect(catalog.language).toBe('typescript');
      expect(catalog.totalLines).toBeGreaterThan(20);
      expect(catalog.symbols.length).toBeGreaterThanOrEqual(6);

      // Check hook discovery
      const hookSymbol = catalog.symbols.find((s) => s.name === 'useDeferredValue');
      expect(hookSymbol).toBeDefined();
      expect(hookSymbol?.kind).toBe('hook');
      expect(hookSymbol?.exported).toBe(true);
      expect(hookSymbol?.startLine).toBeGreaterThan(5);
      expect(hookSymbol?.endLine).toBeGreaterThan(hookSymbol!.startLine);

      // Check interface discovery
      const iface = catalog.symbols.find((s) => s.name === 'DeferredValueConfig');
      expect(iface).toBeDefined();
      expect(iface?.kind).toBe('interface');

      // Check type alias discovery
      const typeAlias = catalog.symbols.find((s) => s.name === 'ValueTransformer');
      expect(typeAlias).toBeDefined();
      expect(typeAlias?.kind).toBe('type');

      // Check class discovery
      const classSymbol = catalog.symbols.find((s) => s.name === 'LaneScheduler');
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.kind).toBe('class');

      // Check class method discovery
      const methodSymbol = catalog.symbols.find((s) => s.name === 'LaneScheduler.scheduleWork');
      expect(methodSymbol).toBeDefined();
      expect(methodSymbol?.kind).toBe('method');
    });

    it('honestly reports unsupported languages without failing', () => {
      const engine = new ArchaeologyEngine();
      const catalog = engine.extractSymbols(
        'def python_func():\n    pass\n',
        'scripts/build.py'
      );

      expect(catalog.language).toBe('unsupported');
      expect(catalog.symbols).toEqual([]);
      expect(catalog.totalLines).toBe(3);
    });
  });

  describe('Safe Path Validation & Untrusted Repository Content', () => {
    const engine = new ArchaeologyEngine();

    it('rejects path traversal sequences with parent directory references', () => {
      const result1 = engine.sanitizeFilePath('../../etc/passwd');
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('Path traversal detected');

      const result2 = engine.sanitizeFilePath('src/../../secret.env');
      expect(result2.valid).toBe(false);
    });

    it('rejects absolute paths and drive letters', () => {
      const resultWindows = engine.sanitizeFilePath('C:\\Windows\\System32\\cmd.exe');
      expect(resultWindows.valid).toBe(false);
      expect(resultWindows.error).toContain('Absolute file paths');

      const resultPosix = engine.sanitizeFilePath('/usr/local/bin/node');
      expect(resultPosix.valid).toBe(false);
    });

    it('rejects null byte injection attempts', () => {
      const result = engine.sanitizeFilePath('src/app.ts\0.exe');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('null bytes');
    });

    it('normalizes valid relative workspace paths safely', () => {
      const result = engine.sanitizeFilePath('packages\\react\\src\\ReactHooks.js');
      expect(result.valid).toBe(true);
      expect(result.normalizedPath).toBe('packages/react/src/ReactHooks.js');
    });
  });

  describe('Git Revision Lineage & Honest Disclaimers', () => {
    it('synthesizes chronological revision history and distinguishes source facts from interpretations', () => {
      const engine = new ArchaeologyEngine();
      const trace = engine.trace({
        query: 'useDeferredValue',
        filePath: 'packages/react/src/ReactHooks.ts',
        repoOwner: 'facebook',
        repoName: 'react',
        sourceCode: sampleTypeScriptSource,
        pullRequests: [
          {
            id: '29012',
            number: 29012,
            title: 'Fix tearing in useDeferredValue by snapshotting transition lanes',
            body: 'Touches packages/react/src/ReactHooks.js',
            state: 'closed',
            merged: true,
            mergedAt: new Date('2024-05-15T10:00:00Z'),
            author: 'acdlite',
            createdAt: new Date('2024-05-10T08:00:00Z'),
            updatedAt: new Date('2024-05-15T10:00:00Z'),
          },
          {
            id: '27514',
            number: 27514,
            title: 'Add initialValue parameter to useDeferredValue signature',
            body: 'RFC #219 updates ReactHooks.js',
            state: 'closed',
            merged: true,
            mergedAt: new Date('2023-11-20T14:30:00Z'),
            author: 'gnoff',
            createdAt: new Date('2023-11-15T09:00:00Z'),
            updatedAt: new Date('2023-11-20T14:30:00Z'),
          },
        ],
      });

      expect(trace.targetType).toBe('symbol');
      expect(trace.symbol?.name).toBe('useDeferredValue');
      expect(trace.revisions.length).toBe(2);
      expect(trace.revisions[0]?.isHead).toBe(true);
      expect(trace.revisions[1]?.isOrigin).toBe(true);

      // Verify valid GitHub URLs
      expect(trace.gitHubFileUrl).toContain('facebook/react/blob/main/packages/react/src/ReactHooks.ts#L');

      // Verify disclaimer on never asserting defect causality without evidence
      expect(trace.evidenceDisclaimer).toContain(
        'CodeForensics observes commit and revision lineage without inferring defect introduction or fixing without explicit verified evidence'
      );
    });
  });

  describe('API Endpoint: GET /api/v1/repositories/:owner/:repo/archaeology/trace', () => {
    it('returns 401 when request is unauthenticated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/archaeology/trace?query=useDeferredValue',
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 404 for unknown repository', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/unknown-org/unknown-repo/archaeology/trace?query=useDeferredValue',
        headers: {
          authorization: 'Bearer archaeology-token',
        },
      });
      expect(res.statusCode).toBe(404);
    });

    it('traces symbol history across ingested PRs and returns verified GitHub metadata', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/archaeology/trace?query=useDeferredValue',
        headers: {
          authorization: 'Bearer archaeology-token',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as ApiResponse<ArchaeologyTraceResult>;
      expect(body.success).toBe(true);
      expect(body.data?.query).toBe('useDeferredValue');
      expect(body.data?.revisions.length).toBeGreaterThanOrEqual(2);
      expect(body.data?.linkedWorkItems.length).toBeGreaterThanOrEqual(1);
      expect(body.data?.evidenceDisclaimer).toBeDefined();
    });

    it('rejects empty query parameter with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/facebook/react/archaeology/trace?query=',
        headers: {
          authorization: 'Bearer archaeology-token',
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
