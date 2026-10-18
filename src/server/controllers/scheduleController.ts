/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import {
  validateDateFormat,
  validateTimeInterval,
  validateId,
  validateSessionStatus,
  validateString,
  validateNumber,
} from '../utils/validators';

function intervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

export class ScheduleController {
  // GET /api/schedule
  // Retrieves the student's schedule overview with day/week groupings, metrics, and unscheduled deliverables
  static async getSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      // Default date window: today to +7 days if not provided
      const todayStr = new Date().toISOString().split('T')[0];
      const startStr = startDate ? validateDateFormat(String(startDate), 'Start date') : todayStr;
      
      let endStr: string;
      if (endDate) {
        endStr = validateDateFormat(String(endDate), 'End date');
      } else {
        const d = new Date(startStr);
        d.setDate(d.getDate() + 7);
        endStr = d.toISOString().split('T')[0];
      }

      // Safeguard against unbounded date range requests
      const startMs = new Date(startStr).getTime();
      const endMs = new Date(endStr).getTime();
      const diffDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        throw ApiError.badRequest('End date must be on or after start date');
      }
      if (diffDays > 60) {
        throw ApiError.badRequest('Requested date range cannot exceed 60 days to protect performance');
      }

      // Fetch sessions in range with related task and subject metadata
      const sessions = await prisma.studySession.findMany({
        where: {
          userId,
          date: {
            gte: startStr,
            lte: endStr,
          },
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              priority: true,
              status: true,
              dueDate: true,
              estimatedHours: true,
              remainingHours: true,
            },
          },
          subject: {
            select: {
              id: true,
              code: true,
              name: true,
              colorKey: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });

      // Find unscheduled tasks (tasks not completed that have remaining hours but zero future sessions)
      const scheduledTaskIds = new Set(sessions.map((s) => s.taskId));
      const unscheduledTasks = await prisma.task.findMany({
        where: {
          userId,
          status: { not: 'COMPLETED' },
          remainingHours: { gt: 0 },
          id: { notIn: Array.from(scheduledTaskIds) },
        },
        include: {
          subject: {
            select: { id: true, code: true, name: true, colorKey: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      // Group sessions by date
      const sessionsByDate: Record<string, typeof sessions> = {};
      sessions.forEach((s) => {
        if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
        sessionsByDate[s.date].push(s);
      });

      res.json({
        success: true,
        data: {
          dateRange: {
            startDate: startStr,
            endDate: endStr,
            totalDays: diffDays + 1,
          },
          sessions,
          sessionsByDate,
          unscheduledTasks,
          summary: {
            totalSessions: sessions.length,
            completedSessions: sessions.filter((s) => s.completed || s.status === 'COMPLETED').length,
            lockedSessions: sessions.filter((s) => s.locked).length,
            totalMinutesScheduled: sessions.reduce((acc, s) => acc + s.durationMinutes, 0),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/schedule/sessions
  // Lists sessions with date, subject, or task filters
  static async listSessions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { date, startDate, endDate, subjectId, taskId, status, locked } = req.query;

      const whereClause: any = { userId };

      if (date && typeof date === 'string') {
        whereClause.date = validateDateFormat(date, 'Date');
      } else if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date.gte = validateDateFormat(String(startDate), 'Start date');
        if (endDate) whereClause.date.lte = validateDateFormat(String(endDate), 'End date');
      }

      if (subjectId && typeof subjectId === 'string' && subjectId !== 'all') {
        whereClause.subjectId = validateId(subjectId, 'Subject ID filter');
      }

      if (taskId && typeof taskId === 'string') {
        whereClause.taskId = validateId(taskId, 'Task ID filter');
      }

      if (status && typeof status === 'string' && status !== 'all') {
        whereClause.status = validateSessionStatus(status);
      }

      if (locked !== undefined) {
        whereClause.locked = String(locked) === 'true';
      }

      const sessions = await prisma.studySession.findMany({
        where: whereClause,
        include: {
          task: {
            select: { id: true, title: true, priority: true, status: true, dueDate: true, remainingHours: true },
          },
          subject: {
            select: { id: true, code: true, name: true, colorKey: true },
          },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });

      res.json({
        success: true,
        data: sessions,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/schedule/sessions/:id
  static async getSessionById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const sessionId = validateId(req.params.id, 'Session ID');

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: {
          task: {
            select: { id: true, title: true, priority: true, status: true, dueDate: true, remainingHours: true },
          },
          subject: {
            select: { id: true, code: true, name: true, colorKey: true },
          },
        },
      });

      if (!session) {
        throw ApiError.notFound('Study session block not found');
      }

      if (session.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this study session');
      }

      res.json({
        success: true,
        data: session,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/schedule/sessions
  // Manually schedules a new study session with concurrency-safe overlap check
  static async createSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { taskId, subjectId, date, startTime, endTime, notes, locked } = req.body;

      const validTaskId = validateId(taskId, 'Task ID');
      const validSubjectId = validateId(subjectId, 'Subject ID');
      const validDate = validateDateFormat(date, 'Date');
      const { start, end, durationMinutes } = validateTimeInterval(startTime, endTime);

      // Verify task and subject ownership
      const task = await prisma.task.findUnique({ where: { id: validTaskId } });
      if (!task || (task.userId !== userId && req.user!.role !== 'admin')) {
        throw ApiError.forbidden('Task does not belong to your account');
      }

      const subject = await prisma.subject.findUnique({ where: { id: validSubjectId } });
      if (!subject || (subject.userId !== userId && req.user!.role !== 'admin')) {
        throw ApiError.forbidden('Subject does not belong to your account');
      }

      // Check task/subject relationship
      if (task.subjectId !== validSubjectId) {
        throw ApiError.badRequest('Task is not enrolled in the specified course subject');
      }

      // Concurrency-safe overlap check and creation inside transaction
      const newSession = await prisma.$transaction(async (tx) => {
        const existingSessions = await tx.studySession.findMany({
          where: {
            userId,
            date: validDate,
            status: { not: 'CANCELLED' }, // Cancelled sessions do not block
          },
        });

        for (const existing of existingSessions) {
          if (intervalsOverlap(start, end, existing.startTime, existing.endTime)) {
            throw ApiError.conflict(
              `Study session from ${start} to ${end} overlaps with an existing scheduled session (${existing.startTime} - ${existing.endTime}) on ${validDate}`
            );
          }
        }

        return tx.studySession.create({
          data: {
            userId,
            taskId: validTaskId,
            subjectId: validSubjectId,
            date: validDate,
            startTime: start,
            endTime: end,
            durationMinutes,
            completed: false,
            status: 'SCHEDULED',
            locked: Boolean(locked),
            notes: notes ? validateString(notes, 'Notes', 0, 1000) : null,
          },
          include: {
            task: {
              select: { id: true, title: true, priority: true, status: true, dueDate: true },
            },
            subject: {
              select: { id: true, code: true, name: true, colorKey: true },
            },
          },
        });
      });

      res.status(201).json({
        success: true,
        message: 'Study block scheduled successfully',
        data: newSession,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/schedule/sessions/:id
  // Updates a session with locked protection and overlap verification
  static async updateSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const sessionId = validateId(req.params.id, 'Session ID');

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        throw ApiError.notFound('Study session block not found');
      }

      if (session.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this study session');
      }

      const { date, startTime, endTime, notes, locked, unlockExplicit } = req.body;

      // Hard integrity rule: Locked sessions cannot have their time or date modified without explicit unlock
      if (session.locked && !unlockExplicit && (date !== undefined || startTime !== undefined || endTime !== undefined)) {
        throw ApiError.badRequest(
          'This study session is LOCKED to protect your committed study time. You must explicitly unlock it to modify date or time.'
        );
      }

      const targetDate = date ? validateDateFormat(date, 'Date') : session.date;
      const targetStart = startTime ? validateTimeInterval(startTime, endTime || session.endTime).start : session.startTime;
      const targetEnd = endTime ? validateTimeInterval(startTime || session.startTime, endTime).end : session.endTime;
      const { start, end, durationMinutes } = validateTimeInterval(targetStart, targetEnd);

      const targetLocked = locked !== undefined ? Boolean(locked) : session.locked;
      const targetNotes = notes !== undefined ? (notes ? validateString(notes, 'Notes', 0, 1000) : null) : session.notes;

      const updated = await prisma.$transaction(async (tx) => {
        // Overlap verification
        const otherSessions = await tx.studySession.findMany({
          where: {
            userId,
            date: targetDate,
            status: { not: 'CANCELLED' },
            NOT: { id: sessionId },
          },
        });

        for (const other of otherSessions) {
          if (intervalsOverlap(start, end, other.startTime, other.endTime)) {
            throw ApiError.conflict(
              `Updated time ${start} - ${end} overlaps with another scheduled session (${other.startTime} - ${other.endTime}) on ${targetDate}`
            );
          }
        }

        return tx.studySession.update({
          where: { id: sessionId },
          data: {
            date: targetDate,
            startTime: start,
            endTime: end,
            durationMinutes,
            locked: targetLocked,
            notes: targetNotes,
          },
          include: {
            task: {
              select: { id: true, title: true, priority: true, status: true },
            },
            subject: {
              select: { id: true, code: true, name: true, colorKey: true },
            },
          },
        });
      });

      res.json({
        success: true,
        message: 'Study block updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/schedule/sessions/:id/lock
  // Dedicated endpoint to lock or unlock a session
  static async toggleLock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const sessionId = validateId(req.params.id, 'Session ID');
      const { locked } = req.body;

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        throw ApiError.notFound('Study session block not found');
      }

      if (session.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this study session');
      }

      const newLockState = locked !== undefined ? Boolean(locked) : !session.locked;

      const updated = await prisma.studySession.update({
        where: { id: sessionId },
        data: { locked: newLockState },
      });

      res.json({
        success: true,
        message: newLockState ? 'Study block locked. Automatic rescheduling will not move this session.' : 'Study block unlocked.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/schedule/sessions/:id/status
  // Handles valid status transitions and idempotent task remaining workload updates
  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const sessionId = validateId(req.params.id, 'Session ID');
      const { status, actualMinutesLogged } = req.body;

      const targetStatus = validateSessionStatus(status);

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { task: true },
      });

      if (!session) {
        throw ApiError.notFound('Study session block not found');
      }

      if (session.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this study session');
      }

      // Execute status transition and task remaining workload adjustment inside an atomic transaction
      const result = await prisma.$transaction(async (tx) => {
        const previousStatus = session.status;
        const sessionHours = session.durationMinutes / 60;

        let taskRemainingUpdate: number | undefined;

        // Idempotent workload deduction:
        // When transitioning TO COMPLETED from a non-completed state, deduct session hours from remainingHours
        if (targetStatus === 'COMPLETED' && previousStatus !== 'COMPLETED') {
          const currentRemaining = session.task.remainingHours;
          taskRemainingUpdate = Math.max(0, Math.round((currentRemaining - sessionHours) * 10) / 10);
        }
        // When transitioning FROM COMPLETED to SCHEDULED/MISSED/CANCELLED, restore session hours
        else if (previousStatus === 'COMPLETED' && targetStatus !== 'COMPLETED') {
          const currentRemaining = session.task.remainingHours;
          taskRemainingUpdate = Math.min(
            session.task.estimatedHours,
            Math.round((currentRemaining + sessionHours) * 10) / 10
          );
        }

        // If task workload was adjusted, update task
        if (taskRemainingUpdate !== undefined) {
          const isTaskNowDone = taskRemainingUpdate === 0;
          await tx.task.update({
            where: { id: session.taskId },
            data: {
              remainingHours: taskRemainingUpdate,
              status: isTaskNowDone ? 'COMPLETED' : 'IN_PROGRESS',
            },
          });
        }

        const validActualMinutes = actualMinutesLogged !== undefined
          ? Math.round(validateNumber(actualMinutesLogged, 'Actual minutes logged', 0, 720))
          : targetStatus === 'COMPLETED' ? session.durationMinutes : session.actualMinutesLogged;

        return tx.studySession.update({
          where: { id: sessionId },
          data: {
            status: targetStatus,
            completed: targetStatus === 'COMPLETED',
            actualMinutesLogged: validActualMinutes,
          },
          include: {
            task: {
              select: { id: true, title: true, remainingHours: true, status: true },
            },
            subject: {
              select: { id: true, code: true, name: true, colorKey: true },
            },
          },
        });
      });

      res.json({
        success: true,
        message: `Study session status updated to ${targetStatus.toLowerCase()}`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/schedule/sessions/:id
  // Deletes a study block with lock protection
  static async deleteSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const sessionId = validateId(req.params.id, 'Session ID');
      const { force } = req.query;

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        throw ApiError.notFound('Study session block not found');
      }

      if (session.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this study session');
      }

      // Hard integrity rule: Locked sessions require force=true confirmation to delete
      if (session.locked && force !== 'true') {
        throw ApiError.badRequest(
          'This study session is LOCKED. Pass force=true to explicitly confirm removal of a locked session.'
        );
      }

      await prisma.studySession.delete({
        where: { id: sessionId },
      });

      res.json({
        success: true,
        message: 'Study block removed from schedule',
      });
    } catch (err) {
      next(err);
    }
  }
}
