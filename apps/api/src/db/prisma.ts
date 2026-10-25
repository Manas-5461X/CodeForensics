import { PrismaClient } from '@prisma/client';

let globalPrisma: PrismaClient | null = null;

export interface DatabaseHealthResult {
  isConnected: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Returns a singleton or custom PrismaClient instance configured with DATABASE_URL.
 */
export function getPrismaClient(databaseUrl?: string): PrismaClient {
  if (databaseUrl) {
    return new PrismaClient({
      datasources: {
        db: { url: databaseUrl },
      },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  if (!globalPrisma) {
    globalPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  return globalPrisma;
}

/**
 * Checks database connectivity with a strict timeout to prevent hangs.
 */
export async function checkDatabaseConnection(
  client?: PrismaClient,
  timeoutMs = 2000
): Promise<DatabaseHealthResult> {
  const prisma = client || getPrismaClient();
  const startTime = Date.now();

  try {
    const queryPromise = prisma.$queryRawUnsafe('SELECT 1 as result');
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Database health check timed out after ${timeoutMs}ms`)), timeoutMs)
    );

    await Promise.race([queryPromise, timeoutPromise]);
    const latencyMs = Date.now() - startTime;

    return {
      isConnected: true,
      latencyMs,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database connection error';
    return {
      isConnected: false,
      error: message,
    };
  }
}

/**
 * Disconnects the global Prisma client gracefully during server shutdown.
 */
export async function disconnectDatabase(client?: PrismaClient): Promise<void> {
  const prisma = client || globalPrisma;
  if (prisma) {
    try {
      await prisma.$disconnect();
    } catch {
      // Ignore disconnect errors during teardown
    }
  }
  if (!client && globalPrisma) {
    globalPrisma = null;
  }
}
