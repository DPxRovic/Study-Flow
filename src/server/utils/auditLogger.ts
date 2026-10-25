/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../db/prisma';

export interface RecordAuditLogParams {
  adminId: string;
  adminEmail: string;
  adminName: string;
  action: string;
  category?: 'user_management' | 'security' | 'broadcast' | 'curriculum' | 'system';
  targetId?: string;
  targetType?: string;
  details?: string;
  ipAddress?: string;
}

/**
 * Sanitizes details to ensure no passwords, reset codes, JWT tokens, or secrets leak into audit logs
 */
function sanitizeAuditDetails(details?: string): string | null {
  if (!details) return null;
  return details
    .replace(/(password|code|token|secret)[:=]\s*["']?[^"',\s]+["']?/gi, '$1=[REDACTED]')
    .slice(0, 1000);
}

/**
 * Safely and persistently records an administrative or security audit log event to PostgreSQL.
 * Supports optional Prisma transaction client for atomic mutations.
 */
export async function logAdminAction(
  params: RecordAuditLogParams,
  txClient: any = prisma
) {
  try {
    return await txClient.auditLog.create({
      data: {
        adminId: params.adminId || 'system',
        adminEmail: params.adminEmail || 'system@studyflow.internal',
        adminName: params.adminName || 'StudyFlow System',
        action: params.action,
        category: params.category || 'security',
        targetId: params.targetId || null,
        targetType: params.targetType || null,
        details: sanitizeAuditDetails(params.details),
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error: any) {
    console.error('[AuditLog] Failed to record audit log:', error?.message);
    return null;
  }
}

/**
 * Records critical user and authentication security events (registration, login, password reset).
 */
export async function logSecurityEvent(
  params: {
    actorId?: string;
    actorEmail?: string;
    actorName?: string;
    action:
      | 'USER_REGISTER'
      | 'USER_LOGIN_SUCCESS'
      | 'USER_LOGIN_FAILED'
      | 'PASSWORD_RESET_REQUESTED'
      | 'PASSWORD_RESET_DISPATCH_FAILED'
      | 'PASSWORD_RESET_DEV_FALLBACK_ACTIVE'
      | 'PASSWORD_RESET_VERIFIED'
      | 'PASSWORD_RESET_COMPLETED'
      | 'SECURITY_EVENT';
    targetId?: string;
    targetType?: string;
    details?: string;
    ipAddress?: string;
  },
  txClient: any = prisma
) {
  return logAdminAction(
    {
      adminId: params.actorId || 'system',
      adminEmail: params.actorEmail || 'system@studyflow.internal',
      adminName: params.actorName || 'StudyFlow System',
      action: params.action,
      category: 'security',
      targetId: params.targetId,
      targetType: params.targetType || 'User',
      details: params.details,
      ipAddress: params.ipAddress,
    },
    txClient
  );
}
