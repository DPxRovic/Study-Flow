/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 1. Load env FIRST (before any other imports)
import dotenv from 'dotenv';
dotenv.config();

// 2. Now safely import everything else
import express from 'express';
import { createServer as createViteServer } from 'vite';

// Process-level resilience: Prevent unexpected external API rejections or uncaught errors from crashing the Node.js process
process.on('unhandledRejection', (reason: any) => {
  console.error('[StudyFlow Server] Unhandled Promise Rejection (process kept alive):', reason?.message || reason);
});

process.on('uncaughtException', (err: any) => {
  console.error('[StudyFlow Server] Uncaught Exception (process kept alive):', err?.message || err);
});

let serverInstance: any = null;

async function start() {
  const { default: apiRoutes } = await import('./src/server/routes');
  const { errorHandler } = await import('./src/server/middleware/errorHandler');
  const { securityHeaders, corsMiddleware } = await import('./src/server/middleware/security');
  const { config } = await import('./src/server/config');

  const app = express();

  // 1. Security Headers & CORS
  app.use(securityHeaders);
  app.use(corsMiddleware);

  // 2. Strict Request Body Limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use('/api', apiRoutes);
  app.use(errorHandler);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  if (!serverInstance) {
    serverInstance = app.listen(config.port, '0.0.0.0', () => {
      console.log(`[StudyFlow] Academic server running on port ${config.port}`);
      console.log(`→ http://localhost:${config.port}`);
    });
  }
}

const shutdown = () => {
  if (serverInstance) {
    serverInstance.close(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}