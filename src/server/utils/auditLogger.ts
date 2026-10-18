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
 * Safely and persistently records an administrative audit log event to PostgreSQL.
 * Errors are caught and logged so audit failures do not crash the primary administrative operation.
 */
export async function logAdminAction(params: RecordAuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        adminId: params.adminId,
        adminEmail: params.adminEmail,
        adminName: params.adminName,
        action: params.action,
        category: params.category || 'security',
        targetId: params.targetId || null,
        targetType: params.targetType || null,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error: any) {
    console.error('[AuditLog] Failed to record administrative audit log:', error?.message);
    return null;
  }
}
