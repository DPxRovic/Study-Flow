/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Resend } from 'resend';

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
  isSandboxRestriction?: boolean;
  sandboxAllowedRecipient?: string;
  simulated?: boolean;
}

// In-memory capture for automated testing only (gated strictly to non-production environments)
const testDeliveredCodes = new Map<string, { code: string; timestamp: number }>();
let lastSendPayload: any = null;

/**
 * Builds the production-ready responsive HTML template for StudyFlow password reset verification
 */
function renderPasswordResetHtml(params: { name: string; code: string; expirationMinutes: number }): string {
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
function renderPasswordResetText(params: { name: string; code: string; expirationMinutes: number }): string {
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
   * Formats and validates the RFC 5322 'from' address
   */
  getFormattedFromAddress(): string {
    const rawFrom = process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev';
    if (rawFrom.includes('<') && rawFrom.includes('>')) {
      return rawFrom;
    }
    return `StudyFlow Security <${rawFrom}>`;
  },

  /**
   * Sends a 6-digit verification code to the user's registered account email via Resend.
   */
  async sendPasswordResetCode(params: SendPasswordResetCodeParams): Promise<EmailServiceResult> {
    const { to, name, code, expirationMinutes = 10 } = params;
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const fromAddress = this.getFormattedFromAddress();

    // Build official Resend SDK template-send payload
    // Mutually exclusive: strictly omits html, text, and react when template is specified
    const templateId = process.env.RESEND_TEMPLATE_ID?.trim() || 'password-reset';
    const sendPayload: any = {
      from: fromAddress,
      to: [to],
      subject: `Your StudyFlow password reset code: ${code}`,
      template: {
        id: templateId,
        variables: {
          RESET_CODE: code,
          EXPIRY_MINUTES: expirationMinutes,
        },
      },
    };

    // Store in test storage strictly for automated unit tests in test/dev environments
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      testDeliveredCodes.set(to.toLowerCase(), {
        code,
        timestamp: Date.now(),
      });
      lastSendPayload = JSON.parse(JSON.stringify(sendPayload));
    }

    // In automated unit tests, allow controlled simulation of provider responses
    if (process.env.NODE_ENV === 'test' && process.env.TEST_REAL_RESEND !== 'true') {
      if (process.env.SIMULATE_RESEND_ERROR === '403_SANDBOX') {
        return {
          success: false,
          statusCode: 403,
          isSandboxRestriction: true,
          error: 'You can only send testing emails to your own email address (sandbox@resend.dev). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain.',
        };
      }
      if (process.env.SIMULATE_RESEND_ERROR === 'NETWORK_ERROR') {
        return {
          success: false,
          statusCode: 503,
          error: 'Provider network timeout or connection reset.',
        };
      }
      return {
        success: true,
        simulated: true,
        messageId: `sim_test_${Date.now()}`,
      };
    }

    // 1. Validate API Key configuration
    if (!apiKey) {
      console.warn(
        '[EmailService] RESEND_API_KEY is not configured in server environment. Real email dispatch cannot proceed.'
      );
      return {
        success: false,
        error: 'Email delivery service is not configured. Missing RESEND_API_KEY.',
      };
    }

    // 3. Dispatch through official Resend SDK with responsive AbortController timeout (5000ms)
    // Safely intercept Resend SDK's internal console.error logger to convert provider 403/validation rejections
    // into standard diagnostic warnings, preventing false unhandled exception alerts in server watchers.
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].includes('[Resend API Error]')) {
        console.warn('[EmailService Diagnostic] Provider rejection handled safely:', args[1]?.error?.message || args[1] || args[0]);
        return;
      }
      originalConsoleError.apply(console, args);
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 5000);

    try {
      const resend = new Resend(apiKey);

      const { data, error } = await resend.emails.send(sendPayload, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (error) {
        const statusCode = (error as any).statusCode || (error as any).status || 403;
        const errorMessage = error.message || 'Email delivery failed with provider error.';

        // Detect Resend Testing Sandbox restriction
        const isSandboxRestriction = Boolean(
          errorMessage.includes('You can only send testing emails to your own email address') ||
          errorMessage.includes('testing emails to your own email address') ||
          errorMessage.includes('verify a domain at resend.com/domains')
        );

        let sandboxAllowedRecipient: string | undefined;
        if (isSandboxRestriction) {
          const match = errorMessage.match(/own email address \(([^)]+)\)/);
          if (match && match[1]) {
            sandboxAllowedRecipient = match[1];
          }
          console.warn(
            `[EmailService] Resend Sandbox Restriction (HTTP ${statusCode}): Sender (${fromAddress}) cannot deliver to external recipients in sandbox mode. Verify domain at resend.com/domains and set RESEND_FROM_EMAIL.`
          );
        } else {
          console.warn(`[EmailService] Resend API rejected message dispatch (Status ${statusCode}): ${errorMessage}`);
        }

        return {
          success: false,
          error: errorMessage,
          statusCode,
          isSandboxRestriction,
          sandboxAllowedRecipient,
        };
      }

      // Confirmed provider acceptance (Resend assigned a message ID)
      return {
        success: true,
        messageId: data?.id,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err?.name === 'AbortError' || err?.message?.toLowerCase().includes('abort');
      const errorMessage = isAbort
        ? 'Resend API dispatch timed out after 5000ms.'
        : err?.message || 'Unexpected failure while sending reset email.';
      console.warn('[EmailService] Dispatch error:', errorMessage);
      return {
        success: false,
        statusCode: 503,
        error: errorMessage,
      };
    } finally {
      console.error = originalConsoleError;
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
