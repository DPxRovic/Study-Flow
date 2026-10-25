/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If headers were already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known Prisma errors
  if (err?.code === 'P2002') {
    // Unique constraint violation (e.g. duplicate email)
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target || 'field';
    return res.status(409).json({
      success: false,
      error: {
        code: 409,
        message: `An account or record with this ${target} already exists.`,
      },
    });
  }

  if (err?.code === 'P2025') {
    // Record not found
    return res.status(404).json({
      success: false,
      error: {
        code: 404,
        message: 'The requested record was not found.',
      },
    });
  }

  if (err?.code === 'P2003') {
    // Foreign key constraint failure
    return res.status(400).json({
      success: false,
      error: {
        code: 400,
        message: 'Invalid relationship reference. The associated parent entity does not exist.',
      },
    });
  }

  if (
    err?.name === 'PrismaClientInitializationError' ||
    err?.code === 'P1001' ||
    err?.code === 'P1002' ||
    err?.message?.includes('Can\'t reach database server')
  ) {
    console.error('[Database] Connection failure to PostgreSQL:', err?.message);
    return res.status(503).json({
      success: false,
      error: {
        code: 503,
        message: 'Database service is temporarily unavailable. Please retry shortly.',
      },
    });
  }

  const isOperational =
    err instanceof ApiError || (typeof err.statusCode === 'number' && err.statusCode < 500);
  const statusCode = isOperational ? err.statusCode : 500;

  // Strictly prevent leaking stack traces, internal SQL errors, or system details for 500s
  const message = isOperational
    ? err.message || 'An academic service error occurred'
    : 'An unexpected server error occurred. Please contact university support if this persists.';

  // Format clean JSON response without leaking stack traces or internal details
  const responsePayload: {
    success: boolean;
    error: { code: number; message: string; details?: any };
  } = {
    success: false,
    error: {
      code: statusCode,
      message,
    },
  };

  if (isOperational && err.details) {
    responsePayload.error.details = err.details;
  }

  res.status(statusCode).json(responsePayload);
}
