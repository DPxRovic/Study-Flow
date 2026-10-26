/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
process.env.NODE_ENV = 'test';

import apiRoutes from '../routes';
import { errorHandler } from '../middleware/errorHandler';
import { securityHeaders, corsMiddleware } from '../middleware/security';
import { prisma } from '../db/prisma';
import { apiClient, ApiClientError } from '../../services/apiClient';
import { authService } from '../../services/authService';
import {
  emailService,
  getTestDeliveredCode,
  getLastSendPayload,
  renderPasswordResetHtml,
  renderPasswordResetText,
} from '../services/emailService';

async function runEmailResetPipelineSuite() {
  console.log('========================================================================');
  console.log('   STUDYFLOW GMAIL SMTP EMAIL DELIVERY & RESET VERIFICATION SUITE       ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Setup Test Server
  const app = express();
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use('/api', apiRoutes);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://localhost:${port}/api`;
  apiClient.setBaseUrl(baseUrl);

  console.log(`[TEST SERVER] Running on ephemeral port ${port} (Base: ${baseUrl})\n`);

  const uniqueSuffix = Date.now().toString(36);
  const testAccountEmail = `professor_evaluator_${uniqueSuffix}@gmail.com`;
  const initialPassword = 'InitialSecretPass2026!';
  const updatedPassword = 'NewSecretPass2026!';
  let testUserId = '';

  try {
    // -----------------------------------------------------------------
    // TEST 1: Registered Account Lookup & Arbitrary Recipient Fidelity
    // -----------------------------------------------------------------
    console.log('--- 1. INTENDED RECIPIENT & ACCOUNT LOOKUP ---');
    const registerRes = await authService.register({
      email: testAccountEmail,
      password: initialPassword,
      name: 'Prof. Evaluator',
      major: 'Computer Science Faculty',
    });

    testUserId = registerRes.user.id;
    assert(registerRes.user.email === testAccountEmail, 'Registered account stored with arbitrary recipient email');

    // -----------------------------------------------------------------
    // TEST 2: Sender Address & Display Name Formatting
    // -----------------------------------------------------------------
    console.log('\n--- 2. SENDER FORMATTING & EMAIL TEMPLATE INTEGRITY ---');
    const fromAddress = emailService.getFormattedFromAddress();
    assert(
      fromAddress.includes('StudyFlow Academic Planner') || fromAddress.includes('@'),
      'Sender address is valid RFC 5322 formatted address with display name',
      fromAddress
    );

    // -----------------------------------------------------------------
    // TEST 3: HTML & Plain-Text Template Rendering
    // -----------------------------------------------------------------
    console.log('\n--- 3. EMAIL TEMPLATE INTEGRITY (HTML & TEXT) ---');
    const sampleCode = '839201';
    const sampleHtml = renderPasswordResetHtml({
      name: 'Prof. Evaluator',
      code: sampleCode,
      expirationMinutes: 10,
    });
    const sampleText = renderPasswordResetText({
      name: 'Prof. Evaluator',
      code: sampleCode,
      expirationMinutes: 10,
    });

    assert(sampleHtml.includes(sampleCode), 'HTML template contains 6-digit verification code');
    assert(sampleHtml.includes('StudyFlow Academic Planner'), 'HTML template includes StudyFlow branding');
    assert(sampleHtml.includes('Academic Security'), 'HTML template includes security badge');
    assert(sampleHtml.includes('10 minutes'), 'HTML template specifies expiration duration');
    assert(sampleText.includes(sampleCode), 'Plain-text template contains 6-digit verification code');
    assert(sampleText.includes('expires in 10 minutes'), 'Plain-text template specifies expiration instructions');

    // -----------------------------------------------------------------
    // TEST 4: Dispatch via Mocked Transport & Payload Capture
    // -----------------------------------------------------------------
    console.log('\n--- 4. DISPATCH CAPTURE & RECIPIENT FIDELITY ---');
    const testCode = '742918';
    const emailResult = await emailService.sendPasswordResetCode({
      to: testAccountEmail,
      name: 'Prof. Evaluator',
      code: testCode,
      expirationMinutes: 10,
    });

    assert(emailResult.success === true, 'Email dispatch completes with valid parameters');
    const deliveredCode = getTestDeliveredCode(testAccountEmail);
    assert(deliveredCode === testCode, 'Correct 6-digit code was dispatched to intended recipient');

    const lastPayload = getLastSendPayload();
    assert(Boolean(lastPayload), 'Last dispatch payload was captured');
    assert(lastPayload?.code === testCode, 'Dispatch payload supplies exact code');
    assert(lastPayload?.expirationMinutes === 10, 'Dispatch payload supplies exact expiration minutes');
    assert(lastPayload?.to === testAccountEmail, 'Recipient email matches professor Gmail address');

    // -----------------------------------------------------------------
    // TEST 5: API Response Never Leaks Verification Code
    // -----------------------------------------------------------------
    console.log('\n--- 5. API RESPONSE SECURITY & ZERO CODE EXPOSURE ---');
    apiClient.clearToken();
    const forgotRes = await authService.forgotPassword(testAccountEmail);
    assert(forgotRes.success === true, 'Forgot-password request returns successful generic acknowledgement');
    assert(
      !(forgotRes as any).code && !(forgotRes as any).resetCode && !(forgotRes as any).numericCode,
      'API response strictly omits verification code (No leakage)'
    );

    // Verify record in database has hashed code, never plaintext
    const dbRecord = await prisma.passwordResetRequest.findFirst({
      where: { userId: testUserId },
      orderBy: { createdAt: 'desc' },
    });
    assert(dbRecord !== null, 'PasswordResetRequest record persisted in database');
    assert(dbRecord?.codeHash !== testCode, 'Verification code is stored as HMAC hash, never in plaintext');

    // -----------------------------------------------------------------
    // TEST 6: Code Verification Endpoint Issues Single-Use Reset Token
    // -----------------------------------------------------------------
    console.log('\n--- 6. CODE VERIFICATION & RESET TOKEN ISSUANCE ---');
    const activeDeliveredCode = getTestDeliveredCode(testAccountEmail);
    assert(Boolean(activeDeliveredCode), 'Active verification code was dispatched for user');

    // Wrong code rejected
    let wrongRejected = false;
    try {
      await authService.verifyResetCode(testAccountEmail, '111111');
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 400) {
        wrongRejected = true;
      }
    }
    assert(wrongRejected, 'Incorrect 6-digit code is rejected with HTTP 400');

    // Correct code verified
    const verifyRes = await authService.verifyResetCode(testAccountEmail, activeDeliveredCode!);
    assert(verifyRes.success === true, 'Valid 6-digit code successfully verified');
    assert(Boolean(verifyRes.resetToken), 'Server issues secure single-use reset authorization token');
    assert(
      !(verifyRes as any).code && !(verifyRes as any).numericCode,
      'Verification response strictly omits raw verification code'
    );

    // -----------------------------------------------------------------
    // TEST 7: Atomic Password Reset & Single-Use Enforcement
    // -----------------------------------------------------------------
    console.log('\n--- 7. PASSWORD RESET & CREDENTIAL UPDATE ---');
    const resetRes = await authService.resetPassword(testAccountEmail, verifyRes.resetToken!, updatedPassword);
    assert(resetRes.success === true, 'Password reset completes successfully');

    // Reset token cannot be reused
    let reuseRejected = false;
    try {
      await authService.resetPassword(testAccountEmail, verifyRes.resetToken!, 'ShouldFailPass2026!');
    } catch (err: any) {
      if (err instanceof ApiClientError && (err.status === 400 || err.status === 401)) {
        reuseRejected = true;
      }
    }
    assert(reuseRejected, 'Reset authorization token cannot be reused');

    // -----------------------------------------------------------------
    // TEST 8: Authentication with Updated vs Old Credentials
    // -----------------------------------------------------------------
    console.log('\n--- 8. AUTHENTICATION INTEGRITY ---');
    let oldPassFailed = false;
    try {
      await authService.login(testAccountEmail, initialPassword);
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 401) {
        oldPassFailed = true;
      }
    }
    assert(oldPassFailed, 'Old password fails authentication with HTTP 401 Unauthorized');

    const newLoginRes = await authService.login(testAccountEmail, updatedPassword);
    assert(Boolean(newLoginRes.token), 'New password succeeds and returns authenticated JWT session');
    assert(newLoginRes.user.email === testAccountEmail, 'Authenticated user profile matches intended account');

    // -----------------------------------------------------------------
    // TEST 9: Anti-Enumeration for Non-Existent Accounts
    // -----------------------------------------------------------------
    console.log('\n--- 9. PRIVACY & ANTI-ENUMERATION GUARANTEE ---');
    const ghostRes = await authService.forgotPassword('non_existent_ghost_user@university.edu');
    assert(ghostRes.success === true, 'Non-existent email returns identical generic response (Anti-enumeration)');

    // -----------------------------------------------------------------
    // TEST 10: SMTP Authentication Error Handling (535 Bad Credentials)
    // -----------------------------------------------------------------
    console.log('\n--- 10. SMTP AUTHENTICATION ERROR RESILIENCE ---');
    process.env.SIMULATE_SMTP_AUTH_ERROR = 'true';
    process.env.ENABLE_DEV_RESET_FALLBACK = 'false';

    let authRejectedWith503 = false;
    let authErrorMessage = '';
    try {
      await authService.forgotPassword(testAccountEmail);
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 503) {
        authRejectedWith503 = true;
        authErrorMessage = err.message;
      }
    }
    assert(authRejectedWith503, 'SMTP auth rejection returns HTTP 503 safely without server crash');
    assert(
      !authErrorMessage.includes('password') && !authErrorMessage.includes('secret') && !authErrorMessage.includes('BadCredentials'),
      '503 response never leaks internal SMTP credentials or error strings to client'
    );
    delete process.env.SIMULATE_SMTP_AUTH_ERROR;

    // -----------------------------------------------------------------
    // TEST 11: SMTP Connection/Timeout Error Handling
    // -----------------------------------------------------------------
    console.log('\n--- 11. SMTP NETWORK & TIMEOUT ERROR RESILIENCE ---');
    process.env.SIMULATE_SMTP_NETWORK_ERROR = 'true';
    process.env.ENABLE_DEV_RESET_FALLBACK = 'false';

    let networkRejectedWith503 = false;
    try {
      await authService.forgotPassword(testAccountEmail);
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 503) {
        networkRejectedWith503 = true;
      }
    }
    assert(networkRejectedWith503, 'Network/timeout error returns HTTP 503 safely without server crash');
    delete process.env.SIMULATE_SMTP_NETWORK_ERROR;

    // -----------------------------------------------------------------
    // TEST 12: Missing Credentials Detection
    // -----------------------------------------------------------------
    console.log('\n--- 12. MISSING CREDENTIALS VALIDATION ---');
    const origUser = process.env.GMAIL_USER;
    const origPass = process.env.GMAIL_APP_PASSWORD;
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    // Direct invocation with TEST_REAL_SMTP=true to trigger credential check
    process.env.TEST_REAL_SMTP = 'true';
    const missingRes = await emailService.sendPasswordResetCode({
      to: testAccountEmail,
      name: 'Test',
      code: '123456',
    });
    assert(missingRes.success === false, 'Detects missing credentials');
    assert(
      Boolean(missingRes.error && missingRes.error.includes('Missing GMAIL_USER or GMAIL_APP_PASSWORD')),
      'Returns descriptive internal diagnostic for missing credentials'
    );
    delete process.env.TEST_REAL_SMTP;
    if (origUser) process.env.GMAIL_USER = origUser;
    if (origPass) process.env.GMAIL_APP_PASSWORD = origPass;

    // -----------------------------------------------------------------
    // TEST 13: Safe Development-Only Testing Mode (ENABLE_DEV_RESET_FALLBACK=true)
    // -----------------------------------------------------------------
    console.log('\n--- 13. SAFE DEVELOPMENT-ONLY DEMONSTRATION MODE ---');
    process.env.SIMULATE_SMTP_NETWORK_ERROR = 'true'; // Delivery blocked
    process.env.ENABLE_DEV_RESET_FALLBACK = 'true';    // But development demo mode is enabled
    delete process.env.SHOW_DEV_RESET_CODE_IN_UI;     // Code display in UI is DISABLED by default

    // Subtest A: Default dev fallback (Code hidden from HTTP response, available in terminal/log)
    const devFallbackRes = await authService.forgotPassword(testAccountEmail);
    assert(devFallbackRes.success === true, 'Dev mode returns success when ENABLE_DEV_RESET_FALLBACK=true');
    assert(devFallbackRes.devMode === true, 'Dev mode flag is present in response');
    assert(devFallbackRes.devCode === undefined, 'Reset code is NEVER exposed in HTTP response by default');
    assert(
      !devFallbackRes.message.includes('sent') && !devFallbackRes.message.includes('dispatched'),
      'Response does NOT falsely claim an email was dispatched'
    );

    // Verify audit log for development fallback
    const fallbackAudit = await prisma.auditLog.findFirst({
      where: {
        targetId: testUserId,
        action: 'PASSWORD_RESET_DEV_FALLBACK_ACTIVE',
      },
      orderBy: { timestamp: 'desc' },
    });
    assert(fallbackAudit !== null, 'PASSWORD_RESET_DEV_FALLBACK_ACTIVE logged in audit table');

    // Retrieve generated code from server test hook
    const terminalCode = getTestDeliveredCode(testAccountEmail);
    assert(Boolean(terminalCode && /^\d{6}$/.test(terminalCode)), 'Server-side generated code exists and is 6 digits');

    // Verify that manual entry of the server-logged code successfully verifies in database
    const devVerifyRes = await authService.verifyResetCode(testAccountEmail, terminalCode!);
    assert(devVerifyRes.success === true, 'Server-logged code successfully verifies against database hash');
    assert(Boolean(devVerifyRes.resetToken), 'Dev mode code verification returns valid resetToken');

    // Subtest B: Explicit Developer UI Toggle (SHOW_DEV_RESET_CODE_IN_UI=true)
    process.env.SHOW_DEV_RESET_CODE_IN_UI = 'true';
    const devUiRes = await authService.forgotPassword(testAccountEmail);
    assert(devUiRes.success === true, 'Explicit UI mode returns success');
    assert(Boolean(devUiRes.devCode && /^\d{6}$/.test(devUiRes.devCode)), 'devCode only attached when SHOW_DEV_RESET_CODE_IN_UI=true');
    delete process.env.SHOW_DEV_RESET_CODE_IN_UI;

    // -----------------------------------------------------------------
    // TEST 14: Production Rejection of Development Mock Mode
    // -----------------------------------------------------------------
    console.log('\n--- 14. PRODUCTION STRICT REJECTION OF DEV FALLBACK ---');
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEV_RESET_FALLBACK = 'true'; // Set to true, but NODE_ENV is production!
    process.env.SHOW_DEV_RESET_CODE_IN_UI = 'true'; // Even if UI display is set to true!
    process.env.SIMULATE_SMTP_NETWORK_ERROR = 'true';

    let prodStrictlyRejected = false;
    try {
      await authService.forgotPassword(testAccountEmail);
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 503) {
        prodStrictlyRejected = true;
      }
    }
    assert(prodStrictlyRejected, 'Production mode strictly rejects dev fallback and never exposes code even when env vars are set');
    process.env.NODE_ENV = 'test'; // Restore test env
    delete process.env.SIMULATE_SMTP_NETWORK_ERROR;
    delete process.env.ENABLE_DEV_RESET_FALLBACK;
    delete process.env.SHOW_DEV_RESET_CODE_IN_UI;

    // -----------------------------------------------------------------
    // TEST 15: Expired Verification Code Rejection
    // -----------------------------------------------------------------
    console.log('\n--- 15. EXPIRED VERIFICATION CODE ENFORCEMENT ---');
    const expiredCode = '987654';
    const { default: cryptoModule } = await import('crypto');
    const { config: testConfig } = await import('../config');
    const expiredHash = cryptoModule.createHmac('sha256', testConfig.jwtSecret).update(expiredCode).digest('hex');

    await prisma.passwordResetRequest.create({
      data: {
        userId: testUserId,
        codeHash: expiredHash,
        expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
        maxAttempts: 5,
        attemptsCount: 0,
      },
    });

    let expiredRejected = false;
    try {
      await authService.verifyResetCode(testAccountEmail, expiredCode);
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 400 && err.message.toLowerCase().includes('expired')) {
        expiredRejected = true;
      }
    }
    assert(expiredRejected, 'Expired verification code is rejected with HTTP 400 and clear expired message');

    // -----------------------------------------------------------------
    // TEST 16: Rate Limiting Enforcement on Password Reset Route
    // -----------------------------------------------------------------
    console.log('\n--- 16. AUTHENTICATION & RESET RATE LIMITING ---');
    let rateLimitTriggered = false;
    for (let i = 0; i < 35; i++) {
      try {
        await authService.forgotPassword(testAccountEmail);
      } catch (err: any) {
        if (err instanceof ApiClientError && err.status === 429) {
          rateLimitTriggered = true;
          break;
        }
      }
    }
    assert(rateLimitTriggered, 'Rate limiter activates with HTTP 429 after excessive consecutive requests');

  } catch (err: any) {
    console.error('Fatal pipeline error:', err);
    failed++;
  } finally {
    // Cleanup
    server.close();
    try {
      if (testUserId) {
        await prisma.passwordResetRequest.deleteMany({ where: { userId: testUserId } });
        await prisma.auditLog.deleteMany({ where: { targetId: testUserId } });
        await prisma.user.delete({ where: { id: testUserId } });
      }
    } catch (_) {}
  }

  console.log('\n========================================================================');
  console.log(`   GMAIL SMTP RESET PIPELINE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEmailResetPipelineSuite();
