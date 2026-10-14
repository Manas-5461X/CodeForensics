import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const WorkerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
  WORKER_WORKSPACE_DIR: z.string().default('./tmp/workspaces'),
});

export type WorkerConfig = z.infer<typeof WorkerEnvSchema>;

export function loadWorkerConfig(): WorkerConfig {
  const result = WorkerEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`[Worker Configuration Error] Invalid environment:\n  - ${issues.join('\n  - ')}`);
  }
  return result.data;
}
