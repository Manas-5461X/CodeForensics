import { Queue, Job, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

export const SYNC_QUEUE_NAME = 'repository-sync';

export interface RepositorySyncJobData {
  repositoryId: string;
  owner: string;
  repo: string;
  installationId?: number;
  triggeredBy: string;
}

export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5s initial retry delay
  },
  removeOnComplete: {
    age: 86400, // 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 604800, // 7 days for debugging failed syncs
  },
};

/**
 * Creates a standalone Redis connection configured for BullMQ.
 * Enables lazyConnect and disables maxRetriesPerRequest as required by BullMQ.
 */
export function createRedisConnection(redisUrl: string): IORedis {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableReadyCheck: true,
  });
}

/**
 * Instantiates the repository sync BullMQ queue.
 */
export function createSyncQueue(redisUrlOrConnection: string | IORedis): Queue<RepositorySyncJobData> {
  const connection =
    typeof redisUrlOrConnection === 'string'
      ? createRedisConnection(redisUrlOrConnection)
      : redisUrlOrConnection;

  return new Queue<RepositorySyncJobData>(SYNC_QUEUE_NAME, {
    connection,
    defaultJobOptions,
  });
}

/**
 * Submits a new repository sync job to the queue with sound defaults and validation.
 */
export async function enqueueSyncJob(
  queue: Queue<RepositorySyncJobData>,
  data: RepositorySyncJobData,
  customOptions?: JobsOptions
): Promise<Job<RepositorySyncJobData>> {
  if (!data.repositoryId || !data.owner || !data.repo) {
    throw new Error('Invalid sync job data: repositoryId, owner, and repo are required.');
  }

  const jobName = `${data.owner}/${data.repo}`;
  const options: JobsOptions = {
    ...defaultJobOptions,
    ...customOptions,
  };

  return await queue.add(jobName, data, options);
}

/**
 * Gracefully shuts down a BullMQ queue and its underlying Redis connection.
 */
export async function closeSyncQueue(queue: Queue): Promise<void> {
  try {
    await queue.close();
  } catch {
    // Ignore queue close errors during process teardown
  }
}
