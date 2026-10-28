import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  SelectRepositorySchema,
  RepositoryParamsSchema,
  SyncTriggerSchema,
  WorkItemQuerySchema,
  RelationshipQuerySchema,
  ContributorQuerySchema,
  ArchaeologyQuerySchema,
} from '@codeforensics/shared';
import type {
  ApiResponse,
  RepositoryInfo,
  RepositorySyncStateInfo,
  GitHubInstallationInfo,
  SyncTriggerResult,
  WorkItemSummary,
  WorkItemDetail,
  PaginatedResult,
  DiffFile,
  RelationshipInfo,
  ResolutionAssessment,
  ContributionAnalysisResult,
  ArchaeologyTraceResult,
  RepositoryMapData,
} from '@codeforensics/shared';
import type { IGitHubService } from '../github/githubApp.js';
import type { RepositoryStore } from '../db/repositoryStore.js';
import { formatRepositoryInfo } from '../db/repositoryStore.js';
import { RepositoryMapEngine } from '../intelligence/repositoryMapEngine.js';
import type { Queue } from 'bullmq';
import type { RepositorySyncJobData } from '../types/syncJob.js';
import { runInProcessSync } from '../sync/inProcessSync.js';

export interface RepositoryRoutesOptions {
  githubService: IGitHubService;
  repositoryStore: RepositoryStore;
  syncQueue?: Queue<RepositorySyncJobData> | null;
  onSyncTrigger?: (jobData: RepositorySyncJobData) => Promise<string>;
}

