/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { validateDateFormat } from '../utils/validators';

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class ProgressController {
  // GET /api/progress/summary
  // Computes precise real-time academic progress metrics from PostgreSQL records
  static async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      // Optional date window for filtering sessions (e.g., current week)
      let sessionDateFilter: any = undefined;
      if (startDate || endDate) {
        sessionDateFilter = {};
        if (startDate) sessionDateFilter.gte = validateDateFormat(String(startDate), 'Start date');
        if (endDate) sessionDateFilter.lte = validateDateFormat(String(endDate), 'End date');
      }

      // Execute parallel queries for user's courses, tasks, sessions, and preferences
      const [user, subjects, tasks, sessions] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            targetDailyStudyCapHours: true,
            defaultSessionMinutes: true,
            preferredBreakMinutes: true,
          },
        }),
        prisma.subject.findMany({
          where: { userId },
          orderBy: { code: 'asc' },
        }),
        prisma.task.findMany({
          where: { userId },
          orderBy: { dueDate: 'asc' },
        }),
        prisma.studySession.findMany({
          where: {
            userId,
            ...(sessionDateFilter ? { date: sessionDateFilter } : {}),
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        }),
      ]);

      if (!user) {
        throw ApiError.notFound('Student account not found');
      }

      // 1. Task Completion Breakdown
      // Definition: A deliverable is 'completed' if task.status === 'COMPLETED' or remainingHours === 0.
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED' || t.remainingHours <= 0);
      const activeTasks = tasks.filter((t: any) => t.status !== 'COMPLETED' && t.remainingHours > 0);
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

      // 2. Workload Hours Analysis
      const totalEstimatedHours = Math.round(tasks.reduce((sum: number, t: any) => sum + t.estimatedHours, 0) * 10) / 10;
      const totalRemainingHours = Math.round(tasks.reduce((sum: number, t: any) => sum + (t.status === 'COMPLETED' ? 0 : t.remainingHours), 0) * 10) / 10;
      const totalCompletedWorkloadHours = Math.max(0, Math.round((totalEstimatedHours - totalRemainingHours) * 10) / 10);

      // 3. Study Session Metrics
      const validSessions = sessions.filter((s: any) => s.status !== 'CANCELLED');
      const todayStr = localDateKey();
      const futureScheduledSessions = validSessions.filter(
        (s: any) => s.status === 'SCHEDULED' && s.date >= todayStr
      );
      const totalSessionsCount = validSessions.length;
      const completedSessionsList = validSessions.filter((s: any) => s.completed || s.status === 'COMPLETED');
      const outstandingSessionsList = validSessions.filter((s: any) => !s.completed && s.status === 'SCHEDULED');
      const missedSessionsList = validSessions.filter((s: any) => s.status === 'MISSED');

      const loggedMinutes = completedSessionsList.reduce((acc: number, s: any) => {
        return acc + (s.actualMinutesLogged !== null && s.actualMinutesLogged !== undefined ? s.actualMinutesLogged : s.durationMinutes);
      }, 0);
      const loggedHours = Math.round((loggedMinutes / 60) * 10) / 10;

      // 4. Subject-by-Subject Workload Status
      const subjectWorkload = subjects.map((sub: any) => {
        const subTasks = tasks.filter((t: any) => t.subjectId === sub.id);
        const subSessions = validSessions.filter((s: any) => s.subjectId === sub.id);
        const subFutureSessions = futureScheduledSessions.filter((s: any) => s.subjectId === sub.id);

        const subTotalTasks = subTasks.length;
        const subCompletedTasks = subTasks.filter((t: any) => t.status === 'COMPLETED' || t.remainingHours <= 0).length;
        const subRemainingTasks = subTotalTasks - subCompletedTasks;

        const subEstimatedHours = Math.round(subTasks.reduce((acc: number, t: any) => acc + t.estimatedHours, 0) * 10) / 10;
        const subRemainingHours = Math.round(subTasks.reduce((acc: number, t: any) => acc + (t.status === 'COMPLETED' ? 0 : t.remainingHours), 0) * 10) / 10;
        const subCompletedHours = Math.max(0, Math.round((subEstimatedHours - subRemainingHours) * 10) / 10);

        const subScheduledMinutes = subFutureSessions.reduce((acc: number, s: any) => acc + s.durationMinutes, 0);
        const subScheduledHours = Math.round((subScheduledMinutes / 60) * 10) / 10;

        const subLoggedMinutes = subSessions
          .filter((s: any) => s.completed || s.status === 'COMPLETED')
          .reduce((acc: number, s: any) => acc + (s.actualMinutesLogged ?? s.durationMinutes), 0);
        const subLoggedHours = Math.round((subLoggedMinutes / 60) * 10) / 10;

        // Attention heuristic:
        // 'needs_attention' if remaining work exceeds scheduled hours by > 3 hours or has overdue task
        let attentionLevel: 'healthy' | 'on_track' | 'needs_attention' = 'healthy';
        let attentionReason = 'On track with weekly pace';

        const now = new Date();
        const hasOverdue = subTasks.some((t: any) => t.status !== 'COMPLETED' && new Date(t.dueDate) < now);

        if (hasOverdue) {
          attentionLevel = 'needs_attention';
          attentionReason = 'Contains past-due assignment';
        } else if (subRemainingHours > subScheduledHours + 4) {
          attentionLevel = 'needs_attention';
          attentionReason = `${Math.round((subRemainingHours - subScheduledHours) * 10) / 10}h unallocated study time`;
        } else if (subRemainingHours > 0) {
          attentionLevel = 'on_track';
          attentionReason = 'Study sessions planned';
        }

        return {
          subject: {
            id: sub.id,
            code: sub.code,
            name: sub.name,
            colorKey: sub.colorKey,
            credits: sub.credits,
            weeklyTargetHours: sub.weeklyTargetHours,
          },
          totalTasks: subTotalTasks,
          completedTasks: subCompletedTasks,
          remainingTasks: subRemainingTasks,
          estimatedHours: subEstimatedHours,
          completedHours: subCompletedHours,
          remainingHours: subRemainingHours,
          scheduledHours: subScheduledHours,
          loggedHours: subLoggedHours,
          attentionLevel,
          attentionReason,
        };
      });

      // 5. Imminent Deadlines (Next 7 days)
      const now = new Date();
      const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const imminentDeadlines = activeTasks
        .filter((t: any) => {
          const due = new Date(t.dueDate);
          return due >= now && due <= next7Days;
        })
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate,
          remainingHours: t.remainingHours,
          priority: t.priority,
          subjectId: t.subjectId,
        }));

      // Overdue deliverables (Due date in past, not completed)
      const overdueDeliverables = activeTasks
        .filter((t: any) => new Date(t.dueDate) < now)
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate,
          remainingHours: t.remainingHours,
          priority: t.priority,
          subjectId: t.subjectId,
        }));

      res.json({
        success: true,
        data: {
          metrics: {
            totalTasks,
            completedTasks: completedTasks.length,
            activeTasks: activeTasks.length,
            completionPercentage,
            totalEstimatedHours,
            totalRemainingHours,
            totalCompletedWorkloadHours,
            totalSessionsCount,
            completedSessions: completedSessionsList.length,
            outstandingSessions: outstandingSessionsList.length,
            missedSessions: missedSessionsList.length,
            loggedHours,
            targetDailyStudyCapHours: user.targetDailyStudyCapHours,
          },
          subjectWorkload,
          imminentDeadlines,
          overdueDeliverables,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
