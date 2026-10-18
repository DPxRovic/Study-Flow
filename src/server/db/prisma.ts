/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // Allow global prisma client during development to prevent connection leaks across hot reloads
  var __studyflow_prisma: PrismaClient | undefined;
}

export const prisma =
  global.__studyflow_prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__studyflow_prisma = prisma;
}

/**
 * Health check helper that safely checks PostgreSQL availability without exposing credentials.
 */
export async function checkDatabaseHealth(): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return {
      ok: true,
      message: 'PostgreSQL database connected and operational',
      latencyMs,
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message?.split('\n')[0] || 'Database connection unreachable',
    };
  }
}

/**
 * Graceful database disconnection
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
