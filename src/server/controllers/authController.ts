/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { hashPassword, comparePassword, generateToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { validateEmail, validatePassword, validateString } from '../utils/validators';

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
        throw ApiError.unauthorized('Invalid email or password');
      }

      const isValidPassword = await comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        throw ApiError.unauthorized('Invalid email or password');
      }

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

      const {
        name,
        major,
        term,
        targetDailyStudyCapHours,
        defaultSessionMinutes,
        preferredBreakMinutes,
        preferredStudyTime,
        bufferMinutes,
      } = req.body;

      const updates: any = {};
      if (name) updates.name = validateString(name, 'Name', 2, 80);
      if (major) updates.major = validateString(major, 'Major', 2, 100);
      if (term) updates.term = validateString(term, 'Term', 2, 50);
      if (targetDailyStudyCapHours !== undefined) {
        updates.targetDailyStudyCapHours = Number(targetDailyStudyCapHours);
      }
      if (defaultSessionMinutes !== undefined) {
        updates.defaultSessionMinutes = Number(defaultSessionMinutes);
      }
      if (preferredBreakMinutes !== undefined) {
        updates.preferredBreakMinutes = Number(preferredBreakMinutes);
      }
      if (preferredStudyTime) {
        updates.preferredStudyTime = preferredStudyTime;
      }
      if (bufferMinutes !== undefined) {
        updates.bufferMinutes = Number(bufferMinutes);
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
}
