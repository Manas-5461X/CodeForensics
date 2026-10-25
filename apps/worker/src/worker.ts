import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { SYNC_QUEUE_NAME, createRedisConnection, type RepositorySyncJobData } from './queues/syncQueue.js';
import { processSyncJob, sanitizeLog, type SyncJobResult } from './processors/syncProcessor.js';
import type { WorkerConfig } from './config.js';

export interface SyncWorkerOptions {
  connection?: IORedis;
  concurrency?: number;
  processor?: (job: Job<RepositorySyncJobData, SyncJobResult>) => Promise<SyncJobResult>;
  workerFactory?: (
    queueName: string,
    processor: (job: Job<RepositorySyncJobData, SyncJobResult>) => Promise<SyncJobResult>,
    opts: { connection: IORedis; concurrency: number }
  ) => Worker<RepositorySyncJobData, SyncJobResult>;
  closeConnectionOnStop?: boolean;
}

export class SyncWorkerService {
  private worker: Worker<RepositorySyncJobData, SyncJobResult> | null = null;
  private connection: IORedis;
  private shouldCloseConnection: boolean;
  private concurrency: number;
  private processor: (job: Job<RepositorySyncJobData, SyncJobResult>) => Promise<SyncJobResult>;
  private workerFactory: (
    queueName: string,
    processor: (job: Job<RepositorySyncJobData, SyncJobResult>) => Promise<SyncJobResult>,
    opts: { connection: IORedis; concurrency: number }
  ) => Worker<RepositorySyncJobData, SyncJobResult>;

  constructor(config: WorkerConfig, options?: SyncWorkerOptions) {
    if (options?.connection) {
      this.connection = options.connection;
      this.shouldCloseConnection = options.closeConnectionOnStop ?? true;
    } else {
      this.connection = createRedisConnection(config.REDIS_URL);
      this.shouldCloseConnection = true;
    }

    this.concurrency = options?.concurrency ?? config.WORKER_CONCURRENCY;
    this.processor = options?.processor ?? processSyncJob;
    this.workerFactory =
      options?.workerFactory ??
      ((name, proc, opts) => new Worker<RepositorySyncJobData, SyncJobResult>(name, proc, opts));
  }

  /**
   * Initializes and starts the BullMQ worker.
   */
  public async start(): Promise<Worker<RepositorySyncJobData, SyncJobResult>> {
    if (this.worker) {
      return this.worker;
    }

    this.worker = this.workerFactory(
      SYNC_QUEUE_NAME,
      async (job) => {
        const attempt = job.attemptsMade + 1;
        const maxAttempts = job.opts.attempts || 3;
        console.log(
          `[Worker:Active] Job ${job.id} started (attempt ${attempt}/${maxAttempts}) for ${job.data.owner}/${job.data.repo}`
        );
        return await this.processor(job);
      },
      {
        connection: this.connection,
        concurrency: this.concurrency,
      }
    );

    this.worker.on('progress', (job, progress) => {
      console.log(`[Worker:Progress] Job ${job.id} progress: ${progress}%`);
    });

    this.worker.on('completed', (job, result) => {
      console.log(
        `[Worker:Completed] Job ${job.id} finished successfully. Status: ${result?.status}, records: ${result?.recordsImported}`
      );
    });

    this.worker.on('failed', (job, err) => {
      const sanitized = sanitizeLog(err.message);
      const attempts = job?.attemptsMade ?? 0;
      const maxAttempts = job?.opts.attempts ?? 3;

      if (attempts >= maxAttempts) {
        console.error(
          `[Worker:TerminalFailure] Job ${job?.id} permanently failed after ${attempts} attempts. Error: ${sanitized}`
        );
      } else {
        console.warn(
          `[Worker:RetryScheduled] Job ${job?.id} failed on attempt ${attempts}/${maxAttempts}. Retry scheduled. Error: ${sanitized}`
        );
      }
    });

    this.worker.on('error', (err) => {
      console.error(`[Worker:Error] Unhandled worker error: ${sanitizeLog(err.message)}`);
    });

    return this.worker;
  }

  /**
   * Gracefully shuts down the BullMQ worker and closes the underlying Redis connection.
   */
  public async stop(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.close();
      } catch (err) {
        console.error(`[Worker:StopError] Error closing worker: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        this.worker = null;
      }
    }

    if (this.shouldCloseConnection && this.connection) {
      try {
        await this.connection.quit();
      } catch {
        try {
          this.connection.disconnect();
        } catch {
          // Ignore teardown disconnect errors
        }
      }
    }
  }

  public getWorker(): Worker<RepositorySyncJobData, SyncJobResult> | null {
    return this.worker;
  }

  public getConnection(): IORedis {
    return this.connection;
  }
}
