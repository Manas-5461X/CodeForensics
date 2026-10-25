import { loadConfig } from './config/env.js';
import { buildApp } from './app.js';
import { disconnectDatabase } from './db/prisma.js';

async function startServer(): Promise<void> {
  const config = loadConfig();
  const app = buildApp(config);

  try {
    const address = await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`[CodeForensics API] Server listening at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, () => {
      app.log.info(`Received ${signal}, closing server gracefully...`);
      void Promise.all([app.close(), disconnectDatabase()]).then(() => {
        app.log.info('Server and database connections closed successfully.');
        process.exit(0);
      });
    });
  }
}

void startServer();
