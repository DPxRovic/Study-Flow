/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import apiRoutes from './src/server/routes';
import { errorHandler } from './src/server/middleware/errorHandler';
import { config } from './src/server/config';

export async function createServer() {
  const app = express();

  // Parse JSON payloads with strict limit
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Mount API endpoints under /api
  app.use('/api', apiRoutes);

  // Global Error Handler for /api routes
  app.use(errorHandler);

  // In production, serve built client from dist
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    // In dev, attach Vite middleware dynamically
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}

// Start standalone server when executed directly
if (process.env.NODE_ENV !== 'test') {
  createServer().then((app) => {
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`[StudyFlow] Academic server running on port ${config.port}`);
    });
  });
}
