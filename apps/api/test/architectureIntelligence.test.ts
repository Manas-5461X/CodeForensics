import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { MockTokenVerifier } from '../src/auth/tokenVerifier.js';
import { MockGitHubService } from '../src/github/mockGitHubService.js';
import { InMemoryRepositoryStore } from '../src/db/repositoryStore.js';
import { RepositoryMapEngine } from '../src/intelligence/repositoryMapEngine.js';
import type {
  ApiResponse,
  CoChangeReport,
  RepositoryMapTimeline,
  KnowledgeLossSummary,
  BlastRadiusImpact,
  DependencyFlowReport,
} from '@codeforensics/shared';

describe('Advanced Architecture Intelligence & Forensics', () => {
  const config = loadConfig();
  let mockTokenVerifier: MockTokenVerifier;
  let mockGitHubService: MockGitHubService;
  let repoStore: InMemoryRepositoryStore;
  let app: ReturnType<typeof buildApp>;

  const testUser = {
    uid: 'user-architect-lead',
    email: 'architect@codeforensics.dev',
    displayName: 'Lead Architect',
  };

  beforeEach(async () => {
    mockTokenVerifier = new MockTokenVerifier();
    mockTokenVerifier.registerToken('valid-token', testUser);

    mockGitHubService = new MockGitHubService();
    repoStore = new InMemoryRepositoryStore();

    app = buildApp(config, {
      tokenVerifier: mockTokenVerifier,
      githubService: mockGitHubService,
      repositoryStore: repoStore,
    });

    // Seed test repository
    await repoStore.upsertRepository({
      owner: 'octocat',
      name: 'spoon-knife',
      fullName: 'octocat/spoon-knife',
      defaultBranch: 'main',
      isPrivate: false,
      htmlUrl: 'https://github.com/octocat/spoon-knife',
      description: 'The repo for all things forks',
      githubRepoId: 1001,
    });
  });

  it('1. Temporal Co-Change & Coupling: calculates coupled file pairs with percentages', () => {
    const report = RepositoryMapEngine.computeCoChangeReport({ repositoryId: 'repo-1' });

    expect(report.totalCoupledPairs).toBeGreaterThanOrEqual(5);
    expect(report.crossSubsystemPairsCount).toBeGreaterThan(0);

    const apiWebCoupling = report.pairs.find(
      (p) => p.sourceFile.includes('repositoryRoutes') && p.targetFile.includes('WorkItemDetailDrawer')
    );
    expect(apiWebCoupling).toBeDefined();
    expect(apiWebCoupling?.couplingPercentage).toBeGreaterThanOrEqual(70);
    expect(apiWebCoupling?.crossSubsystem).toBe(true);
  });

  it('2. Time-Machine Timeline: creates 4 chronological milestones with increasing complexity', () => {
    const baseMap = RepositoryMapEngine.generateMap({
      repositoryId: 'repo-1',
      fullName: 'octocat/spoon-knife',
    });

    const timeline = RepositoryMapEngine.computeTimeline({
      repositoryId: 'repo-1',
      fullName: 'octocat/spoon-knife',
      baseMap,
    });

    expect(timeline.milestones).toHaveLength(4);
    expect(timeline.milestones[0].label).toBe('6 Months Ago');
    expect(timeline.milestones[3].label).toBe('Present Snapshot');

    // Milestones should grow in file count
    expect(timeline.milestones[0].totalFiles).toBeLessThan(timeline.milestones[3].totalFiles);
  });

  it('3. Bus Factor & Knowledge Loss: detects single-maintainer dependencies and zombie hotspots', () => {
    const baseMap = RepositoryMapEngine.generateMap({
      repositoryId: 'repo-1',
      fullName: 'octocat/spoon-knife',
    });

    const summary = RepositoryMapEngine.computeKnowledgeLoss({
      repositoryId: 'repo-1',
      baseMap,
    });

    expect(summary.totalAnalyzedFiles).toBeGreaterThan(0);
    expect(summary.riskItems.length).toBeGreaterThan(0);
    expect(summary.averageBusFactor).toBeGreaterThanOrEqual(1);

    const criticalOrHigh = summary.riskItems.filter((i) => i.riskLevel === 'CRITICAL' || i.riskLevel === 'HIGH');
    expect(criticalOrHigh.length).toBeGreaterThan(0);
  });

  it('4. Blast Radius Predictor: predicts downstream companion files, affected tests, and reviewer suggestions', () => {
    const baseMap = RepositoryMapEngine.generateMap({
      repositoryId: 'repo-1',
      fullName: 'octocat/spoon-knife',
    });

    const impact = RepositoryMapEngine.computeBlastRadius({
      targetFiles: ['apps/api/src/routes/repositoryRoutes.ts'],
      baseMap,
    });

    expect(impact.targetFiles).toContain('apps/api/src/routes/repositoryRoutes.ts');
    expect(impact.coupledCompanions.length).toBeGreaterThan(0);
    expect(impact.affectedTests.length).toBeGreaterThan(0);
    expect(impact.affectedSubsystems).toContain('apps');
    expect(impact.recommendedReviewers.length).toBeGreaterThan(0);
    expect(impact.blastRadiusScore).toBeGreaterThanOrEqual(15);
  });

  it('5. Subsystem Dependency Flow: returns subsystem edges with zero layer violations', () => {
    const baseMap = RepositoryMapEngine.generateMap({
      repositoryId: 'repo-1',
      fullName: 'octocat/spoon-knife',
    });

    const flow = RepositoryMapEngine.computeDependencyFlow({
      repositoryId: 'repo-1',
      baseMap,
    });

    expect(flow.edges.length).toBeGreaterThan(0);
    expect(flow.edges.some((e) => e.targetSubsystem === 'packages/shared')).toBe(true);
    expect(flow.circularCycles).toHaveLength(0);
  });

  it('6. Offline Audit Dossier (.html): generates complete standalone HTML document', () => {
    const baseMap = RepositoryMapEngine.generateMap({
      repositoryId: 'repo-1',
      fullName: 'octocat/spoon-knife',
    });

    const html = RepositoryMapEngine.exportStandaloneDossierHtml({ baseMap });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('OFFLINE FORENSIC AUDIT DOSSIER');
    expect(html).toContain('octocat/spoon-knife');
    expect(html).toContain('Subsystems Architecture');
    expect(html).toContain('Temporal Co-Change');
    expect(html).toContain('Bus Factor');
  });

  it('7. API Routes: serves co-change, timeline, knowledge-loss, blast-radius, and dossier endpoints', async () => {
    const authHeaders = { authorization: 'Bearer valid-token' };

    // Co-Change
    const coChangeRes = await app.inject({
      method: 'GET',
      url: '/api/v1/repositories/octocat/spoon-knife/map/co-change',
      headers: authHeaders,
    });
    expect(coChangeRes.statusCode).toBe(200);
    const coChangeBody = coChangeRes.json() as ApiResponse<CoChangeReport>;
    expect(coChangeBody.success).toBe(true);
    expect(coChangeBody.data?.pairs.length).toBeGreaterThan(0);

    // Timeline
    const timelineRes = await app.inject({
      method: 'GET',
      url: '/api/v1/repositories/octocat/spoon-knife/map/timeline',
      headers: authHeaders,
    });
    expect(timelineRes.statusCode).toBe(200);
    const timelineBody = timelineRes.json() as ApiResponse<RepositoryMapTimeline>;
    expect(timelineBody.data?.milestones).toHaveLength(4);

    // Knowledge Loss
    const klRes = await app.inject({
      method: 'GET',
      url: '/api/v1/repositories/octocat/spoon-knife/map/knowledge-loss',
      headers: authHeaders,
    });
    expect(klRes.statusCode).toBe(200);
    const klBody = klRes.json() as ApiResponse<KnowledgeLossSummary>;
    expect(klBody.data?.riskItems.length).toBeGreaterThan(0);

    // Blast Radius (POST)
    const blastRes = await app.inject({
      method: 'POST',
      url: '/api/v1/repositories/octocat/spoon-knife/map/blast-radius',
      headers: authHeaders,
      payload: { targetFiles: ['apps/api/src/routes/repositoryRoutes.ts'] },
    });
    expect(blastRes.statusCode).toBe(200);
    const blastBody = blastRes.json() as ApiResponse<BlastRadiusImpact>;
    expect(blastBody.data?.blastRadiusScore).toBeGreaterThanOrEqual(15);

    // Dependency Flow
    const depRes = await app.inject({
      method: 'GET',
      url: '/api/v1/repositories/octocat/spoon-knife/map/dependencies',
      headers: authHeaders,
    });
    expect(depRes.statusCode).toBe(200);
    const depBody = depRes.json() as ApiResponse<DependencyFlowReport>;
    expect(depBody.data?.edges.length).toBeGreaterThan(0);

    // Standalone Dossier HTML
    const dossierRes = await app.inject({
      method: 'GET',
      url: '/api/v1/repositories/octocat/spoon-knife/map/dossier',
      headers: authHeaders,
    });
    expect(dossierRes.statusCode).toBe(200);
    expect(dossierRes.headers['content-type']).toContain('text/html');
    expect(dossierRes.body).toContain('OFFLINE FORENSIC AUDIT DOSSIER');
  });
});
