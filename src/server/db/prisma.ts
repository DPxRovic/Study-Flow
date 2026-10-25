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

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.trim() === '') {
  console.warn(
    '[WARN] DATABASE_URL is not configured in environment. Database operations against Neon PostgreSQL will fail.'
  );
}

/**
 * Canonical StudyFlow Prisma Client Singleton
 * Configured for Neon PostgreSQL connection pooling.
 * Reused across server execution and hot reloads in development.
 */
export const prisma: PrismaClient =
  global.__studyflow_prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__studyflow_prisma = prisma;
}

/**
 * Health check helper that executes a genuine lightweight query against PostgreSQL.
 * Distinguishes real database connectivity from web server process availability.
 * Never leaks credentials or connection strings in responses.
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
    const latency = Date.now() - start;
    console.error('[HealthCheck] Neon PostgreSQL connectivity failure:', err?.message);
    return {
      ok: false,
      message: 'Database service unavailable or unreachable',
      latencyMs: latency,
    };
  }
}

/**
 * Graceful database disconnection
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (err: any) {
    console.error('[Database] Disconnect error:', err?.message);
  }
}
