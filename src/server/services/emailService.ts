/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config';

export interface SendPasswordResetCodeParams {
  to: string;
  name: string;
  code: string;
  expirationMinutes?: number;
}

export interface EmailServiceResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
  simulated?: boolean;
}

// In-memory capture for automated testing only (gated strictly to non-production environments)
const testDeliveredCodes = new Map<string, { code: string; timestamp: number }>();
let lastSendPayload: any = null;

// Mock transporter override for unit/integration tests
let mockTransporter: Transporter | null = null;

/**
 * Builds the production-ready responsive HTML template for StudyFlow password reset verification.
 * Retains complete StudyFlow branding, academic security badge, 6-digit code box, expiration instructions, and security notice.
 */
export function renderPasswordResetHtml(params: { name: string; code: string; expirationMinutes: number }): string {
  const { name, code, expirationMinutes } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your StudyFlow Password Reset Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 32px 16px;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 520px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
      padding: 32px 32px 28px 32px;
      text-align: center;
      border-bottom: 2px solid #0284c7;
    }
    .brand-badge {
      display: inline-block;
      background: rgba(2, 132, 199, 0.2);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 9999px;
      padding: 4px 14px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #38bdf8;
      margin-bottom: 12px;
    }
    .header h1 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 6px 0;
      letter-spacing: -0.5px;
    }
    .header p {
      color: #94a3b8;
      font-size: 13px;
      margin: 0;
      font-weight: 500;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .text {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 24px 0;
    }
    .code-container {
      background: #f0f9ff;
      border: 2px dashed #0284c7;
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      margin: 24px 0;
    }
    .code-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #0284c7;
      margin-bottom: 8px;
    }
    .code-value {
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 12px;
      color: #0369a1;
      padding-left: 12px;
      margin: 0;
      line-height: 1.2;
    }
    .code-expiry {
      display: inline-block;
      margin-top: 10px;
      font-size: 12px;
      font-weight: 600;
      color: #0369a1;
      background: #e0f2fe;
      padding: 3px 10px;
      border-radius: 6px;
    }
    .advisory-box {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 14px 16px;
      border-radius: 0 8px 8px 0;
      margin: 24px 0;
    }
    .advisory-title {
      font-size: 12px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 4px;
    }
    .advisory-text {
      font-size: 12px;
      line-height: 1.5;
      color: #b45309;
      margin: 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 32px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .footer p {
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand-badge">Academic Security</div>
      <h1>StudyFlow Academic Planner</h1>
      <p>Password Reset Verification Request</p>
    </div>

    <div class="content">
      <p class="greeting">Hello ${name || 'Student'},</p>
      <p class="text">
        We received a request to reset the password for your StudyFlow academic planner account.
        Please enter the six-digit verification code below to authorize your password update.
      </p>

      <div class="code-container">
        <div class="code-label">Verification Code</div>
        <div class="code-value">${code}</div>
        <div class="code-expiry">Expires in ${expirationMinutes} minutes</div>
      </div>

      <p class="text">
        Enter this code into the StudyFlow verification window to proceed with setting a new password.
        This single-use code can only be used once.
      </p>

      <div class="advisory-box">
        <div class="advisory-title">Security Notice</div>
        <div class="advisory-text">
          If you did not initiate this password reset request, someone may have entered your email by mistake.
          Your account password remains completely unchanged and secure. Never forward or share this code with anyone.
          StudyFlow staff will never ask for your verification code.
        </div>
      </div>
    </div>

    <div class="footer">
      <p>StudyFlow — Student Study Planner & Assignment Scheduler</p>
      <p style="margin-top: 4px; font-size: 11px;">This is an automated security transmission. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds the plain-text fallback representation of the password reset email
 */
export function renderPasswordResetText(params: { name: string; code: string; expirationMinutes: number }): string {
  const { name, code, expirationMinutes } = params;

  return `StudyFlow Academic Planner — Password Reset Request

Hello ${name || 'Student'},

We received a request to reset the password for your StudyFlow account.

YOUR 6-DIGIT VERIFICATION CODE:
----------------------------------------
${code}
----------------------------------------

This code expires in ${expirationMinutes} minutes and can only be used once.

Enter this code into the StudyFlow password reset window to choose a new password.

SECURITY NOTICE:
If you did not request this password reset, please disregard this email. Your account remains completely secure and your password has not been changed. Never share this code with anyone. StudyFlow staff will never request your verification code.

— StudyFlow Academic Workspace
`;
}

export const emailService = {
  /**
   * Retrieves the configured Gmail/SMTP sender credentials without leaking them to client responses or logs
   */
  getSmtpCredentials(): { user: string; pass: string; fromName: string } {
    const rawUser = process.env.GMAIL_USER ?? process.env.SMTP_USER ?? config.gmailUser ?? '';
    const rawPass = process.env.GMAIL_APP_PASSWORD ?? process.env.SMTP_PASS ?? config.gmailAppPassword ?? '';
    const rawFromName = process.env.SMTP_FROM_NAME ?? config.smtpFromName ?? 'StudyFlow Academic Planner';

    const user = rawUser.trim();
    // Sanitize app password: strip all spaces because Google generates app passwords in 4-character chunks: "xxxx xxxx xxxx xxxx"
    const pass = rawPass.trim().replace(/\s+/g, '');
    const fromName = rawFromName.trim();

    return { user, pass, fromName };
  },

  /**
   * Formats the RFC 5322 'from' address using the authenticated Gmail address and configured display name.
   * Prevents arbitrary sender spoofing by using the authenticated account.
   */
  getFormattedFromAddress(): string {
    const { user, fromName } = this.getSmtpCredentials();
    const safeUser = user || 'no-reply@studyflow.internal';
    return `"${fromName}" <${safeUser}>`;
  },

  /**
   * Creates a Nodemailer transporter configured for Gmail SMTP (smtp.gmail.com:465 SSL).
   * Strictly enforces TLS certificate verification (rejectUnauthorized: true).
   */
  createTransporter(): Transporter {
    if (mockTransporter) {
      return mockTransporter;
    }

    const { user, pass } = this.getSmtpCredentials();

    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Port 465 uses SSL/TLS directly
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: true, // Never disable TLS certificate verification
      },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 5000,
    });
  },

  /**
   * Allows injecting a custom or mock transporter for automated unit and integration tests.
   */
  setMockTransporter(transporter: Transporter | null): void {
    mockTransporter = transporter;
  },

  /**
   * Sends a 6-digit verification code to the user's registered account email via Gmail SMTP.
   * Dispatches both rich HTML and plain-text templates to ensure universal client compatibility.
   */
  async sendPasswordResetCode(params: SendPasswordResetCodeParams): Promise<EmailServiceResult> {
    const { to, name, code, expirationMinutes = 10 } = params;
    const { user, pass } = this.getSmtpCredentials();
    const fromAddress = this.getFormattedFromAddress();

    // Store in test storage strictly for automated unit tests in test/dev environments
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      testDeliveredCodes.set(to.toLowerCase(), {
        code,
        timestamp: Date.now(),
      });
      lastSendPayload = {
        from: fromAddress,
        to,
        code,
        expirationMinutes,
      };
    }

    // Controlled simulation of provider responses for automated unit tests without outbound network
    if (
      (process.env.NODE_ENV === 'test' ||
        process.env.SIMULATE_SMTP_AUTH_ERROR === 'true' ||
        process.env.SIMULATE_SMTP_NETWORK_ERROR === 'true') &&
      process.env.TEST_REAL_SMTP !== 'true'
    ) {
      if (process.env.SIMULATE_SMTP_AUTH_ERROR === 'true') {
        return {
          success: false,
          statusCode: 401,
          error: 'Invalid login: 535-5.7.8 Username and Password not accepted. Learn more at https://support.google.com/mail/?p=BadCredentials',
        };
      }
      if (process.env.SIMULATE_SMTP_NETWORK_ERROR === 'true') {
        return {
          success: false,
          statusCode: 503,
          error: 'Connection timeout while connecting to smtp.gmail.com:465',
        };
      }
      // If mock transporter was explicitly injected, allow it to execute
      if (!mockTransporter) {
        return {
          success: true,
          simulated: true,
          messageId: `smtp_sim_${Date.now()}`,
        };
      }
    }

    // 1. Validate required SMTP configuration at runtime boundary
    if (!user || !pass) {
      console.warn(
        '[EmailService] Gmail SMTP credentials are not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in environment.'
      );
      return {
        success: false,
        error: 'Email delivery service is not configured. Missing GMAIL_USER or GMAIL_APP_PASSWORD.',
      };
    }

    // 2. Render templates
    const html = renderPasswordResetHtml({ name, code, expirationMinutes });
    const text = renderPasswordResetText({ name, code, expirationMinutes });

    // 3. Dispatch email through Nodemailer with bounded timeout race
    try {
      const transporter = this.createTransporter();

      const sendPromise = transporter.sendMail({
        from: fromAddress,
        to,
        subject: `Your StudyFlow password reset code: ${code}`,
        text,
        html,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('SMTP dispatch timed out after 5000ms while connecting to smtp.gmail.com:465')),
          5000
        )
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);

      console.log(`[EmailService] Password reset email dispatched via Gmail SMTP to: ${to}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown SMTP error during message transmission';
      const isAuthError =
        errorMessage.includes('535') ||
        errorMessage.includes('534') ||
        errorMessage.includes('5.7.9') ||
        errorMessage.includes('5.7.8') ||
        errorMessage.includes('Application-specific password required') ||
        errorMessage.includes('InvalidSecondFactor') ||
        errorMessage.includes('BadCredentials') ||
        errorMessage.includes('Username and Password not accepted') ||
        errorMessage.includes('EAUTH');

      const isConnectionError =
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ESOCKET') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ECONNRESET');

      const statusCode = isAuthError ? 401 : isConnectionError ? 503 : 500;

      // Provide actionable diagnostic if Google rejects standard account password
      if (
        errorMessage.includes('534') ||
        errorMessage.includes('Application-specific password required') ||
        errorMessage.includes('InvalidSecondFactor')
      ) {
        console.warn(
          `[EmailService] Gmail SMTP authentication failed (status 401): Google requires a 16-character App Password for GMAIL_APP_PASSWORD. ` +
          `Standard Google account passwords are not accepted. Generate one at https://myaccount.google.com/apppasswords`
        );
      } else {
        // Log clean diagnostic without exposing passwords, codes, or secrets
        console.warn(`[EmailService] Gmail SMTP dispatch failed (status ${statusCode}):`, errorMessage);
      }

      return {
        success: false,
        statusCode,
        error: errorMessage,
      };
    }
  },

  /**
   * Helper to verify Gmail SMTP connection and credentials at server startup or on health checks
   */
  async verifySmtpConnection(): Promise<{ ok: boolean; message: string }> {
    const { user, pass } = this.getSmtpCredentials();
    if (!user || !pass) {
      return {
        ok: false,
        message: 'Gmail SMTP credentials are not set (GMAIL_USER or GMAIL_APP_PASSWORD missing).',
      };
    }

    try {
      const transporter = this.createTransporter();
      await transporter.verify();
      return {
        ok: true,
        message: 'Gmail SMTP connection verified successfully.',
      };
    } catch (err: any) {
      return {
        ok: false,
        message: `Gmail SMTP verification failed: ${err?.message || err}`,
      };
    }
  },

  /**
   * Helper for automated test verification in test environments.
   * Gated strictly so it is unavailable in production.
   */
  getTestDeliveredCode(email: string): string | null {
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
    const entry = testDeliveredCodes.get(email.toLowerCase());
    return entry ? entry.code : null;
  },

  /**
   * Helper for automated test verification in test environments.
   * Gated strictly so it is unavailable in production.
   */
  getLastSendPayload(): any {
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
    return lastSendPayload;
  },

  /**
   * Clear test delivery cache
   */
  clearTestDeliveredCodes(): void {
    testDeliveredCodes.clear();
    lastSendPayload = null;
  },
};

export const getTestDeliveredCode = emailService.getTestDeliveredCode.bind(emailService);
export const clearTestDeliveredCodes = emailService.clearTestDeliveredCodes.bind(emailService);
export const getLastSendPayload = emailService.getLastSendPayload.bind(emailService);
