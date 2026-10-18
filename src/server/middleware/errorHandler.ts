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

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected server error occurred';

  // Format clean JSON response without leaking stack traces or internal details
  const responsePayload: { success: boolean; error: { code: number; message: string; details?: any } } = {
    success: false,
    error: {
      code: statusCode,
      message,
    },
  };

  if (err.details) {
    responsePayload.error.details = err.details;
  }

  res.status(statusCode).json(responsePayload);
}
