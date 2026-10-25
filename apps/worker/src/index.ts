import { loadWorkerConfig } from './config.js';
import { SyncWorkerService } from './worker.js';

export * from './config.js';
export * from './worker.js';
export * from './queues/syncQueue.js';
export * from './processors/syncProcessor.js';

async function startWorker(): Promise<void> {
  const config = loadWorkerConfig();
  console.log('[CodeForensics Worker] Initializing BullMQ background worker...');

  const workerService = new SyncWorkerService(config);

  try {
    await workerService.start();
    console.log('[CodeForensics Worker] BullMQ worker listening for sync jobs.');
  } catch (err) {
    console.error('[CodeForensics Worker] Fatal initialization error:', err);
    process.exit(1);
  }

  // Graceful shutdown handling
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, () => {
      console.log(`[CodeForensics Worker] Received ${signal}, closing worker gracefully...`);
      void workerService.stop().then(() => {
        console.log('[CodeForensics Worker] Worker and Redis connections closed cleanly.');
        process.exit(0);
      });
    });
  }
}

// Only start when invoked directly as main script
const isMainModule = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMainModule) {
  void startWorker();
}
