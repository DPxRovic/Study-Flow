/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../db/prisma';

// Extend Express Request interface to carry authenticated user
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authorization Bearer token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw ApiError.unauthorized('Malformed Bearer authorization header');
    }

    const decoded = verifyToken(token);
    
    // Check if user still exists in PostgreSQL database
    const userRecord = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, name: true, tokenVersion: true, accountStatus: true },
    });

    if (!userRecord) {
      throw ApiError.unauthorized('User account associated with token no longer exists');
    }
    if (decoded.tokenVersion !== userRecord.tokenVersion) {
      throw ApiError.unauthorized('Authentication token has been revoked');
    }
    if (userRecord.accountStatus === 'SUSPENDED') {
      throw ApiError.forbidden('This account is suspended. Contact university support.');
    }

    req.user = {
      userId: userRecord.id,
      email: userRecord.email,
      role: userRecord.role.toLowerCase() as 'student' | 'admin' | 'professor' | 'advisor' | 'ta',
      name: userRecord.name,
      tokenVersion: userRecord.tokenVersion,
    };
    next();
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err instanceof SyntaxError) {
      return next(ApiError.unauthorized('Invalid or expired authentication token'));
    }
    next(err);
  }
}

export function requireRole(...allowedRoles: Array<'student' | 'admin' | 'professor' | 'advisor' | 'ta'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Role "${req.user.role}" does not have required permissions (${allowedRoles.join(', ')}).`
        )
      );
    }

    next();
  };
}
