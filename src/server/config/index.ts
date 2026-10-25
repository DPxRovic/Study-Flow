/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ServerConfig {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  env: string;
  appName: string;
  resendApiKey: string;
  resendFromEmail: string;
  enableDevResetFallback: boolean;
  showDevResetCodeInUi: boolean;
  isProd: boolean;
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
    jwtSecret = 'studyflow_academic_jwt_dev_secret_fall_2026';
  }
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: databaseUrl || '',
  jwtSecret,
  jwtExpiresIn: '7d',
  env: nodeEnv,
  appName: 'StudyFlow Academic Planner',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'StudyFlow <onboarding@resend.dev>',
  enableDevResetFallback: !isProd && process.env.ENABLE_DEV_RESET_FALLBACK === 'true',
  showDevResetCodeInUi:
    !isProd &&
    process.env.ENABLE_DEV_RESET_FALLBACK === 'true' &&
    process.env.SHOW_DEV_RESET_CODE_IN_UI === 'true',
  isProd,
};
