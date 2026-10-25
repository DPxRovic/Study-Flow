/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class ApiError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message = 'Invalid request parameters', details?: any) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to access this academic resource') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Requested academic resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource conflict detected') {
    return new ApiError(409, message);
  }

  static internal(message = 'An unexpected server error occurred') {
    return new ApiError(500, message);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable', details?: any) {
    return new ApiError(503, message, details);
  }
}
