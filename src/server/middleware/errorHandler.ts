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

  const isOperational = err instanceof ApiError || (typeof err.statusCode === 'number' && err.statusCode < 500);
  const statusCode = isOperational ? err.statusCode : 500;
  
  // Strictly prevent leaking stack traces, internal SQL errors, or system details for 500s
  const message = isOperational
    ? err.message || 'An academic service error occurred'
    : 'An unexpected server error occurred. Please contact university support if this persists.';

  // Format clean JSON response without leaking stack traces or internal details
  const responsePayload: { success: boolean; error: { code: number; message: string; details?: any } } = {
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
