/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __studyflow_prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__studyflow_prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__studyflow_prisma = prisma;
}

/**
 * Check the authoritative PostgreSQL store. This must never report a mock or
 * fallback data source as healthy.
 */
export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  message: string;
  latencyMs: number;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      message: 'PostgreSQL database connected and operational',
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    console.error('[HealthCheck] PostgreSQL is unavailable:', err?.message);
    return {
      ok: false,
      message: 'PostgreSQL database is unavailable',
      latencyMs: Date.now() - start,
    };
  }
}

/** Refuse to serve the application until its authoritative store is ready. */
export async function assertDatabaseReady(): Promise<void> {
  const health = await checkDatabaseHealth();
  if (!health.ok) {
    throw new Error(
      '[FATAL] PostgreSQL readiness check failed. Verify DATABASE_URL and applied migrations.'
    );
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (err: any) {
    console.error('[Database] Disconnect error:', err?.message);
  }
}