export const repositoryRoutes: FastifyPluginAsync<RepositoryRoutesOptions> = async (
  fastify,
  opts
) => {
  const { githubService, repositoryStore, syncQueue, onSyncTrigger } = opts;

  // 1. List GitHub App installations
  fastify.get(
    '/github/installations',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        if (!githubService.isConfigured()) {
          // If not configured, check if any installations exist in the database
          const dbInstallations = await repositoryStore.listInstallations();
          const response: ApiResponse<GitHubInstallationInfo[]> = {
            success: true,
            data: dbInstallations,
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
              coverage: {
                isComplete: false,
                warnings: ['GitHub App credentials not configured on backend; returning recorded installations.'],
              },
            },
          };
          return reply.status(200).send(response);
        }

        const installations = await githubService.listInstallations();
        // Sync installations to database
        const synched: GitHubInstallationInfo[] = [];
        for (const inst of installations) {
          const saved = await repositoryStore.upsertInstallation(inst);
          synched.push(saved);
        }

        const response: ApiResponse<GitHubInstallationInfo[]> = {
          success: true,
          data: synched,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(200).send(response);
      } catch (err) {
        request.log.error(err);
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'GITHUB_API_ERROR',
            message: err instanceof Error ? err.message : 'Failed to query GitHub App installations',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(502).send(response);
      }
    }
  );

  // 2. Discover repositories accessible to an authorized GitHub App installation
  fastify.get(
    '/github/installations/:installationId/repositories',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { installationId } = request.params as { installationId: string };
      const instId = parseInt(installationId, 10);

      if (isNaN(instId) || instId <= 0) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid installationId parameter. Must be a positive integer.',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(400).send(response);
      }

      try {
        const repos = await githubService.listRepositoriesForInstallation(instId);
        const mapped: RepositoryInfo[] = repos.map((r) => ({
          id: `gh-${r.id}`,
          githubRepoId: r.id,
          installationId: String(instId),
          owner: r.owner,
          name: r.name,
          fullName: r.fullName,
          defaultBranch: r.defaultBranch,
          isPrivate: r.private,
          htmlUrl: r.htmlUrl,
          description: r.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncState: null,
        }));

        const response: ApiResponse<RepositoryInfo[]> = {
          success: true,
          data: mapped,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(200).send(response);
      } catch (err) {
        request.log.error(err);
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'GITHUB_ACCESS_DENIED',
            message:
              err instanceof Error
                ? err.message
                : `Failed to retrieve repositories for installation ${instId}`,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(502).send(response);
      }
    }
  );

  // 3. Select and track repository (with server-side verification)
  fastify.post(
    '/repositories/select',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parseResult = SelectRepositorySchema.safeParse(request.body);
      if (!parseResult.success) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues.map((i) => i.message).join('; '),
            details: parseResult.error.format(),
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(400).send(response);
      }

      const { owner, repo, installationId } = parseResult.data;

      try {
        // Server-side verification: Verify access directly via GitHub App
        const ghRepo = await githubService.getRepository(owner, repo, installationId);

        // Associate installation in DB if provided
        let dbInstallationId: string | null = null;
        if (installationId) {
          const inst = await repositoryStore.findInstallation(installationId);
          if (inst) {
            dbInstallationId = inst.id;
          }
        }

        // Persist verified repository in primary database
        const savedRepo = await repositoryStore.upsertRepository({
          githubRepoId: ghRepo.id,
          owner: ghRepo.owner,
          name: ghRepo.name,
          fullName: ghRepo.fullName,
          defaultBranch: ghRepo.defaultBranch,
          isPrivate: ghRepo.private,
          htmlUrl: ghRepo.htmlUrl,
          description: ghRepo.description,
          installationId: dbInstallationId,
        });

        const response: ApiResponse<RepositoryInfo> = {
          success: true,
          data: formatRepositoryInfo(savedRepo),
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(200).send(response);
      } catch (err: unknown) {
        request.log.error(err);
        const status = (err as { status?: number })?.status;
        const statusCode = status === 404 ? 404 : 403;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: statusCode === 404 ? 'NOT_FOUND' : 'ACCESS_DENIED',
            message:
              err instanceof Error
                ? err.message
                : `Repository ${owner}/${repo} is not accessible through this GitHub App installation.`,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(statusCode).send(response);
      }
    }
  );

  // 4. List all tracked repositories
  fastify.get(
    '/repositories',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const repos = await repositoryStore.listRepositories();
      const response: ApiResponse<RepositoryInfo[]> = {
        success: true,
        data: repos.map(formatRepositoryInfo),
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(200).send(response);
    }
  );

  // 5. Get tracked repository details
  fastify.get(
    '/repositories/:owner/:repo',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = RepositoryParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid owner or repo parameters',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(400).send(response);
      }

      const { owner, repo } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);

      if (!found) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Repository ${owner}/${repo} is not tracked. Please select it first.`,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<RepositoryInfo> = {
        success: true,
        data: formatRepositoryInfo(found),
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(200).send(response);
    }
  );

  // 6. Trigger repository synchronization
  fastify.post(
    '/repositories/:owner/:repo/sync',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = RepositoryParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid owner or repo parameters',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(400).send(response);
      }

      const { owner, repo } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);

      if (!found) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Repository ${owner}/${repo} is not tracked. Please select it first.`,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(404).send(response);
      }

      const bodyResult = SyncTriggerSchema.safeParse(request.body || {});
      const force = bodyResult.success ? bodyResult.data.force : false;

      const currentSyncState = await repositoryStore.getSyncState(found.id);
      const isStale =
        currentSyncState &&
        (currentSyncState.status === 'RUNNING' || currentSyncState.status === 'QUEUED') &&
        currentSyncState.startedAt &&
        Date.now() - new Date(currentSyncState.startedAt).getTime() > 60_000;

      if (currentSyncState?.status === 'RUNNING' && !force && !isStale) {
        const response: ApiResponse<SyncTriggerResult> = {
          success: true,
          data: {
            jobId: `active-sync-${found.id}`,
            repositoryId: found.id,
            owner,
            repo,
            status: 'RUNNING',
            message: 'A synchronization job is already running for this repository.',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(200).send(response);
      }

      // Mark status as QUEUED
      await repositoryStore.updateSyncState(found.id, {
        status: 'QUEUED',
        startedAt: new Date(),
        errorSummary: null,
      });

      const userUid = request.user?.uid || 'anonymous';
      const jobData: RepositorySyncJobData = {
        repositoryId: found.id,
        owner,
        repo,
        triggeredBy: userUid,
      };

      let jobId = `sync-${found.id}-${Date.now()}`;

      if (onSyncTrigger) {
        jobId = await onSyncTrigger(jobData);
      } else {
        if (syncQueue) {
          try {
            const job = await syncQueue.add(`${owner}/${repo}`, jobData);
            jobId = String(job.id);
          } catch {
            // Queue unavailable, proceed with in-process execution
          }
        }
        // Asynchronously execute in-process sync pipeline so the UI receives live progress
        void runInProcessSync({
          repositoryId: found.id,
          owner,
          repo,
          repositoryStore,
          githubService,
          installationId: found.installationId ? parseInt(found.installationId, 10) : undefined,
        });
      }

      const response: ApiResponse<SyncTriggerResult> = {
        success: true,
        data: {
          jobId,
          repositoryId: found.id,
          owner,
          repo,
          status: 'QUEUED',
          message: 'Repository synchronization job successfully queued.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(202).send(response);
    }
  );

  // 7. Get live repository sync state
  fastify.get(
    '/repositories/:owner/:repo/sync',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = RepositoryParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid owner or repo parameters',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(400).send(response);
      }

      const { owner, repo } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);

      if (!found) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Repository ${owner}/${repo} is not tracked.`,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(404).send(response);
      }

      const syncState = await repositoryStore.getSyncState(found.id);
      const cp = (syncState?.checkpoints as Record<string, unknown>) || {};
      const calculatedProgress =
        typeof cp.progress === 'number'
          ? cp.progress
          : typeof syncState?.progress === 'number' && syncState.progress > 0
          ? syncState.progress
          : syncState?.status === 'COMPLETED'
          ? 100
          : 0;

      const stateInfo: RepositorySyncStateInfo = {
        id: syncState?.id || `sync-${found.id}`,
        repositoryId: found.id,
        status: syncState?.status || 'IDLE',
        startedAt: syncState?.startedAt ? new Date(syncState.startedAt).toISOString() : null,
        completedAt: syncState?.completedAt ? new Date(syncState.completedAt).toISOString() : null,
        lastSuccessfulSyncAt: syncState?.lastSuccessfulSyncAt
          ? new Date(syncState.lastSuccessfulSyncAt).toISOString()
          : null,
        recordsImported: syncState?.recordsImported || 0,
        issuesCount: syncState?.issuesCount || 0,
        prsCount: syncState?.prsCount || 0,
        progress: calculatedProgress,
        checkpoints: syncState?.checkpoints || null,
        errorSummary: syncState?.errorSummary || null,
        createdAt: syncState?.createdAt ? new Date(syncState.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: syncState?.updatedAt ? new Date(syncState.updatedAt).toISOString() : new Date().toISOString(),
      };

      const response: ApiResponse<RepositorySyncStateInfo> = {
        success: true,
        data: stateInfo,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
          coverage: {
            isComplete: stateInfo.status === 'COMPLETED',
            warnings: stateInfo.errorSummary ? [stateInfo.errorSummary] : undefined,
          },
        },
      };
      return reply.status(200).send(response);
    }
  );

  const WorkItemParamsSchema = z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    number: z.coerce.number().int().positive(),
  });

  // 9. List work items (Issues & PRs) with pagination, search, filter, and sort
  fastify.get(
    '/repositories/:owner/:repo/items',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = RepositoryParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid owner or repo parameters',
            details: paramsResult.error.flatten(),
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(400).send(response);
      }

      const queryResult = WorkItemQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid work item query parameters',
            details: queryResult.error.flatten(),
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(400).send(response);
      }

      const { owner, repo } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);

      if (!found) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Repository ${owner}/${repo} is not tracked.`,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(404).send(response);
      }

      const syncState = await repositoryStore.getSyncState(found.id);
      const paginated = await repositoryStore.listWorkItems(found.id, queryResult.data);

      const warnings: string[] = [];
      if (!syncState || syncState.status === 'IDLE') {
        warnings.push('Repository has not been synchronized yet. Data may be empty.');
      } else if (syncState.status === 'FAILED') {
        warnings.push('Repository synchronization failed. Displayed items may be incomplete.');
      } else if (syncState.status === 'RUNNING' || syncState.status === 'QUEUED') {
        warnings.push('Repository synchronization is actively running.');
      }

      const response: ApiResponse<PaginatedResult<WorkItemSummary>> = {
        success: true,
        data: paginated,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
          coverage: {
            isComplete: syncState?.status === 'COMPLETED',
            warnings: warnings.length > 0 ? warnings : undefined,
          },
        },
      };
      return reply.status(200).send(response);
    }
  );

  // 10. Get work item detail (Issue or PR) with metadata and available timeline/diff
  fastify.get(
    '/repositories/:owner/:repo/items/:number',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = WorkItemParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid item route parameters. Item number must be a positive integer.',
            details: paramsResult.error.flatten(),
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(400).send(response);
      }

      const { owner, repo, number } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);

      if (!found) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Repository ${owner}/${repo} is not tracked.`,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(404).send(response);
      }

      const item = await repositoryStore.getWorkItem(found.id, number);
      if (!item) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: `Work item #${number} was not found in ${owner}/${repo}.`,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        };
        return reply.status(404).send(response);
      }

      // If GitHub App integration is live, attempt to enrich with live comments / diff files
      if (githubService.isConfigured() && found.installationId) {
        const instId = parseInt(found.installationId, 10);
        if (!isNaN(instId) && instId > 0) {
          try {
            const octokit = await githubService.getInstallationOctokit(instId);

            // Fetch comments
            try {
              const commentsRes = await octokit.rest.issues.listComments({
                owner: found.owner,
                repo: found.name,
                issue_number: number,
                per_page: 50,
              });
              if (commentsRes.data && commentsRes.data.length > 0) {
                item.timelineAvailable = true;
                item.timelineNotes = 'Live discussion comments retrieved from GitHub API.';
                item.timelineEvents = commentsRes.data.map((c) => ({
                  id: String(c.id),
                  type: 'comment',
                  author: c.user?.login || null,
                  body: c.body || '',
                  createdAt: c.created_at,
                  htmlUrl: c.html_url,
                }));
              } else if (commentsRes.data) {
                item.timelineAvailable = true;
                item.timelineNotes = 'No comments posted yet.';
                item.timelineEvents = [];
              }
            } catch (commentErr) {
              request.log.warn({ err: commentErr }, 'Could not fetch live comments from GitHub');
            }

            // If PR, fetch files/diff
            if (item.type === 'pull_request') {
              try {
                const filesRes = await octokit.rest.pulls.listFiles({
                  owner: found.owner,
                  repo: found.name,
                  pull_number: number,
                  per_page: 50,
                });
                if (filesRes.data) {
                  item.diffAvailable = true;
                  item.diffNotes = 'Live pull request diff files retrieved from GitHub API.';
                  const files: DiffFile[] = filesRes.data.map((f) => ({
                    filename: f.filename,
                    status: f.status,
                    additions: f.additions,
                    deletions: f.deletions,
                    patch: f.patch,
                  }));
                  item.diffSummary = {
                    additions: files.reduce((acc, f) => acc + f.additions, 0),
                    deletions: files.reduce((acc, f) => acc + f.deletions, 0),
                    changedFiles: files.length,
                    files,
                  };
                }
              } catch (diffErr) {
                request.log.warn({ err: diffErr }, 'Could not fetch live PR diff from GitHub');
              }
            }
          } catch (octokitErr) {
            request.log.warn({ err: octokitErr }, 'Could not instantiate installation Octokit for enrichment');
          }
        }
      }

      const syncState = await repositoryStore.getSyncState(found.id);
      const response: ApiResponse<WorkItemDetail> = {
        success: true,
        data: item,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
          coverage: {
            isComplete: syncState?.status === 'COMPLETED',
          },
        },
      };
      return reply.status(200).send(response);
    }
  );

  // 11. Timeline sub-endpoint
  fastify.get(
    '/repositories/:owner/:repo/items/:number/timeline',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = WorkItemParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid route parameters' },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }
      const { owner, repo, number } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);
      if (!found) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Repository ${owner}/${repo} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }
      const item = await repositoryStore.getWorkItem(found.id, number);
      if (!item) {
        return reply.status(404).send({
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: `Item #${number} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }
      return reply.status(200).send({
        success: true,
        data: {
          available: item.timelineAvailable,
          notes: item.timelineNotes,
          events: item.timelineEvents || [],
        },
        meta: { timestamp: new Date().toISOString(), requestId: request.id },
      });
    }
  );

  // 12. Diff sub-endpoint
  fastify.get(
    '/repositories/:owner/:repo/items/:number/diff',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = WorkItemParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid route parameters' },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }
      const { owner, repo, number } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);
      if (!found) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Repository ${owner}/${repo} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }
      const item = await repositoryStore.getWorkItem(found.id, number);
      if (!item) {
        return reply.status(404).send({
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: `Item #${number} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }
      return reply.status(200).send({
        success: true,
        data: {
          available: item.diffAvailable,
          notes: item.diffNotes,
          diff: item.diffSummary || null,
        },
        meta: { timestamp: new Date().toISOString(), requestId: request.id },
      });
    }
  );

  // 13. Repository Relationships Endpoint
  fastify.get(
    '/repositories/:owner/:repo/relationships',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = RepositoryParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid repository parameters' },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const queryResult = RelationshipQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: queryResult.error.errors[0]?.message || 'Invalid relationship query parameters',
          },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const { owner, repo } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);
      if (!found) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Repository ${owner}/${repo} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const rels = await repositoryStore.getRelationships(found.id, {
        itemNumber: queryResult.data.itemNumber,
        type:
          queryResult.data.type !== 'all'
            ? (queryResult.data.type as any)
            : undefined,
      });

      const response: ApiResponse<RelationshipInfo[]> = {
        success: true,
        data: rels,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(200).send(response);
    }
  );

  // 14. Work Item Specific Relationships Endpoint
  fastify.get(
    '/repositories/:owner/:repo/items/:number/relationships',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = WorkItemParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid route parameters' },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const { owner, repo, number } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);
      if (!found) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Repository ${owner}/${repo} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const item = await repositoryStore.getWorkItem(found.id, number);
      if (!item) {
        return reply.status(404).send({
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: `Item #${number} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const rels = await repositoryStore.getRelationships(found.id, { itemNumber: number });

      const response: ApiResponse<RelationshipInfo[]> = {
        success: true,
        data: rels,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(200).send(response);
    }
  );

  // 15. Issue Resolution Assessment Endpoint
  fastify.get(
    '/repositories/:owner/:repo/items/:number/resolution',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = WorkItemParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid route parameters' },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const { owner, repo, number } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);
      if (!found) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Repository ${owner}/${repo} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const item = await repositoryStore.getWorkItem(found.id, number);
      if (!item) {
        return reply.status(404).send({
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: `Item #${number} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      if (item.type !== 'issue') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NOT_AN_ISSUE',
            message: `Resolution assessment is only applicable to issues. Item #${number} is a pull request.`,
          },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const assessment = await repositoryStore.assessResolution(found.id, number);
      if (!assessment) {
        return reply.status(404).send({
          success: false,
          error: { code: 'ASSESSMENT_NOT_FOUND', message: `Could not assess resolution for issue #${number}.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const response: ApiResponse<ResolutionAssessment> = {
        success: true,
        data: assessment,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(200).send(response);
    }
  );

  // 16. Contributor Recommendations Discovery Endpoint
  fastify.get(
    '/repositories/:owner/:repo/contributors/recommendations',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = RepositoryParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid repository parameters' },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const queryResult = ContributorQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid contributor query parameters',
            details: queryResult.error.format(),
          },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const { owner, repo } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);
      if (!found) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Repository ${owner}/${repo} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const recommendations = await repositoryStore.getContributorRecommendations(
        found.id,
        queryResult.data
      );

      const response: ApiResponse<ContributionAnalysisResult> = {
        success: true,
        data: recommendations,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
          coverage: {
            isComplete: !found.syncState || found.syncState.status === 'COMPLETED',
            warnings: recommendations.coverageNotes,
          },
        },
      };
      return reply.status(200).send(response);
    }
  );

  // 17. Work Item Specific Contributor Recommendations Shortcut Endpoint
  fastify.get(
    '/repositories/:owner/:repo/items/:number/contributors',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = WorkItemParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid route parameters' },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const queryResult = ContributorQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid query parameters',
            details: queryResult.error.format(),
          },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const { owner, repo, number } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);
      if (!found) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Repository ${owner}/${repo} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const item = await repositoryStore.getWorkItem(found.id, number);
      if (!item) {
        return reply.status(404).send({
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: `Item #${number} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const recommendations = await repositoryStore.getContributorRecommendations(found.id, {
        ...queryResult.data,
        itemNumber: number,
      });

      const response: ApiResponse<ContributionAnalysisResult> = {
        success: true,
        data: recommendations,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
          coverage: {
            isComplete: !found.syncState || found.syncState.status === 'COMPLETED',
            warnings: recommendations.coverageNotes,
          },
        },
      };
      return reply.status(200).send(response);
    }
  );

  // 18. Code Archaeology: Symbol and file AST and revision lineage trace
  fastify.get(
    '/repositories/:owner/:repo/archaeology/trace',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = RepositoryParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid repository parameters' },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const queryResult = ArchaeologyQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid archaeology query parameters',
            details: queryResult.error.format(),
          },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const { owner, repo } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);
      if (!found) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Repository ${owner}/${repo} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const traceResult = await repositoryStore.traceArchaeology(found.id, {
        query: queryResult.data.query,
        filePath: queryResult.data.filePath,
      });

      const response: ApiResponse<ArchaeologyTraceResult> = {
        success: true,
        data: traceResult,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
          coverage: {
            isComplete: !found.syncState || found.syncState.status === 'COMPLETED',
            warnings: traceResult.coverageNotes,
          },
        },
      };

      return reply.status(200).send(response);
    }
  );

  // 19. Repository Architecture Map & Churn Heatmap
  fastify.get(
    '/repositories/:owner/:repo/map',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = RepositoryParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid repository parameters' },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const { owner, repo } = paramsResult.data;
      const found = await repositoryStore.findRepository(owner, repo);
      if (!found) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Repository ${owner}/${repo} not found.` },
          meta: { timestamp: new Date().toISOString(), requestId: request.id },
        });
      }

      const mapData = await repositoryStore.getRepositoryMap(found.id);

      const query = request.query as { format?: string };
      if (query.format === 'markdown') {
        const md = RepositoryMapEngine.exportMarkdown(mapData);
        return reply
          .header('Content-Type', 'text/markdown; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${repo}-architecture-map.md"`)
          .send(md);
      }
      if (query.format === 'mermaid') {
        const mermaid = RepositoryMapEngine.exportMermaid(mapData);
        return reply
          .header('Content-Type', 'text/plain; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${repo}-architecture.mmd"`)
          .send(mermaid);
      }
      if (query.format === 'text') {
        const text = RepositoryMapEngine.exportTextTree(mapData);
        return reply
          .header('Content-Type', 'text/plain; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${repo}-tree.txt"`)
          .send(text);
      }

      const response: ApiResponse<RepositoryMapData> = {
        success: true,
        data: mapData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
          coverage: {
            isComplete: !found.syncState || found.syncState.status === 'COMPLETED',
          },
        },
      };

      return reply.status(200).send(response);
    }
  );

  // 20. GitHub App Webhook endpoint with HMAC-SHA256 signature verification
  fastify.post('/github/webhook', async (request, reply) => {
    const signature = request.headers['x-hub-signature-256'] as string | undefined;

    if (!signature) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing x-hub-signature-256 header on webhook request.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(401).send(response);
    }

    const payload = JSON.stringify(request.body);
    const isValid = githubService.verifyWebhookSignature(payload, signature);

    if (!isValid) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook HMAC-SHA256 signature verification failed.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      };
      return reply.status(401).send(response);
    }

    // Process webhook event safely
    const event = request.headers['x-github-event'] as string;
    request.log.info({ event }, 'Received verified GitHub webhook');

    const response: ApiResponse<{ received: boolean; event: string }> = {
      success: true,
      data: {
        received: true,
        event,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });
};
