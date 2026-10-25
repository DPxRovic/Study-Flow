/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';

export interface ServerConfig {
  port: number;
  host: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  env: string;
  appName: string;
  resendApiKey: string;
  resendFromEmail: string;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

// Strict validation of required security & database variables
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  if (isProd) {
    throw new Error('[FATAL] Missing required DATABASE_URL environment variable in production mode.');
  } else {
    console.warn('[WARN] DATABASE_URL is not set. Database operations requiring PostgreSQL will fail.');
  }
}

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProd) {
    throw new Error('[FATAL] Missing required JWT_SECRET environment variable in production mode.');
  } else {
    jwtSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[WARN] JWT_SECRET is not set. Using an ephemeral development secret; sessions will reset on restart.');
  }
}

if (isProd && (jwtSecret.length < 32 || /studyflow|change.?me|example|secret/i.test(jwtSecret))) {
  throw new Error('[FATAL] JWT_SECRET must be at least 32 characters and must not use an example value.');
}

const rawPort = process.env.PORT || '3000';
if (!/^\d+$/.test(rawPort)) {
  throw new Error(`[FATAL] PORT must be an integer between 1 and 65535; received "${rawPort}".`);
}
const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`[FATAL] PORT must be an integer between 1 and 65535; received "${rawPort}".`);
}

export const config: ServerConfig = {
  port,
  host: process.env.HOST || (isProd ? '0.0.0.0' : '127.0.0.1'),
  databaseUrl: databaseUrl || '',
  jwtSecret,
  jwtExpiresIn: '7d',
  env: nodeEnv,
  appName: 'StudyFlow Academic Planner',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'StudyFlow <onboarding@resend.dev>',
};
