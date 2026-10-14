import { describe, it, expect, vi } from 'vitest';
import { defaultJobOptions, SYNC_QUEUE_NAME } from '../src/queues/syncQueue.js';
import { processSyncJob } from '../src/processors/syncProcessor.js';
import type { Job } from 'bullmq';

describe('Worker Queue and Processor Foundation', () => {
  it('configures sound exponential backoff and retry policy', () => {
    expect(defaultJobOptions.attempts).toBe(3);
    expect(defaultJobOptions.backoff).toEqual({
      type: 'exponential',
      delay: 5000,
    });
    expect(SYNC_QUEUE_NAME).toBe('repository-sync');
  });

  it('handles job progress and returns structured result', async () => {
    const mockUpdateProgress = vi.fn().mockResolvedValue(undefined);
    const mockJob = {
      id: 'job-123',
      data: {
        repositoryId: 'repo-abc',
        owner: 'octocat',
        repo: 'Hello-World',
        triggeredBy: 'manual',
      },
      updateProgress: mockUpdateProgress,
    } as unknown as Job;

    const result = await processSyncJob(mockJob as any);
    expect(result.status).toBe('COMPLETED');
    expect(result.repositoryId).toBe('repo-abc');
    expect(mockUpdateProgress).toHaveBeenCalledWith(10);
    expect(mockUpdateProgress).toHaveBeenCalledWith(50);
    expect(mockUpdateProgress).toHaveBeenCalledWith(100);
  });
});
