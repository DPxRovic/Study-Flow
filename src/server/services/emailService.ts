/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Resend } from 'resend';

export interface SendPasswordResetCodeParams {
  to: string;
  name: string;
  code: string;
}

export interface EmailServiceResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

// In-memory capture for automated testing and local verification
const testDeliveredCodes = new Map<string, { code: string; timestamp: number }>();

export const emailService = {
  /**
   * Sends a 6-digit verification code to the user's university email via Resend.
   */
  async sendPasswordResetCode(params: SendPasswordResetCodeParams): Promise<EmailServiceResult> {
    const { to, name, code } = params;
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'StudyFlow Security <onboarding@resend.dev>';

    // Store in test storage for test verification hooks
    testDeliveredCodes.set(to.toLowerCase(), {
      code,
      timestamp: Date.now(),
    });

    if (!apiKey || apiKey.trim() === '') {
      // In development or test, handle gracefully while alerting developer
      if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
        console.log(
          `[EmailService:Dev] Simulated delivery to ${to}. Set RESEND_API_KEY in .env to send real emails via Resend.`
        );
        return {
          success: true,
          simulated: true,
          messageId: `sim_${Date.now()}`,
        };
      }

      console.error(
        '[EmailService] RESEND_API_KEY is not configured in production environment. Cannot send reset email.'
      );
      return {
        success: false,
        error:
          'Email delivery service is currently not configured. Please contact university support.',
      };
    }

    try {
      const resend = new Resend(apiKey);
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .card { background-color: #ffffff; max-width: 480px; margin: 0 auto; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 12px; margin-bottom: 8px; }
    .desc { font-size: 14px; color: #475569; line-height: 1.5; margin: 0; }
    .code-box { background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; text-align: center; padding: 20px; margin: 28px 0; }
    .code { font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0369a1; }
    .warning { font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 16px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">StudyFlow Academic Planner</div>
      <h1 class="title">Password Reset Verification</h1>
      <p class="desc">Hello ${name || 'Student'}, we received a request to reset your StudyFlow account password.</p>
    </div>
    
    <div class="code-box">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #0284c7; margin-bottom: 6px; letter-spacing: 1px;">Your 6-Digit Security Code</div>
      <div class="code">${code}</div>
    </div>

    <p class="desc">
      Enter this 6-digit code in the StudyFlow verification window. This code expires in <strong>10 minutes</strong> and can only be used once.
    </p>

    <div class="warning">
      If you did not request a password reset, please disregard this email or notify your campus IT administration immediately. Your password remains unchanged until this code is verified.
    </div>
  </div>
</body>
</html>
      `;

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: `${code} is your StudyFlow verification code`,
        html: emailHtml,
        text: `Hello ${name || 'Student'},\n\nYour StudyFlow password reset verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this reset, please ignore this email.`,
      });

      if (error) {
        console.error('[EmailService] Resend API error:', error.message);
        return {
          success: false,
          error: error.message || 'Email delivery failed.',
        };
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (err: any) {
      console.error('[EmailService] Unexpected delivery failure:', err?.message);
      return {
        success: false,
        error: err?.message || 'Unexpected failure while sending reset email.',
      };
    }
  },

  /**
   * Helper for automated test verification in test environments
   */
  getTestDeliveredCode(email: string): string | null {
    const entry = testDeliveredCodes.get(email.toLowerCase());
    return entry ? entry.code : null;
  },

  /**
   * Clear test delivery cache
   */
  clearTestDeliveredCodes(): void {
    testDeliveredCodes.clear();
  },
};

export const getTestDeliveredCode = emailService.getTestDeliveredCode.bind(emailService);
export const clearTestDeliveredCodes = emailService.clearTestDeliveredCodes.bind(emailService);

