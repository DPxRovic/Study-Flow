/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { validateId } from '../utils/validators';

export class AdminAuditController {
  /**
   * GET /api/admin/audit-logs
   * Strictly scoped read-only paginated retrieval of audit records for authorized administrators.
   *
   * Query options:
   * - page: Page index (default: 1)
   * - limit: Page size limit (default: 20, max: 100)
   * - category: Filter by category (e.g. user_management, security, broadcast, curriculum, system)
   * - action: Filter by action type (e.g. USER_ROLE_UPDATE, USER_STATUS_CHANGE, ANNOUNCEMENT_DELETE, SETTINGS_UPDATE)
   * - targetType: Filter by entity type (User, Announcement, Subject, System)
   * - adminId: Filter by administrator user ID
   * - search: Text search across adminEmail, adminName, action, details, targetType
   * - startDate / endDate: ISO date filters on timestamp
   * - order: "desc" (default) or "asc"
   */
  static async listLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Authorization guarantee: caller must be an authenticated administrator
      if (!req.user || req.user.role !== 'admin') {
        throw ApiError.forbidden('Administrative credentials required to inspect audit logs');
      }

      const { page, limit, category, action, targetType, adminId, search, startDate, endDate, order } = req.query;

      const whereClause: any = {};

      if (category && typeof category === 'string' && category !== 'all') {
        whereClause.category = category;
      }

      if (action && typeof action === 'string' && action !== 'all') {
        whereClause.action = action;
      }

      if (targetType && typeof targetType === 'string' && targetType !== 'all') {
        whereClause.targetType = targetType;
      }

      if (adminId && typeof adminId === 'string' && adminId !== 'all') {
        whereClause.adminId = validateId(adminId, 'Admin ID');
      }

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate && typeof startDate === 'string') {
          const sDate = new Date(startDate);
          if (!isNaN(sDate.getTime())) whereClause.timestamp.gte = sDate;
        }
        if (endDate && typeof endDate === 'string') {
          const eDate = new Date(endDate);
          if (!isNaN(eDate.getTime())) whereClause.timestamp.lte = eDate;
        }
      }

      if (search && typeof search === 'string' && search.trim()) {
        const query = search.trim();
        whereClause.OR = [
          { adminEmail: { contains: query, mode: 'insensitive' } },
          { adminName: { contains: query, mode: 'insensitive' } },
          { action: { contains: query, mode: 'insensitive' } },
          { details: { contains: query, mode: 'insensitive' } },
          { targetType: { contains: query, mode: 'insensitive' } },
        ];
      }

      const pageNum = page ? Math.max(1, parseInt(String(page), 10) || 1) : 1;
      const pageSize = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 20;
      const skip = (pageNum - 1) * pageSize;
      const sortOrder = order === 'asc' ? 'asc' : 'desc';

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where: whereClause }),
        prisma.auditLog.findMany({
          where: whereClause,
          select: {
            id: true,
            adminId: true,
            adminEmail: true,
            adminName: true,
            action: true,
            category: true,
            targetId: true,
            targetType: true,
            details: true,
            ipAddress: true,
            timestamp: true,
          },
          orderBy: { timestamp: sortOrder },
          skip,
          take: pageSize,
        }),
      ]);

      res.json({
        success: true,
        data: logs,
        meta: {
          total,
          page: pageNum,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
          hasMore: pageNum * pageSize < total,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/audit-logs/stats
   * Aggregated metrics and category distributions for administrative governance reporting.
   */
  static async getAuditStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        throw ApiError.forbidden('Administrative credentials required to inspect audit logs');
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        totalLogs,
        todayCount,
        userMgmtCount,
        securityCount,
        broadcastCount,
        curriculumCount,
        systemCount,
      ] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.count({ where: { timestamp: { gte: todayStart } } }),
        prisma.auditLog.count({ where: { category: 'user_management' } }),
        prisma.auditLog.count({ where: { category: 'security' } }),
        prisma.auditLog.count({ where: { category: 'broadcast' } }),
        prisma.auditLog.count({ where: { category: 'curriculum' } }),
        prisma.auditLog.count({ where: { category: 'system' } }),
      ]);

      const topAdmins = await prisma.auditLog.groupBy({
        by: ['adminName', 'adminEmail'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      });

      res.json({
        success: true,
        stats: {
          totalLogs,
          todayCount,
          byCategory: {
            user_management: userMgmtCount,
            security: securityCount,
            broadcast: broadcastCount,
            curriculum: curriculumCount,
            system: systemCount,
          },
          topAdmins: topAdmins.map((a: any) => ({
            name: a.adminName,
            email: a.adminEmail,
            count: a._count.id,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/audit-logs/:id
   * Retrieves single audit record details (strictly read-only)
   */
  static async getLogById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        throw ApiError.forbidden('Administrative credentials required to inspect audit logs');
      }

      const logId = validateId(req.params.id, 'Audit Log ID');

      const log = await prisma.auditLog.findUnique({
        where: { id: logId },
      });

      if (!log) {
        throw ApiError.notFound('Audit record not found');
      }

      res.json({
        success: true,
        data: log,
      });
    } catch (err) {
      next(err);
    }
  }
}
