import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { loadWorkerConfig } from './config.js';
import { SYNC_QUEUE_NAME } from './queues/syncQueue.js';
import { processSyncJob } from './processors/syncProcessor.js';

async function startWorker(): Promise<void> {
  const config = loadWorkerConfig();
  console.log(`[CodeForensics Worker] Initializing BullMQ worker for queue "${SYNC_QUEUE_NAME}"...`);

  const connection = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  const worker = new Worker(
    SYNC_QUEUE_NAME,
    async (job) => {
      console.log(`[Worker] Processing job ${job.id} for repository ${job.data.owner}/${job.data.repo}`);
      return await processSyncJob(job);
    },
    {
      connection,
      concurrency: config.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, () => {
      console.log(`[Worker] Received ${signal}, closing worker gracefully...`);
      void worker.close().then(() => {
        console.log('[Worker] Worker closed.');
        process.exit(0);
      });
    });
  }
}

void startWorker();
