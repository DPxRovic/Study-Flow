/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { validateId, validateNotificationCategory, validateString } from '../utils/validators';

export class NotificationController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { category, title, description, actionUrl, actionLabel, relatedId, priority } = req.body;
      const validPriority = priority === undefined ? 'normal' : String(priority).toLowerCase();
      if (!['normal', 'important', 'urgent'].includes(validPriority)) {
        throw ApiError.badRequest('Notification priority must be normal, important, or urgent');
      }
      const created = await prisma.academicNotification.create({
        data: {
          userId: req.user!.userId,
          category: validateNotificationCategory(category),
          title: validateString(title, 'Notification title', 2, 150),
          description: validateString(description, 'Notification description', 2, 1000),
          actionUrl: actionUrl ? validateString(actionUrl, 'Action URL', 1, 300) : null,
          actionLabel: actionLabel ? validateString(actionLabel, 'Action label', 1, 80) : null,
          relatedId: relatedId ? validateString(relatedId, 'Related ID', 1, 100) : null,
          priority: validPriority,
        },
      });
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/notifications (With category filter, read status filter, and pagination)
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { category, unreadOnly, page, limit } = req.query;

      const whereClause: any = { userId };

      if (category && typeof category === 'string' && category !== 'all') {
        whereClause.category = validateNotificationCategory(category);
      }

      if (String(unreadOnly) === 'true') {
        whereClause.read = false;
      }

      const pageNum = page ? Math.max(1, parseInt(String(page), 10) || 1) : 1;
      const pageSize = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 50;
      const skip = (pageNum - 1) * pageSize;

      const [total, unreadCount, notifications] = await Promise.all([
        prisma.academicNotification.count({ where: whereClause }),
        prisma.academicNotification.count({ where: { userId, read: false } }),
        prisma.academicNotification.findMany({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
          skip,
          take: pageSize,
        }),
      ]);

      res.json({
        success: true,
        data: notifications,
        meta: {
          total,
          unreadCount,
          page: pageNum,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/notifications/:id/read (Mark a single notification as read)
  static async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const notifId = validateId(req.params.id, 'Notification ID');

      const notif = await prisma.academicNotification.findUnique({
        where: { id: notifId },
      });
      if (!notif) {
        throw ApiError.notFound('Notification not found');
      }

      if (notif.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this notification');
      }

      const updated = await prisma.academicNotification.update({
        where: { id: notifId },
        data: { read: true },
      });

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async markUnread(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const notifId = validateId(req.params.id, 'Notification ID');
      const notif = await prisma.academicNotification.findUnique({ where: { id: notifId } });
      if (!notif) throw ApiError.notFound('Notification not found');
      if (notif.userId !== req.user!.userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this notification');
      }
      const updated = await prisma.academicNotification.update({
        where: { id: notifId },
        data: { read: false },
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/notifications/read-all (Mark all notifications as read for current student)
  static async markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { category } = req.body;

      const whereClause: any = { userId, read: false };
      if (category && typeof category === 'string' && category !== 'all') {
        whereClause.category = validateNotificationCategory(category);
      }

      const updateResult = await prisma.academicNotification.updateMany({
        where: whereClause,
        data: { read: true },
      });

      res.json({
        success: true,
        message: `${updateResult.count} notifications marked as read`,
        count: updateResult.count,
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/notifications/:id (Delete notification)
  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const notifId = validateId(req.params.id, 'Notification ID');

      const notif = await prisma.academicNotification.findUnique({
        where: { id: notifId },
      });
      if (!notif) {
        throw ApiError.notFound('Notification not found');
      }

      if (notif.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this notification');
      }

      await prisma.academicNotification.delete({
        where: { id: notifId },
      });

      res.json({
        success: true,
        message: 'Notification removed',
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await prisma.academicNotification.deleteMany({
        where: { userId: req.user!.userId },
      });
      res.json({ success: true, message: `${result.count} notifications removed` });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/notifications/sync-events
  // Idempotent generation of notifications from real academic events (deadlines approaching, overdue deliverables, new announcements)
  static async syncEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Fetch active deliverables and announcements
      const [activeTasks, existingNotifs, currentUser] = await Promise.all([
        prisma.task.findMany({
          where: {
            userId,
            status: { not: 'COMPLETED' },
          },
          include: {
            subject: { select: { code: true } },
          },
        }),
        prisma.academicNotification.findMany({
          where: { userId },
          select: { relatedId: true, category: true },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { major: true } }),
      ]);

      const major = currentUser?.major?.toLowerCase() || '';
      const cohorts = ['all', 'undergrad'];
      if (/computer|engineering|math|science|biology|chemistry|physics|stem/.test(major)) cohorts.push('stem');
      if (/humanit|history|philosophy|language|literature|arts/.test(major)) cohorts.push('humanities');
      const announcements = await prisma.announcement.findMany({
        where: {
          status: 'published',
          targetCohort: { in: cohorts },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { publishedAt: 'desc' },
      });

      const existingSet = new Set(existingNotifs.map((n: any) => `${n.category}:${n.relatedId}`));
      const newNotificationsToCreate: any[] = [];

      // 1. Check for approaching deadlines (due within 48h)
      for (const t of activeTasks) {
        const due = new Date(t.dueDate);
        if (due > now && due <= in48Hours) {
          const key = `deadline:${t.id}`;
          if (!existingSet.has(key)) {
            newNotificationsToCreate.push({
              userId,
              category: 'deadline',
              title: `Upcoming Deadline: ${t.title}`,
              description: `${t.subject.code} deliverable due in less than 48 hours (${t.remainingHours}h remaining).`,
              actionUrl: '/tasks',
              actionLabel: 'View Assignment',
              relatedId: t.id,
              priority: t.priority === 'URGENT' || t.priority === 'HIGH' ? 'urgent' : 'important',
            });
            existingSet.add(key);
          }
        } else if (due <= now) {
          // Overdue task alert
          const key = `overdue:${t.id}`;
          if (!existingSet.has(key)) {
            newNotificationsToCreate.push({
              userId,
              category: 'overdue',
              title: `Past Due: ${t.title}`,
              description: `${t.subject.code} deliverable was due on ${due.toISOString().split('T')[0]}.`,
              actionUrl: '/tasks',
              actionLabel: 'Review Task',
              relatedId: t.id,
              priority: 'urgent',
            });
            existingSet.add(key);
          }
        }
      }

      // 2. Sync campus announcements (if student has not received them yet)
      for (const ann of announcements) {
        const key = `announcement:${ann.id}`;
        if (!existingSet.has(key)) {
          newNotificationsToCreate.push({
            userId,
            category: 'announcement',
            title: ann.title,
            description: ann.content.length > 140 ? `${ann.content.substring(0, 137)}...` : ann.content,
            actionUrl: '/dashboard',
            actionLabel: 'Read Broadcast',
            relatedId: ann.id,
            priority: ann.priority === 'critical' ? 'urgent' : ann.priority === 'important' ? 'important' : 'normal',
          });
          existingSet.add(key);
        }
      }

      // Bulk create if any new events were identified
      if (newNotificationsToCreate.length > 0) {
        await prisma.academicNotification.createMany({
          data: newNotificationsToCreate,
        });
      }

      res.json({
        success: true,
        message: `Synced academic notifications (${newNotificationsToCreate.length} new)`,
        createdCount: newNotificationsToCreate.length,
      });
    } catch (err) {
      next(err);
    }
  }
}
