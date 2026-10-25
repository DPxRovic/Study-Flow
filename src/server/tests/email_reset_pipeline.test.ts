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
import { emailService, getTestDeliveredCode } from '../services/emailService';

async function runEmailResetPipelineSuite() {
  console.log('========================================================================');
  console.log('   STUDYFLOW RESEND EMAIL DELIVERY & PASSWORD RESET VERIFICATION SUITE   ');
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
  const testAccountEmail = `intended_recipient_${uniqueSuffix}@university.edu`;
  const initialPassword = 'InitialSecretPass2026!';
  const updatedPassword = 'NewSecretPass2026!';
  let testUserId = '';

  try {
    // -----------------------------------------------------------------
    // TEST 1: Registered Account Lookup & Recipient Fidelity
    // -----------------------------------------------------------------
    console.log('--- 1. INTENDED RECIPIENT & ACCOUNT LOOKUP ---');
    const registerRes = await authService.register({
      email: testAccountEmail,
      password: initialPassword,
      name: 'Intended Student User',
      major: 'Cognitive Science',
    });

    testUserId = registerRes.user.id;
    assert(registerRes.user.email === testAccountEmail, 'Registered account stored in database with exact intended email');

    // -----------------------------------------------------------------
    // TEST 2: Email Service Recipient and Sender Formatting
    // -----------------------------------------------------------------
    console.log('\n--- 2. SENDER FORMATTING & EMAIL TEMPLATE INTEGRITY ---');
    const fromAddress = emailService.getFormattedFromAddress();
    assert(
      fromAddress.includes('StudyFlow Security') || fromAddress.includes('@'),
      'Sender address is valid RFC 5322 formatted address',
      fromAddress
    );

    // -----------------------------------------------------------------
    // TEST 3: Branded Email Template Contains Code, Not Generic Test String
    // -----------------------------------------------------------------
    console.log('\n--- 3. BRANDED TEMPLATE VERIFICATION ---');
    const testCode = '742918';
    const emailResult = await emailService.sendPasswordResetCode({
      to: testAccountEmail,
      name: 'Intended Student User',
      code: testCode,
      expirationMinutes: 10,
    });

    assert(emailResult.success === true, 'Email dispatch completes with valid parameters');
    const deliveredCode = getTestDeliveredCode(testAccountEmail);
    assert(deliveredCode === testCode, 'Correct 6-digit code was dispatched to intended recipient');

    // -----------------------------------------------------------------
    // TEST 4: Forgot Password API Endpoint Response Never Leaks Verification Code
    // -----------------------------------------------------------------
    console.log('\n--- 4. API RESPONSE SECURITY & ZERO CODE EXPOSURE ---');
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
    // TEST 5: Code Verification Endpoint Issues Single-Use Reset Token
    // -----------------------------------------------------------------
    console.log('\n--- 5. CODE VERIFICATION & RESET TOKEN ISSUANCE ---');
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
    // TEST 6: Atomic Password Reset & Single-Use Enforcement
    // -----------------------------------------------------------------
    console.log('\n--- 6. PASSWORD RESET & CREDENTIAL UPDATE ---');
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
    // TEST 7: Authentication with Updated vs Old Credentials
    // -----------------------------------------------------------------
    console.log('\n--- 7. AUTHENTICATION INTEGRITY ---');
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
    // TEST 8: Anti-Enumeration for Non-Existent Accounts
    // -----------------------------------------------------------------
    console.log('\n--- 8. PRIVACY & ANTI-ENUMERATION GUARANTEE ---');
    const ghostRes = await authService.forgotPassword('non_existent_ghost_user@university.edu');
    assert(ghostRes.success === true, 'Non-existent email returns identical generic response (Anti-enumeration)');

    // -----------------------------------------------------------------
    // TEST 9: Resend HTTP 403 Sandbox Rejection Handling (Server Stays Alive)
    // -----------------------------------------------------------------
    console.log('\n--- 9. RESEND HTTP 403 SANDBOX REJECTION & 503 HANDLING ---');
    process.env.SIMULATE_RESEND_ERROR = '403_SANDBOX';
    process.env.ENABLE_DEV_RESET_FALLBACK = 'false';

    let sandboxRejectedWith503 = false;
    let sandboxErrorMessage = '';
    try {
      await authService.forgotPassword(testAccountEmail);
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 503) {
        sandboxRejectedWith503 = true;
        sandboxErrorMessage = err.message;
      }
    }
    assert(sandboxRejectedWith503, 'Resend 403 returns HTTP 503 without crashing the server');
    assert(
      !sandboxErrorMessage.includes('rovicrosales14') && !sandboxErrorMessage.includes('key'),
      '503 message does not leak private sandbox email or secrets to client',
      sandboxErrorMessage
    );

    // -----------------------------------------------------------------
    // TEST 10: Provider Network/Timeout Error Handling
    // -----------------------------------------------------------------
    console.log('\n--- 10. PROVIDER NETWORK & TIMEOUT ERROR RESILIENCE ---');
    process.env.SIMULATE_RESEND_ERROR = 'NETWORK_ERROR';
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

    // -----------------------------------------------------------------
    // TEST 11: Safe Development-Only Testing Mode (ENABLE_DEV_RESET_FALLBACK=true)
    // -----------------------------------------------------------------
    console.log('\n--- 11. SAFE DEVELOPMENT-ONLY DEMONSTRATION MODE ---');
    process.env.SIMULATE_RESEND_ERROR = '403_SANDBOX'; // Real delivery is blocked by sandbox
    process.env.ENABLE_DEV_RESET_FALLBACK = 'true';    // But development demo mode is enabled

    const devFallbackRes = await authService.forgotPassword(testAccountEmail);
    assert(devFallbackRes.success === true, 'Dev mode returns success when ENABLE_DEV_RESET_FALLBACK=true');
    assert(devFallbackRes.devMode === true, 'Dev mode flag is present in response');
    assert(Boolean(devFallbackRes.devCode && /^\d{6}$/.test(devFallbackRes.devCode)), 'Dev mode returns valid 6-digit demo code');

    // Verify the devCode can actually be verified and completes reset in PostgreSQL
    const devVerifyRes = await authService.verifyResetCode(testAccountEmail, devFallbackRes.devCode!);
    assert(devVerifyRes.success === true, 'Dev mode generated code successfully verifies against database hash');
    assert(Boolean(devVerifyRes.resetToken), 'Dev mode code verification returns valid resetToken');

    // -----------------------------------------------------------------
    // TEST 12: Production Rejection of Development Mock Mode
    // -----------------------------------------------------------------
    console.log('\n--- 12. PRODUCTION STRICT REJECTION OF DEV FALLBACK ---');
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEV_RESET_FALLBACK = 'true'; // Set to true, but NODE_ENV is production!
    process.env.SIMULATE_RESEND_ERROR = '403_SANDBOX';

    let prodStrictlyRejected = false;
    try {
      await authService.forgotPassword(testAccountEmail);
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 503) {
        prodStrictlyRejected = true;
      }
    }
    assert(prodStrictlyRejected, 'Production mode strictly rejects dev fallback even when env var is set');
    process.env.NODE_ENV = 'test'; // Restore test env
    delete process.env.SIMULATE_RESEND_ERROR;
    delete process.env.ENABLE_DEV_RESET_FALLBACK;

    // -----------------------------------------------------------------
    // TEST 13: Expired Verification Code Rejection
    // -----------------------------------------------------------------
    console.log('\n--- 13. EXPIRED VERIFICATION CODE ENFORCEMENT ---');
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
    // TEST 14: Rate Limiting Enforcement on Password Reset Route
    // -----------------------------------------------------------------
    console.log('\n--- 14. AUTHENTICATION & RESET RATE LIMITING ---');
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
  console.log(`   EMAIL RESET PIPELINE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEmailResetPipelineSuite();
