import { Queue, JobsOptions } from 'bullmq';
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

export function createSyncQueue(redisUrl: string): Queue<RepositorySyncJobData> {
  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  return new Queue<RepositorySyncJobData>(SYNC_QUEUE_NAME, {
    connection,
    defaultJobOptions,
  });
}
