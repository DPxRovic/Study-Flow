/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import apiRoutes from '../routes';
import { errorHandler } from '../middleware/errorHandler';
import { securityHeaders, corsMiddleware } from '../middleware/security';
import { prisma, checkDatabaseHealth, disconnectDatabase } from '../db/prisma';
import { getTestDeliveredCode } from '../services/emailService';
import { apiClient, ApiClientError } from '../../services/apiClient';
import { authService } from '../../services/authService';

async function runPersistenceAuditResetSuite() {
  console.log('========================================================================');
  console.log('   STUDYFLOW NEON PERSISTENCE, AUDIT LOGGING & PASSWORD RESET SUITE    ');
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

  // 1. Setup Express Test Server
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

  console.log(`[TEST SERVER] Running on port ${port} pointing to real Neon database\n`);

  let testUserId = '';
  const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  const testEmail = `neon_verify_${uniqueSuffix}@university.edu`;
  const initialPassword = 'InitialPass2026!#';
  const updatedPassword = 'NewSecurePass2026!#';

  try {
    // -------------------------------------------------------------
    // TEST 1: Database Health & Real Neon PostgreSQL Connectivity
    // -------------------------------------------------------------
    console.log('--- 1. DATABASE CONNECTIVITY & TABLE AUDIT ---');
    const health = await checkDatabaseHealth();
    assert(health.ok === true, 'Database health check passes directly against Neon');
    assert(typeof health.latencyMs === 'number' && health.latencyMs > 0, 'Database query returns real latency');

    // Query Neon directly via raw query to verify PostgreSQL identity
    const pgVersion = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version();`;
    assert(pgVersion.length > 0 && pgVersion[0].version.includes('PostgreSQL'), 'Verified connected to real PostgreSQL instance');

    // -------------------------------------------------------------
    // TEST 2: Account Registration & Direct Neon Verification
    // -------------------------------------------------------------
    console.log('\n--- 2. REAL ACCOUNT REGISTRATION & NEON PERSISTENCE ---');
    const registerRes = await authService.register({
      email: testEmail,
      password: initialPassword,
      name: 'Dr. Neon Verification',
    });

    assert(Boolean(registerRes.token), 'Registration returns valid JWT');
    assert(registerRes.user.email === testEmail, 'Registration returns correct user profile');
    testUserId = registerRes.user.id;

    // Directly query Neon table `User`
    const userInDb = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    assert(userInDb !== null, 'Registered user exists directly in Neon `User` table');
    assert(userInDb?.name === 'Dr. Neon Verification', 'User name matches Neon table record');
    assert(userInDb?.passwordHash !== initialPassword, 'Password is securely hashed (never plaintext)');

    // Duplicate registration should fail with 409
    let duplicateRejected = false;
    try {
      await authService.register({
        email: testEmail,
        password: initialPassword,
        name: 'Duplicate Attempt',
      });
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 409) {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, 'Duplicate registration is rejected with HTTP 409 Conflict');

    // -------------------------------------------------------------
    // TEST 3: Neon Audit Log Recording for Registration
    // -------------------------------------------------------------
    console.log('\n--- 3. AUDIT LOGGING IN NEON DATABASE ---');
    const registerAudit = await prisma.auditLog.findFirst({
      where: {
        targetId: testUserId,
        action: 'USER_REGISTER',
      },
      orderBy: { timestamp: 'desc' },
    });
    assert(registerAudit !== null, 'USER_REGISTER event persisted directly in Neon `AuditLog` table');
    assert(registerAudit?.targetType === 'User', 'Audit log targetType is User');

    // -------------------------------------------------------------
    // TEST 4: Clean Account State (No Mock Fallback for New Users)
    // -------------------------------------------------------------
    console.log('\n--- 4. CLEAN DATA ISOLATION (ZERO MOCK FALLBACK) ---');
    apiClient.setToken(registerRes.token!);
    const subjectsRes = await apiClient.get<{ success: boolean; data: any[] }>('/subjects');
    assert(Array.isArray(subjectsRes.data) && subjectsRes.data.length === 0, 'New user has exactly 0 subjects in Neon (no mock fixtures returned)');

    const tasksRes = await apiClient.get<{ success: boolean; data: any[] }>('/tasks');
    assert(Array.isArray(tasksRes.data) && tasksRes.data.length === 0, 'New user has exactly 0 tasks in Neon');

    // -------------------------------------------------------------
    // TEST 5: Password Reset Request & 6-Digit Code Generation
    // -------------------------------------------------------------
    console.log('\n--- 5. 6-DIGIT CODE PASSWORD RESET REQUEST ---');
    apiClient.clearToken();

    const forgotRes = await authService.forgotPassword(testEmail);
    assert(forgotRes.success === true, 'Forgot password request succeeds');

    // Verify record in Neon `PasswordResetRequest` table
    const resetReqInDb = await prisma.passwordResetRequest.findFirst({
      where: { userId: testUserId },
      orderBy: { createdAt: 'desc' },
    });
    assert(resetReqInDb !== null, 'PasswordResetRequest record exists in Neon PostgreSQL');
    assert(resetReqInDb?.usedAt === null, 'PasswordResetRequest is active (usedAt is null)');
    assert(resetReqInDb?.attemptsCount === 0, 'Initial attempt counter is 0');

    // Retrieve generated code from test hook
    const deliveredCode = getTestDeliveredCode(testEmail);
    assert(Boolean(deliveredCode) && /^\d{6}$/.test(deliveredCode!), 'A 6-digit random code was generated and dispatched');
    assert(resetReqInDb?.codeHash !== deliveredCode, 'Code is hashed with HMAC in database, never stored in plain text');

    // Verify audit log for reset request
    const resetReqAudit = await prisma.auditLog.findFirst({
      where: {
        targetId: testUserId,
        action: 'PASSWORD_RESET_REQUESTED',
      },
    });
    assert(resetReqAudit !== null, 'PASSWORD_RESET_REQUESTED logged in Neon audit table');

    // -------------------------------------------------------------
    // TEST 6: Code Verification & Rate Limiting (Attempt Counter)
    // -------------------------------------------------------------
    console.log('\n--- 6. CODE VERIFICATION & ATTEMPT TRACKING ---');

    // Try wrong code
    let wrongCodeRejected = false;
    try {
      await authService.verifyResetCode(testEmail, '000000');
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 400) {
        wrongCodeRejected = true;
      }
    }
    assert(wrongCodeRejected, 'Incorrect 6-digit code is rejected with HTTP 400');

    // Check attempts incremented in Neon
    const resetReqAfterWrong = await prisma.passwordResetRequest.findFirst({
      where: { userId: testUserId },
      orderBy: { createdAt: 'desc' },
    });
    assert(resetReqAfterWrong?.attemptsCount === 1, 'Failed attempt incremented counter in Neon');

    // Try correct code
    const verifyRes = await authService.verifyResetCode(testEmail, deliveredCode!);
    assert(verifyRes.success === true, 'Valid 6-digit code successfully verified');
    assert(Boolean(verifyRes.resetToken), 'Server issues a single-use resetToken');

    // -------------------------------------------------------------
    // TEST 7: Password Reset & Atomic Database Update
    // -------------------------------------------------------------
    console.log('\n--- 7. PASSWORD RESET EXECUTION & CREDENTIAL UPDATE ---');

    const resetRes = await authService.resetPassword(testEmail, verifyRes.resetToken!, updatedPassword);
    assert(resetRes.success === true, 'Password reset completes successfully');

    // Verify PasswordResetRequest status in Neon
    const resetReqAfterUse = await prisma.passwordResetRequest.findFirst({
      where: { userId: testUserId },
      orderBy: { createdAt: 'desc' },
    });
    assert(resetReqAfterUse?.usedAt !== null, 'PasswordResetRequest marked as used in Neon');

    // Token reuse should fail
    let reuseRejected = false;
    try {
      await authService.resetPassword(testEmail, verifyRes.resetToken!, 'AnotherPass123!');
    } catch (err: any) {
      if (err instanceof ApiClientError && (err.status === 400 || err.status === 401)) {
        reuseRejected = true;
      }
    }
    assert(reuseRejected, 'Reset token cannot be reused a second time');

    // -------------------------------------------------------------
    // TEST 8: Login Authentication with New vs Old Password
    // -------------------------------------------------------------
    console.log('\n--- 8. LOGIN AUTHENTICATION AGAINST UPDATED CREDENTIALS ---');

    // Old password should fail
    let oldPasswordRejected = false;
    try {
      await authService.login(testEmail, initialPassword);
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 401) {
        oldPasswordRejected = true;
      }
    }
    assert(oldPasswordRejected, 'Login with old password fails with HTTP 401 Unauthorized');

    // New password should succeed
    const newLoginRes = await authService.login(testEmail, updatedPassword);
    assert(Boolean(newLoginRes.token), 'Login with new password succeeds and returns JWT');
    assert(newLoginRes.user.email === testEmail, 'User profile returned matches updated account');

    // Verify audit log in Neon for successful password reset
    const resetSuccessAudit = await prisma.auditLog.findFirst({
      where: {
        targetId: testUserId,
        action: 'PASSWORD_RESET_COMPLETED',
      },
    });
    assert(resetSuccessAudit !== null, 'PASSWORD_RESET_COMPLETED logged in Neon audit table');

  } finally {
    // -------------------------------------------------------------
    // CLEANUP: Clean up test user & cascading records in Neon
    // -------------------------------------------------------------
    console.log('\n--- CLEANUP ---');
    if (testUserId) {
      try {
        await prisma.passwordResetRequest.deleteMany({ where: { userId: testUserId } }).catch(() => null);
        await prisma.auditLog.deleteMany({ where: { targetId: testUserId } }).catch(() => null);
        await prisma.user.delete({ where: { id: testUserId } }).catch(() => null);
        console.log(`Cleaned up test user ${testEmail} and test records from Neon.`);
      } catch (err) {
        console.warn('Cleanup error (non-fatal):', err);
      }
    }

    server.close();
    await disconnectDatabase();
  }

  console.log('\n========================================================================');
  console.log(`   PERSISTENCE & RESET SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPersistenceAuditResetSuite().catch((err) => {
  console.error('Test suite failed with uncaught exception:', err);
  process.exit(1);
});
