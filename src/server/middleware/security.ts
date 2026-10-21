/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * Standard Security Headers Middleware
 * Protects against MIME-sniffing, cross-site scripting, and clickjacking
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent browser MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Disable legacy buggy XSS auditor
  res.setHeader('X-XSS-Protection', '0');

  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remove Express identification banner
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * CORS Configuration Middleware
 * Supports local development and AI Studio preview containers
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  // Set permissive but safe CORS headers for API consumers
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, PUT, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

// In-memory sliding window rate limiter map
const authRateLimitMap = new Map<string, RateLimitBucket>();

/**
 * Rate limiting middleware for sensitive authentication endpoints (login, register).
 * Enforces a maximum number of requests per window per IP address to safeguard against brute-force attacks.
 */
export function createAuthRateLimiter(maxRequests = 30, windowMs = 5 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown-ip';
    const key = `auth:${ip}`;
    const now = Date.now();

    const bucket = authRateLimitMap.get(key);

    if (!bucket || now > bucket.resetTime) {
      authRateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (bucket.count >= maxRequests) {
      const retryAfterSec = Math.ceil((bucket.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return next(
        new ApiError(
          429,
          `Too many authentication attempts. Please try again in ${retryAfterSec} seconds.`
        )
      );
    }

    bucket.count += 1;
    next();
  };
}

/**
 * Helper to reset rate limits (used during test suites)
 */
export function clearRateLimits() {
  authRateLimitMap.clear();
}
