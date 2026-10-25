import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  defaultJobOptions,
  SYNC_QUEUE_NAME,
  enqueueSyncJob,
  createSyncQueue,
  closeSyncQueue,
  type RepositorySyncJobData,
} from '../src/queues/syncQueue.js';
import { processSyncJob, sanitizeLog, type SyncJobResult } from '../src/processors/syncProcessor.js';
import { SyncWorkerService } from '../src/worker.js';
import type { Job, Queue } from 'bullmq';
import type IORedis from 'ioredis';

describe('Phase 3: Background Job Queue & Worker Infrastructure', () => {
  describe('Queue Policy & Configuration', () => {
    it('enforces exponential backoff and 3 retry attempts', () => {
      expect(defaultJobOptions.attempts).toBe(3);
      expect(defaultJobOptions.backoff).toEqual({
        type: 'exponential',
        delay: 5000,
      });
      expect(SYNC_QUEUE_NAME).toBe('repository-sync');
    });

    it('retains completed jobs for 24 hours and failed jobs for 7 days', () => {
      expect(defaultJobOptions.removeOnComplete).toEqual({
        age: 86400,
        count: 1000,
      });
      expect(defaultJobOptions.removeOnFail).toEqual({
        age: 604800,
      });
    });
  });

  describe('Job Enqueueing & Validation', () => {
    it('validates mandatory repository metadata before queue submission', async () => {
      const mockQueue = {
        add: vi.fn(),
      } as unknown as Queue<RepositorySyncJobData>;

      await expect(
        enqueueSyncJob(mockQueue, {
          repositoryId: '',
          owner: 'octocat',
          repo: 'Hello-World',
          triggeredBy: 'user-1',
        })
      ).rejects.toThrow('repositoryId, owner, and repo are required');

      await expect(
        enqueueSyncJob(mockQueue, {
          repositoryId: 'repo-1',
          owner: '',
          repo: 'Hello-World',
          triggeredBy: 'user-1',
        })
      ).rejects.toThrow('repositoryId, owner, and repo are required');

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('submits valid sync job with merged options and owner/repo job name', async () => {
      const mockAdd = vi.fn().mockResolvedValue({ id: 'job-999' } as Job);
      const mockQueue = {
        add: mockAdd,
      } as unknown as Queue<RepositorySyncJobData>;

      const jobData: RepositorySyncJobData = {
        repositoryId: 'repo-123',
        owner: 'facebook',
        repo: 'react',
        installationId: 456,
        triggeredBy: 'system',
      };

      const job = await enqueueSyncJob(mockQueue, jobData, { priority: 1 });
      expect(job).toEqual({ id: 'job-999' });
      expect(mockAdd).toHaveBeenCalledWith(
        'facebook/react',
        jobData,
        expect.objectContaining({
          attempts: 3,
          priority: 1,
          backoff: { type: 'exponential', delay: 5000 },
        })
      );
    });

    it('handles queue closing cleanly', async () => {
      const mockClose = vi.fn().mockResolvedValue(undefined);
      const mockQueue = { close: mockClose } as unknown as Queue;

      await closeSyncQueue(mockQueue);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sync Processor & Progress Reporting', () => {
    it('tracks progress steps (10% -> 50% -> 100%) and returns structured envelope', async () => {
      const progressCalls: number[] = [];
      const mockUpdateProgress = vi.fn().mockImplementation((val: number) => {
        progressCalls.push(val);
        return Promise.resolve();
      });

      const mockJob = {
        id: 'job-123',
        data: {
          repositoryId: 'repo-abc',
          owner: 'octocat',
          repo: 'Hello-World',
          triggeredBy: 'manual',
        },
        updateProgress: mockUpdateProgress,
      } as unknown as Job<RepositorySyncJobData, SyncJobResult>;

      const result = await processSyncJob(mockJob);
      expect(result.status).toBe('COMPLETED');
      expect(result.repositoryId).toBe('repo-abc');
      expect(result.coverageComplete).toBe(true);
      expect(progressCalls).toEqual([10, 50, 100]);
    });

    it('rejects jobs missing repository metadata with explicit error', async () => {
      const mockJob = {
        id: 'job-invalid',
        data: {
          repositoryId: '',
          owner: '',
          repo: '',
          triggeredBy: '',
        },
        updateProgress: vi.fn(),
      } as unknown as Job<RepositorySyncJobData, SyncJobResult>;

      await expect(processSyncJob(mockJob)).rejects.toThrow('Missing mandatory job metadata');
    });
  });

  describe('Log Sanitization & Secret Redaction', () => {
    it('redacts Redis passwords in connection URLs', () => {
      const raw = 'Connection refused to redis://default:superSecretPassword123@localhost:6379';
      const sanitized = sanitizeLog(raw);
      expect(sanitized).toBe('Connection refused to redis://default:***@localhost:6379');
      expect(sanitized).not.toContain('superSecretPassword123');
    });

    it('redacts Bearer tokens and GitHub access tokens', () => {
      const raw = 'Failed request with Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9 and token ghp_ABC123XYZ';
      const sanitized = sanitizeLog(raw);
      expect(sanitized).toContain('Bearer [REDACTED]');
      expect(sanitized).toContain('[REDACTED_GITHUB_TOKEN]');
      expect(sanitized).not.toContain('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized).not.toContain('ghp_ABC123XYZ');
    });
  });

  describe('SyncWorkerService Lifecycle & Teardown', () => {
    let mockRedisConnection: Partial<IORedis>;

    beforeEach(() => {
      mockRedisConnection = {
        status: 'ready',
        quit: vi.fn().mockResolvedValue('OK'),
        disconnect: vi.fn(),
        on: vi.fn(),
      };
    });

    it('initializes worker and shuts down Redis connection cleanly on stop', async () => {
      const eventHandlers: Record<string, (...args: unknown[]) => void> = {};
      const mockClose = vi.fn().mockResolvedValue(undefined);
      const mockWorkerInstance = {
        on: vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
          eventHandlers[event] = handler;
          return mockWorkerInstance;
        }),
        close: mockClose,
      } as unknown as Worker<RepositorySyncJobData, SyncJobResult>;

      const mockWorkerFactory = vi.fn().mockReturnValue(mockWorkerInstance);

      const service = new SyncWorkerService(
        {
          NODE_ENV: 'test',
          REDIS_URL: 'redis://localhost:6379',
          WORKER_CONCURRENCY: 2,
          WORKER_WORKSPACE_DIR: './tmp',
        },
        {
          connection: mockRedisConnection as IORedis,
          concurrency: 2,
          workerFactory: mockWorkerFactory,
        }
      );

      const worker = await service.start();
      expect(worker).toBe(mockWorkerInstance);
      expect(mockWorkerFactory).toHaveBeenCalledWith(
        SYNC_QUEUE_NAME,
        expect.any(Function),
        expect.objectContaining({ concurrency: 2 })
      );

      // Verify event listeners were registered
      expect(eventHandlers.progress).toBeDefined();
      expect(eventHandlers.completed).toBeDefined();
      expect(eventHandlers.failed).toBeDefined();
      expect(eventHandlers.error).toBeDefined();

      // Trigger completion event handler
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      eventHandlers.completed(
        { id: 'job-1' } as Job<RepositorySyncJobData, SyncJobResult>,
        { status: 'COMPLETED', recordsImported: 5 } as SyncJobResult
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Job job-1 finished successfully. Status: COMPLETED, records: 5')
      );
      consoleLogSpy.mockRestore();

      // Trigger transient failure handler (should log retry scheduled)
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      eventHandlers.failed(
        { id: 'job-1', attemptsMade: 1, opts: { attempts: 3 } } as unknown as Job<RepositorySyncJobData, SyncJobResult>,
        new Error('Network timeout connecting to Bearer secretToken123')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Worker:RetryScheduled] Job job-1 failed on attempt 1/3. Retry scheduled.')
      );
      // Secret should be redacted
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('secretToken123'));
      consoleWarnSpy.mockRestore();

      // Trigger terminal failure handler (attempts >= maxAttempts)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      eventHandlers.failed(
        { id: 'job-1', attemptsMade: 3, opts: { attempts: 3 } } as unknown as Job<RepositorySyncJobData, SyncJobResult>,
        new Error('Permanent schema validation failure')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Worker:TerminalFailure] Job job-1 permanently failed after 3 attempts.')
      );
      consoleErrorSpy.mockRestore();

      // Gracefully stop
      await service.stop();
      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(mockRedisConnection.quit).toHaveBeenCalledTimes(1);
      expect(service.getWorker()).toBeNull();
    });
  });
});
