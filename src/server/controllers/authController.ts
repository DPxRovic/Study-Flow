/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { hashPassword, comparePassword, generateToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import {
  validateEmail,
  validatePassword,
  validateString,
  validateStudyPreferences,
} from '../utils/validators';
import { logSecurityEvent } from '../utils/auditLogger';
import { emailService } from '../services/emailService';
import { config } from '../config';

/**
 * Computes an HMAC-SHA256 hash of a string using the server secret key
 */
function hashWithSecret(value: string): string {
  return crypto.createHmac('sha256', config.jwtSecret).update(value).digest('hex');
}

export class AuthController {
  // POST /api/auth/register
  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { email, password, name, major, term } = req.body;

      const validEmail = validateEmail(email);
      const validPassword = validatePassword(password);
      const validName = validateString(name, 'Full name', 2, 80);
      const validMajor = major ? validateString(major, 'Major', 2, 100) : 'General Studies';
      const validTerm = term ? validateString(term, 'Academic Term', 2, 50) : 'Fall 2026';

      // Check if user already exists in PostgreSQL
      const existing = await prisma.user.findUnique({
        where: { email: validEmail },
      });
      if (existing) {
        throw ApiError.conflict('An account with this university email already exists');
      }

      const passwordHash = await hashPassword(validPassword);

      // Create student user (Never allow registration request to self-assign ADMIN role)
      const newUser = await prisma.user.create({
        data: {
          email: validEmail,
          passwordHash,
          name: validName,
          role: 'STUDENT',
          major: validMajor,
          term: validTerm,
          targetDailyStudyCapHours: 5.5,
          defaultSessionMinutes: 50,
          preferredBreakMinutes: 10,
          preferredStudyTime: 'afternoon',
          bufferMinutes: 15,
        },
      });

      // Record audit log event for new account registration
      await logSecurityEvent({
        actorId: newUser.id,
        actorEmail: newUser.email,
        actorName: newUser.name,
        action: 'USER_REGISTER',
        targetId: newUser.id,
        targetType: 'User',
        details: `Student account created for ${newUser.email} (Major: ${validMajor})`,
        ipAddress: req.ip,
      });

      const token = generateToken({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role.toLowerCase() as any,
        name: newUser.name,
      });

      const { passwordHash: _, ...safeUser } = newUser;

      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        token,
        user: safeUser,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/login
  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const validEmail = validateEmail(email);
      if (!password) {
        throw ApiError.badRequest('Password is required');
      }

      const user = await prisma.user.findUnique({
        where: { email: validEmail },
      });
      if (!user) {
        // Record failed login audit log (without revealing user existence publicly)
        await logSecurityEvent({
          actorEmail: validEmail,
          action: 'USER_LOGIN_FAILED',
          details: `Authentication attempt failed: User not found (${validEmail})`,
          ipAddress: req.ip,
        });
        throw ApiError.unauthorized('Invalid email or password');
      }

      const isValidPassword = await comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        await logSecurityEvent({
          actorId: user.id,
          actorEmail: user.email,
          actorName: user.name,
          action: 'USER_LOGIN_FAILED',
          targetId: user.id,
          details: `Authentication attempt failed: Incorrect password for ${validEmail}`,
          ipAddress: req.ip,
        });
        throw ApiError.unauthorized('Invalid email or password');
      }

      // Record successful login audit event
      await logSecurityEvent({
        actorId: user.id,
        actorEmail: user.email,
        actorName: user.name,
        action: 'USER_LOGIN_SUCCESS',
        targetId: user.id,
        details: `User signed in successfully: ${validEmail} (${user.role})`,
        ipAddress: req.ip,
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role.toLowerCase() as any,
        name: user.name,
      });

      const { passwordHash: _, ...safeUser } = user;

      res.json({
        success: true,
        message: 'Authentication successful',
        token,
        user: safeUser,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/me
  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
      });
      if (!user) {
        throw ApiError.notFound('User account not found');
      }

      const { passwordHash: _, ...safeUser } = user;

      res.json({
        success: true,
        user: safeUser,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/auth/preferences
  static async updatePreferences(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const { name, major, term } = req.body;
      const updates: any = {};

      if (name !== undefined) updates.name = validateString(name, 'Name', 2, 80);
      if (major !== undefined) updates.major = validateString(major, 'Major', 2, 100);
      if (term !== undefined) updates.term = validateString(term, 'Term', 2, 50);

      // Validate study preferences using strict bounds
      const validPrefs = validateStudyPreferences(req.body);
      Object.assign(updates, validPrefs);

      if (Object.keys(updates).length === 0) {
        throw ApiError.badRequest('At least one profile or preference field must be provided to update');
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: updates,
      });

      const { passwordHash: _, ...safeUser } = updatedUser;

      res.json({
        success: true,
        message: 'Study preferences updated',
        user: safeUser,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/logout
  static async logout(req: AuthenticatedRequest, res: Response) {
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  // =========================================================================
  // SECURE SIX-DIGIT EMAIL PASSWORD RESET FLOW (PHASE 6)
  // =========================================================================

  /**
   * STEP A: Request 6-digit verification code sent via email
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const t0 = performance.now();
    try {
      const { email } = req.body;
      const validEmail = validateEmail(email);

      // Safe non-sensitive log: only logs domain, never full credentials
      const domainPart = validEmail.includes('@') ? validEmail.split('@')[1] : 'unknown';
      console.log(`[ForgotPassword] [T0] Request received for domain: @${domainPart}`);

      // Generic non-revealing response to protect user privacy & prevent account enumeration
      const genericResponse = {
        success: true,
        message: 'If an account exists with this university email, a 6-digit verification code has been sent.',
      };

      const tLookupStart = performance.now();
      const user = await prisma.user.findUnique({
        where: { email: validEmail },
      });
      const tLookupEnd = performance.now();
      console.log(
        `[ForgotPassword] [T1] Database lookup completed in ${(tLookupEnd - tLookupStart).toFixed(1)}ms (User found: ${Boolean(user)})`
      );

      if (!user) {
        // Equalize execution time with dummy hash
        hashWithSecret('000000');
        const tTotal = performance.now() - t0;
        console.log(`[ForgotPassword] [T5] Anti-enumeration response returned in ${tTotal.toFixed(1)}ms.`);
        return res.json(genericResponse);
      }

      // Generate cryptographically secure uniform random 6-digit numeric code with leading zeroes preserved
      const numericCode = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
      const codeHash = hashWithSecret(numericCode);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      // Atomic batch: invalidate existing unused requests and persist new request in a single round-trip
      const tPersistStart = performance.now();
      await prisma.$transaction([
        prisma.passwordResetRequest.updateMany({
          where: {
            userId: user.id,
            usedAt: null,
          },
          data: {
            usedAt: new Date(),
          },
        }),
        prisma.passwordResetRequest.create({
          data: {
            userId: user.id,
            codeHash,
            expiresAt,
            maxAttempts: 5,
            attemptsCount: 0,
            ipAddress: req.ip || null,
          },
        }),
      ]);
      const tPersistEnd = performance.now();
      console.log(
        `[ForgotPassword] [T2] Reset code generated and persisted in ${(tPersistEnd - tPersistStart).toFixed(1)}ms`
      );

      // Send the code through Resend email service using published template
      const tResendStart = performance.now();
      console.log(`[ForgotPassword] [T3] Resend API request started (template: password-reset)`);

      const emailResult = await emailService.sendPasswordResetCode({
        to: user.email,
        name: user.name,
        code: numericCode,
      });

      const tResendEnd = performance.now();
      console.log(
        `[ForgotPassword] [T4] Resend API request finished in ${(tResendEnd - tResendStart).toFixed(1)}ms (Success: ${emailResult.success}, ProviderId: ${emailResult.messageId || 'none'})`
      );

      if (!emailResult.success) {
        // Record tamper-evident audit event for failed email delivery
        await logSecurityEvent({
          actorId: user.id,
          actorEmail: user.email,
          actorName: user.name,
          action: 'PASSWORD_RESET_DISPATCH_FAILED',
          targetId: user.id,
          details: `Password reset email delivery failed: ${emailResult.error}`,
          ipAddress: req.ip,
        });

        // Safe DEVELOPMENT-ONLY demonstration mode for school presentations & testing
        // Strictly refused and deactivated in production environments
        const isDevFallbackEnabled =
          process.env.NODE_ENV !== 'production' &&
          (process.env.ENABLE_DEV_RESET_FALLBACK === 'true' || config.enableDevResetFallback);

        if (isDevFallbackEnabled) {
          // Log tamper-evident audit event for development fallback activation
          await logSecurityEvent({
            actorId: user.id,
            actorEmail: user.email,
            actorName: user.name,
            action: 'PASSWORD_RESET_DEV_FALLBACK_ACTIVE',
            targetId: user.id,
            details: `Development demo fallback active. Email delivery was restricted (${emailResult.error}). Reset code generated and printed to server console.`,
            ipAddress: req.ip,
          });

          console.log('\n========================================================================');
          console.log('   [STUDYFLOW DEV MODE] PASSWORD RESET CODE GENERATED FOR DEMO          ');
          console.log('========================================================================');
          console.log(`Account Email: ${user.email}`);
          console.log(`6-Digit Code:  ${numericCode}`);
          console.log(`Expires:       in 10 minutes`);
          console.log(`Database:      Persisted as HMAC-SHA256 in PostgreSQL`);
          console.log(`Resend Notice: Real email delivery was not performed (${emailResult.error})`);
          console.log('========================================================================\n');

          const responsePayload: {
            success: boolean;
            message: string;
            devMode: boolean;
            devNotice: string;
            devCode?: string;
          } = {
            success: true,
            message: 'If an account exists with this university email, a 6-digit verification code has been generated.',
            devMode: true,
            devNotice: 'Development Demonstration Mode active. Real email delivery was not performed.',
          };

          // NEVER send the code to browser responses by default!
          // ONLY attach devCode if SHOW_DEV_RESET_CODE_IN_UI=true is EXPLICITLY set AND NOT in production
          const allowDevCodeInBrowser =
            process.env.NODE_ENV !== 'production' &&
            (process.env.SHOW_DEV_RESET_CODE_IN_UI === 'true' || config.showDevResetCodeInUi);

          if (allowDevCodeInBrowser) {
            responsePayload.devCode = numericCode;
          }

          const tTotal = performance.now() - t0;
          console.log(`[ForgotPassword] [T5] Total processing completed in ${tTotal.toFixed(1)}ms. Returning HTTP response.`);
          return res.json(responsePayload);
        }

        // Production / Standard Mode: Log concise diagnostic without leaking secrets or codes
        console.warn(
          `[ForgotPassword] Email delivery restricted by provider (status ${emailResult.statusCode || 403}): ${emailResult.error}`
        );

        // User-friendly error that preserves anti-enumeration and protects private Resend sandbox details
        throw ApiError.serviceUnavailable(
          'Email delivery service is temporarily unavailable. Please try again later or contact university support.'
        );
      }

      // Record audit event for successful verification code dispatch
      await logSecurityEvent({
        actorId: user.id,
        actorEmail: user.email,
        actorName: user.name,
        action: 'PASSWORD_RESET_REQUESTED',
        targetId: user.id,
        details: `Password reset verification code dispatched to ${user.email} (Provider messageId: ${emailResult.messageId || 'simulated'})`,
        ipAddress: req.ip,
      });

      const tTotal = performance.now() - t0;
      console.log(`[ForgotPassword] [T5] Total processing completed in ${tTotal.toFixed(1)}ms. Returning HTTP response.`);
      return res.json(genericResponse);
    } catch (err) {
      next(err);
    }
  }

  /**
   * STEP B: Verify submitted 6-digit code and issue short-lived reset authorization token
   * POST /api/auth/verify-reset-code
   */
  static async verifyResetCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { email, code } = req.body;
      const validEmail = validateEmail(email);

      if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
        throw ApiError.badRequest('A valid 6-digit numeric verification code is required');
      }
      const trimmedCode = code.trim();

      const user = await prisma.user.findUnique({
        where: { email: validEmail },
      });

      if (!user) {
        throw ApiError.badRequest('Invalid or expired verification code');
      }

      // Fetch the most recent active reset request for this user
      const resetRequest = await prisma.passwordResetRequest.findFirst({
        where: {
          userId: user.id,
          usedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!resetRequest) {
        throw ApiError.badRequest('No active reset request found. Please request a new code.');
      }

      // Check expiration
      if (new Date() > resetRequest.expiresAt) {
        await prisma.passwordResetRequest.update({
          where: { id: resetRequest.id },
          data: { usedAt: new Date() },
        });
        throw ApiError.badRequest('The verification code has expired. Please request a new code.');
      }

      // Check max attempts limit
      if (resetRequest.attemptsCount >= resetRequest.maxAttempts) {
        await prisma.passwordResetRequest.update({
          where: { id: resetRequest.id },
          data: { usedAt: new Date() },
        });
        throw ApiError.badRequest(
          'Maximum verification attempts exceeded. Please request a new code for your security.'
        );
      }

      // Secure timing-safe verification of the hashed code
      const submittedHash = hashWithSecret(trimmedCode);
      const isMatch =
        submittedHash.length === resetRequest.codeHash.length &&
        crypto.timingSafeEqual(
          Buffer.from(submittedHash, 'utf8'),
          Buffer.from(resetRequest.codeHash, 'utf8')
        );

      if (!isMatch) {
        const nextAttempts = resetRequest.attemptsCount + 1;
        await prisma.passwordResetRequest.update({
          where: { id: resetRequest.id },
          data: {
            attemptsCount: nextAttempts,
            usedAt: nextAttempts >= resetRequest.maxAttempts ? new Date() : null,
          },
        });

        const remaining = Math.max(0, resetRequest.maxAttempts - nextAttempts);
        throw ApiError.badRequest(
          `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        );
      }

      // Code matched! Generate single-use reset authorization token
      const rawResetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashWithSecret(rawResetToken);
      const tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes to submit new password

      await prisma.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: {
          tokenHash,
          tokenExpiresAt,
        },
      });

      await logSecurityEvent({
        actorId: user.id,
        actorEmail: user.email,
        actorName: user.name,
        action: 'PASSWORD_RESET_VERIFIED',
        targetId: user.id,
        details: `Password reset code successfully verified for ${user.email}`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'Code verified successfully. Please enter your new password.',
        resetToken: rawResetToken,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * STEP C: Set new password using verified reset authorization token
   * POST /api/auth/reset-password
   */
  static async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { email, resetToken, newPassword } = req.body;

      const validEmail = validateEmail(email);
      const validPassword = validatePassword(newPassword);

      if (!resetToken || typeof resetToken !== 'string') {
        throw ApiError.badRequest('Missing reset authorization token. Please verify your code first.');
      }

      const tokenHash = hashWithSecret(resetToken);

      const user = await prisma.user.findUnique({
        where: { email: validEmail },
      });
      if (!user) {
        throw ApiError.badRequest('Invalid or expired password reset session.');
      }

      // Find matching, unused reset request with valid token authorization
      const resetRequest = await prisma.passwordResetRequest.findFirst({
        where: {
          userId: user.id,
          tokenHash,
          usedAt: null,
        },
      });

      if (!resetRequest) {
        throw ApiError.badRequest(
          'Invalid or already consumed reset authorization. Please request a new code.'
        );
      }

      if (!resetRequest.tokenExpiresAt || new Date() > resetRequest.tokenExpiresAt) {
        await prisma.passwordResetRequest.update({
          where: { id: resetRequest.id },
          data: { usedAt: new Date() },
        });
        throw ApiError.badRequest(
          'Reset authorization has expired. Please restart the password reset process.'
        );
      }

      const newPasswordHash = await hashPassword(validPassword);

      // Execute atomic transaction: update user password hash, consume reset token, record audit event
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { passwordHash: newPasswordHash },
        });

        await tx.passwordResetRequest.update({
          where: { id: resetRequest.id },
          data: { usedAt: new Date() },
        });

        await logSecurityEvent(
          {
            actorId: user.id,
            actorEmail: user.email,
            actorName: user.name,
            action: 'PASSWORD_RESET_COMPLETED',
            targetId: user.id,
            details: `Password securely updated in PostgreSQL for ${user.email}`,
            ipAddress: req.ip,
          },
          tx
        );
      });

      res.json({
        success: true,
        message:
          'Your password has been successfully reset. You can now log in with your new password.',
      });
    } catch (err) {
      next(err);
    }
  }
}
