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

async function start() {
  // Dynamic imports so they run AFTER dotenv
  const { default: apiRoutes } = await import('./src/server/routes');
  const { errorHandler } = await import('./src/server/middleware/errorHandler');
  const { config } = await import('./src/server/config');

  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

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

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[StudyFlow] Academic server running on port ${config.port}`);
    console.log(`→ http://localhost:${config.port}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}