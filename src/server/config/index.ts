/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

export interface ServerConfig {
  port: number;
  host: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  env: string;
  appName: string;
  gmailUser: string;
  gmailAppPassword: string;
  smtpFromName: string;
  resendApiKey: string;
  resendFromEmail: string;
  enableDevResetFallback: boolean;
  showDevResetCodeInUi: boolean;
  isProd: boolean;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

// Validation of database variables with fallback for AI Studio container
const databaseUrl = process.env.DATABASE_URL || '';
if (!databaseUrl || databaseUrl.trim() === '') {
  console.warn('[AI Studio] DATABASE_URL not set — activating in-memory database mock store.');
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
  host: process.env.HOST || '0.0.0.0',
  databaseUrl,
  jwtSecret,
  jwtExpiresIn: '7d',
  get env() {
    return process.env.NODE_ENV || 'development';
  },
  appName: 'StudyFlow Academic Planner',
  get gmailUser() {
    return process.env.GMAIL_USER || '';
  },
  get gmailAppPassword() {
    return process.env.GMAIL_APP_PASSWORD || '';
  },
  get smtpFromName() {
    return process.env.SMTP_FROM_NAME || 'StudyFlow Academic Planner';
  },
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || '',
  get enableDevResetFallback() {
    return process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_RESET_FALLBACK !== 'false';
  },
  get showDevResetCodeInUi() {
    return (
      process.env.NODE_ENV !== 'production' &&
      process.env.SHOW_DEV_RESET_CODE_IN_UI === 'true'
    );
  },
  get isProd() {
    return (process.env.NODE_ENV || 'development') === 'production';
  },
};

