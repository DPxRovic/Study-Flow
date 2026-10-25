/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 1. Load env FIRST (before any other imports)
import dotenv from 'dotenv';
dotenv.config();

if (process.argv.includes('--production')) {
  process.env.NODE_ENV = 'production';
}

// 2. Now safely import everything else
import express from 'express';
import { createServer as createViteServer } from 'vite';

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
  app.use('/api', (_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 404, message: 'API route not found' },
    });
  });
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

  app.listen(config.port, config.host, () => {
    console.log(`[StudyFlow] Academic server running on ${config.host}:${config.port}`);
    console.log(`→ http://localhost:${config.port}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
