/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { validateString, validateId } from '../utils/validators';
import { logAdminAction } from '../utils/auditLogger';

export class AdminController {
  // GET /api/admin/users
  // Lists institutional users with filtering, search, and enrolled course counts
  static async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { search, role, page, limit } = req.query;

      const whereClause: any = {};

      if (role && typeof role === 'string' && role !== 'all') {
        const normRole = role.toUpperCase();
        if (['STUDENT', 'ADMIN', 'ADVISOR', 'TA'].includes(normRole)) {
          whereClause.role = normRole;
        }
      }

      if (search && typeof search === 'string' && search.trim()) {
        const query = search.trim();
        whereClause.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { major: { contains: query, mode: 'insensitive' } },
        ];
      }

      const pageNum = page ? Math.max(1, parseInt(String(page), 10) || 1) : 1;
      const pageSize = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 50;
      const skip = (pageNum - 1) * pageSize;

      const [total, usersList] = await Promise.all([
        prisma.user.count({ where: whereClause }),
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            major: true,
            term: true,
            targetDailyStudyCapHours: true,
            defaultSessionMinutes: true,
            preferredBreakMinutes: true,
            preferredStudyTime: true,
            bufferMinutes: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                subjects: true,
                tasks: true,
                studySessions: true,
              },
            },
          },
          orderBy: { name: 'asc' },
          skip,
          take: pageSize,
        }),
      ]);

      res.json({
        success: true,
        data: usersList.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role.toLowerCase(),
          major: u.major || 'Undeclared',
          term: u.term || 'Fall 2026',
          enrolledCourses: u._count.subjects,
          totalTasks: u._count.tasks,
          totalSessions: u._count.studySessions,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        })),
        meta: {
          total,
          page: pageNum,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/users/:id
  // Retrieves non-sensitive details for a specific user
  static async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const targetUserId = validateId(req.params.id, 'User ID');

      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          major: true,
          term: true,
          targetDailyStudyCapHours: true,
          defaultSessionMinutes: true,
          preferredBreakMinutes: true,
          preferredStudyTime: true,
          bufferMinutes: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              subjects: true,
              tasks: true,
              studySessions: true,
            },
          },
        },
      });

      if (!user) {
        throw ApiError.notFound('User account not found');
      }

      res.json({
        success: true,
        data: {
          ...user,
          role: user.role.toLowerCase(),
          enrolledCourses: user._count.subjects,
          totalTasks: user._count.tasks,
          totalSessions: user._count.studySessions,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/users/:id/role
  // Updates user role with strict last-admin safeguard and audit logging
  static async updateUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const callerUserId = req.user!.userId;
      const targetUserId = validateId(req.params.id, 'User ID');
      const { role } = req.body;

      if (!role) {
        throw ApiError.badRequest('New role is required');
      }

      const normRole = String(role).toUpperCase();
      if (!['STUDENT', 'ADMIN', 'ADVISOR', 'TA'].includes(normRole)) {
        throw ApiError.badRequest('Role must be one of: student, admin, advisor, ta');
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        throw ApiError.notFound('Target user not found');
      }

      const previousRole = targetUser.role;

      // Safeguard: Prevent removing the LAST administrator in the institution
      if (targetUser.role === 'ADMIN' && normRole !== 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (adminCount <= 1) {
          throw ApiError.forbidden(
            'Cannot demote the last administrator account. The system must retain at least one active administrator.'
          );
        }
      }

      // Safeguard: Prevent an administrator from demoting themselves directly without another admin present
      if (callerUserId === targetUserId && normRole !== 'ADMIN') {
        throw ApiError.forbidden(
          'Self-demotion is prohibited. Another administrator must change your role.'
        );
      }

      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { role: normRole as any },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          updatedAt: true,
        },
      });

      // Audit Log sensitive role change
      await logAdminAction({
        adminId: callerUserId,
        adminEmail: req.user!.email,
        adminName: req.user!.name,
        action: 'USER_ROLE_UPDATE',
        category: 'user_management',
        targetId: targetUserId,
        targetType: 'User',
        details: `Updated role for ${targetUser.name} (${targetUser.email}) from ${previousRole} to ${normRole}`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: `User role updated to ${normRole.toLowerCase()}`,
        data: {
          ...updatedUser,
          role: updatedUser.role.toLowerCase(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/users/:id/status
  // Updates user academic status / term status with audit logging
  static async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const callerUserId = req.user!.userId;
      const targetUserId = validateId(req.params.id, 'User ID');
      const { term, major } = req.body;

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        throw ApiError.notFound('Target user not found');
      }

      const updates: any = {};
      if (term !== undefined) updates.term = validateString(term, 'Academic Term', 2, 50);
      if (major !== undefined) updates.major = validateString(major, 'Academic Major', 2, 100);

      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: updates,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          major: true,
          term: true,
          updatedAt: true,
        },
      });

      await logAdminAction({
        adminId: callerUserId,
        adminEmail: req.user!.email,
        adminName: req.user!.name,
        action: 'USER_STATUS_CHANGE',
        category: 'user_management',
        targetId: targetUserId,
        targetType: 'User',
        details: `Updated academic status for ${targetUser.name} (${targetUser.email}): ${JSON.stringify(updates)}`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'User academic profile status updated',
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/audit-logs
  // Admin-only audit log API to track sensitive actions with filtering and pagination
  static async listAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { category, action, search, page, limit } = req.query;

      const whereClause: any = {};

      if (category && typeof category === 'string' && category !== 'all') {
        whereClause.category = category;
      }

      if (action && typeof action === 'string' && action !== 'all') {
        whereClause.action = action;
      }

      if (search && typeof search === 'string' && search.trim()) {
        const query = search.trim();
        whereClause.OR = [
          { adminEmail: { contains: query, mode: 'insensitive' } },
          { adminName: { contains: query, mode: 'insensitive' } },
          { details: { contains: query, mode: 'insensitive' } },
          { action: { contains: query, mode: 'insensitive' } },
        ];
      }

      const pageNum = page ? Math.max(1, parseInt(String(page), 10) || 1) : 1;
      const pageSize = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 50;
      const skip = (pageNum - 1) * pageSize;

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where: whereClause }),
        prisma.auditLog.findMany({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
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
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/catalog
  // Master Institutional Curriculum Catalog overview
  static async getCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const allSubjects = await prisma.subject.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          instructor: true,
          credits: true,
          colorKey: true,
          weeklyTargetHours: true,
          classroom: true,
        },
      });

      const catalogMap = new Map<string, any>();
      for (const s of allSubjects) {
        if (!catalogMap.has(s.code)) {
          catalogMap.set(s.code, {
            code: s.code,
            name: s.name,
            instructor: s.instructor || 'Staff Faculty',
            credits: s.credits,
            category: s.colorKey,
            expectedWeeklyHours: s.weeklyTargetHours,
            classroom: s.classroom || 'Main Campus',
            activeEnrollments: 1,
          });
        } else {
          const entry = catalogMap.get(s.code);
          entry.activeEnrollments += 1;
        }
      }

      const masterCatalog = Array.from(catalogMap.values()).sort((a, b) => a.code.localeCompare(b.code));

      res.json({
        success: true,
        data: masterCatalog,
        meta: {
          totalCatalogCourses: masterCatalog.length,
          totalStudentEnrollments: allSubjects.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/metrics
  // Real institutional analytics computed from PostgreSQL records
  static async getMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const [
        totalStudents,
        totalAdmins,
        totalFaculty,
        totalSubjects,
        totalTasks,
        completedTasks,
        totalSessions,
        completedSessions,
        announcementsCount,
        auditLogsCount,
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.count({ where: { role: { in: ['ADVISOR', 'TA'] } } }),
        prisma.subject.count(),
        prisma.task.count(),
        prisma.task.count({ where: { status: 'COMPLETED' } }),
        prisma.studySession.count(),
        prisma.studySession.count({ where: { status: 'COMPLETED' } }),
        prisma.announcement.count(),
        prisma.auditLog.count(),
      ]);

      const sessions = await prisma.studySession.findMany({
        where: { status: 'COMPLETED' },
        select: { actualMinutesLogged: true, durationMinutes: true },
      });
      const totalLoggedMinutes = sessions.reduce((acc, s) => acc + (s.actualMinutesLogged || s.durationMinutes), 0);
      const totalLoggedHours = Math.round((totalLoggedMinutes / 60) * 10) / 10;

      const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const sessionExecutionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

      res.json({
        success: true,
        metrics: {
          userBreakdown: {
            students: totalStudents,
            administrators: totalAdmins,
            advisorsAndTAs: totalFaculty,
            totalUsers: totalStudents + totalAdmins + totalFaculty,
          },
          academicWorkload: {
            totalEnrollments: totalSubjects,
            totalTasksAllocated: totalTasks,
            completedTasks,
            taskCompletionRate,
          },
          studyExecution: {
            totalSessionsScheduled: totalSessions,
            completedSessions,
            sessionExecutionRate,
            totalLoggedHours,
          },
          securityAndGovernance: {
            totalAuditLogs: auditLogsCount,
            activeAnnouncements: announcementsCount,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/announcements
  // List all institutional announcements
  static async listAnnouncements(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const announcementsList = await prisma.announcement.findMany({
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      });

      res.json({
        success: true,
        data: announcementsList,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/admin/announcements
  // Create and broadcast a new institutional announcement with audit logging
  static async createAnnouncement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { title, content, priority, targetCohort, pinned, status } = req.body;

      const validTitle = validateString(title, 'Title', 3, 150);
      const validContent = validateString(content, 'Content body', 5, 3000);

      const validPriority = ['normal', 'important', 'critical'].includes(priority) ? priority : 'normal';
      const validCohort = ['all', 'stem', 'humanities', 'undergrad'].includes(targetCohort) ? targetCohort : 'all';

      const newAnnouncement = await prisma.announcement.create({
        data: {
          title: validTitle,
          content: validContent,
          author: req.user!.name || 'Department Dean',
          priority: validPriority,
          targetCohort: validCohort,
          pinned: Boolean(pinned),
          status: status || 'published',
        },
      });

      await logAdminAction({
        adminId: req.user!.userId,
        adminEmail: req.user!.email,
        adminName: req.user!.name,
        action: 'ANNOUNCEMENT_CREATE',
        category: 'broadcast',
        targetId: newAnnouncement.id,
        targetType: 'Announcement',
        details: `Published announcement "${validTitle}" to cohort: ${validCohort} (${validPriority})`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Announcement broadcasted successfully',
        data: newAnnouncement,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/announcements/:id
  // Edit an existing institutional announcement with audit logging
  static async updateAnnouncement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const annId = validateId(req.params.id, 'Announcement ID');
      const { title, content, priority, targetCohort, pinned, status } = req.body;

      const ann = await prisma.announcement.findUnique({
        where: { id: annId },
      });

      if (!ann) {
        throw ApiError.notFound('Announcement not found');
      }

      const updates: any = {};
      if (title !== undefined) updates.title = validateString(title, 'Title', 3, 150);
      if (content !== undefined) updates.content = validateString(content, 'Content body', 5, 3000);
      if (priority !== undefined && ['normal', 'important', 'critical'].includes(priority)) updates.priority = priority;
      if (targetCohort !== undefined && ['all', 'stem', 'humanities', 'undergrad'].includes(targetCohort)) updates.targetCohort = targetCohort;
      if (pinned !== undefined) updates.pinned = Boolean(pinned);
      if (status !== undefined && ['published', 'draft', 'archived'].includes(status)) updates.status = status;

      const updated = await prisma.announcement.update({
        where: { id: annId },
        data: updates,
      });

      await logAdminAction({
        adminId: req.user!.userId,
        adminEmail: req.user!.email,
        adminName: req.user!.name,
        action: 'ANNOUNCEMENT_UPDATE',
        category: 'broadcast',
        targetId: annId,
        targetType: 'Announcement',
        details: `Updated announcement "${updated.title}"`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'Announcement updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/admin/announcements/:id
  // Remove an institutional announcement with audit logging
  static async deleteAnnouncement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const annId = validateId(req.params.id, 'Announcement ID');

      const ann = await prisma.announcement.findUnique({
        where: { id: annId },
      });

      if (!ann) {
        throw ApiError.notFound('Announcement not found');
      }

      await prisma.announcement.delete({
        where: { id: annId },
      });

      await logAdminAction({
        adminId: req.user!.userId,
        adminEmail: req.user!.email,
        adminName: req.user!.name,
        action: 'ANNOUNCEMENT_DELETE',
        category: 'broadcast',
        targetId: annId,
        targetType: 'Announcement',
        details: `Deleted global announcement "${ann.title}" (Author: ${ann.author})`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'Announcement removed successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
