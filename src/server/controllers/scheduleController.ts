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
  validateBoolean,
} from '../utils/validators';
import { StudyFlowSchedulerEngine } from '../services/scheduler/schedulerEngine';

function intervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function assertManualSessionConstraints(
  tx: any,
  params: {
    userId: string;
    date: string;
    start: string;
    end: string;
    durationMinutes: number;
    taskDueDate: Date;
    excludeSessionId?: string;
  }
) {
  const { userId, date, start, end, durationMinutes, taskDueDate, excludeSessionId } = params;
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  const [preferences, availability, existingSessions] = await Promise.all([
    tx.user.findUnique({
      where: { id: userId },
      select: {
        targetDailyStudyCapHours: true,
        preferredBreakMinutes: true,
        bufferMinutes: true,
      },
    }),
    tx.availabilitySlot.findMany({ where: { userId, dayOfWeek } }),
    tx.studySession.findMany({
      where: {
        userId,
        date,
        status: { not: 'CANCELLED' },
        ...(excludeSessionId ? { NOT: { id: excludeSessionId } } : {}),
      },
    }),
  ]);

  if (!preferences) throw ApiError.notFound('Student account not found');

  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  const preferredWindows = availability.filter(
    (slot: any) => String(slot.type).toUpperCase() === 'PREFERRED_STUDY'
  );
  if (
    preferredWindows.length > 0 &&
    !preferredWindows.some(
      (slot: any) => startMinutes >= timeToMinutes(slot.startTime) && endMinutes <= timeToMinutes(slot.endTime)
    )
  ) {
    throw ApiError.badRequest('Study session must fit inside a preferred study window for this day');
  }

  const bufferMinutes = preferences.bufferMinutes || 0;
  for (const slot of availability.filter(
    (item: any) => String(item.type).toUpperCase() !== 'PREFERRED_STUDY'
  )) {
    const busyStart = Math.max(0, timeToMinutes(slot.startTime) - bufferMinutes);
    const busyEnd = Math.min(24 * 60, timeToMinutes(slot.endTime) + bufferMinutes);
    if (startMinutes < busyEnd && busyStart < endMinutes) {
      throw ApiError.conflict(
        `Study session conflicts with ${slot.label || String(slot.type).toLowerCase()} time and its transition buffer`
      );
    }
  }

  const requiredBreak = preferences.preferredBreakMinutes || 0;
  for (const existing of existingSessions) {
    const existingStart = timeToMinutes(existing.startTime);
    const existingEnd = timeToMinutes(existing.endTime);
    if (startMinutes < existingEnd + requiredBreak && existingStart - requiredBreak < endMinutes) {
      throw ApiError.conflict(
        `Study session must leave at least ${requiredBreak} minutes between study blocks`
      );
    }
  }

  const plannedMinutes = existingSessions.reduce(
    (total: number, session: any) => total + session.durationMinutes,
    0
  );
  const dailyCapMinutes = Math.round(preferences.targetDailyStudyCapHours * 60);
  if (plannedMinutes + durationMinutes > dailyCapMinutes) {
    throw ApiError.badRequest(
      `Study session exceeds the ${preferences.targetDailyStudyCapHours} hour daily study cap`
    );
  }

  const sessionEnd = new Date(`${date}T${end}:00`);
  if (sessionEnd.getTime() > taskDueDate.getTime()) {
    throw ApiError.badRequest('Study session must end before the task deadline');
  }
}

export class ScheduleController {
  // GET /api/schedule
  // Retrieves the student's schedule overview with day/week groupings, metrics, and unscheduled deliverables
  static async getSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      // Default date window: today to +7 days if not provided
      const todayStr = localDateKey();
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

      // Derive coverage from every future, active session rather than only the displayed range.
      // Cancelled/missed/completed history must not hide work from the unscheduled queue.
      const futureScheduledSessions = await prisma.studySession.findMany({
        where: {
          userId,
          date: { gte: todayStr },
          status: 'SCHEDULED',
        },
        select: { taskId: true },
      });
      const scheduledTaskIds = new Set(futureScheduledSessions.map((session: any) => session.taskId));
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
      sessions.forEach((s: any) => {
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
            completedSessions: sessions.filter((s: any) => s.completed || s.status === 'COMPLETED').length,
            lockedSessions: sessions.filter((s: any) => s.locked).length,
            totalMinutesScheduled: sessions.reduce((acc: number, s: any) => acc + s.durationMinutes, 0),
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
      const newSession = await prisma.$transaction(async (tx: any) => {
        await assertManualSessionConstraints(tx, {
          userId,
          date: validDate,
          start,
          end,
          durationMinutes,
          taskDueDate: task.dueDate,
        });

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
            locked: locked === undefined ? false : validateBoolean(locked, 'Locked'),
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
      }, { isolationLevel: 'Serializable' });

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
        include: { task: { select: { dueDate: true } } },
      });
      if (!session) {
        throw ApiError.notFound('Study session block not found');
      }

      if (session.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this study session');
      }

      const { date, startTime, endTime, notes, locked, unlockExplicit } = req.body;

      const changesCompletedSessionTiming =
        (session.status === 'COMPLETED' || session.completed) &&
        ((date !== undefined && date !== session.date) ||
          (startTime !== undefined && startTime !== session.startTime) ||
          (endTime !== undefined && endTime !== session.endTime));
      if (changesCompletedSessionTiming) {
        throw ApiError.badRequest('Reopen a completed session before changing its date or duration');
      }

      // Hard integrity rule: Locked sessions cannot have their time or date modified without explicit unlock
      const explicitlyUnlocked = unlockExplicit === undefined
        ? false
        : validateBoolean(unlockExplicit, 'Explicit unlock');
      if (session.locked && !explicitlyUnlocked && (date !== undefined || startTime !== undefined || endTime !== undefined)) {
        throw ApiError.badRequest(
          'This study session is LOCKED to protect your committed study time. You must explicitly unlock it to modify date or time.'
        );
      }

      const targetDate = date ? validateDateFormat(date, 'Date') : session.date;
      const targetStart = startTime ? validateTimeInterval(startTime, endTime || session.endTime).start : session.startTime;
      const targetEnd = endTime ? validateTimeInterval(startTime || session.startTime, endTime).end : session.endTime;
      const { start, end, durationMinutes } = validateTimeInterval(targetStart, targetEnd);

      const targetLocked = locked !== undefined ? validateBoolean(locked, 'Locked') : session.locked;
      const targetNotes = notes !== undefined ? (notes ? validateString(notes, 'Notes', 0, 1000) : null) : session.notes;

      const updated = await prisma.$transaction(async (tx: any) => {
        const timingChanged =
          targetDate !== session.date || start !== session.startTime || end !== session.endTime;
        if (timingChanged) {
          await assertManualSessionConstraints(tx, {
            userId,
            date: targetDate,
            start,
            end,
            durationMinutes,
            taskDueDate: session.task.dueDate,
            excludeSessionId: sessionId,
          });
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
      }, { isolationLevel: 'Serializable' });

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

      const newLockState = locked !== undefined ? validateBoolean(locked, 'Locked') : !session.locked;

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

      if (status === undefined || status === null || status === '') {
        throw ApiError.badRequest('Session status is required');
      }

      const targetStatus = validateSessionStatus(status);

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw ApiError.notFound('Study session block not found');
      }

      if (session.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this study session');
      }

      const requestedActualMinutes = actualMinutesLogged !== undefined
        ? Math.round(validateNumber(actualMinutesLogged, 'Actual minutes logged', 0, 720))
        : undefined;

      // Execute status transition and task workload adjustment atomically. Numeric increment/decrement
      // operations prevent concurrent completions from overwriting one another with stale values.
      const result = await prisma.$transaction(async (tx: any) => {
        const currentSession = await tx.studySession.findUnique({
          where: { id: sessionId },
          include: { task: true },
        });
        if (!currentSession) throw ApiError.notFound('Study session block not found');

        const previousStatus = currentSession.status;
        const validActualMinutes = targetStatus === 'COMPLETED'
          ? requestedActualMinutes ?? currentSession.durationMinutes
          : currentSession.actualMinutesLogged;

        if (targetStatus === 'COMPLETED' && previousStatus !== 'COMPLETED') {
          const creditHours = validActualMinutes / 60;
          if (creditHours > 0) {
            const decremented = await tx.task.updateMany({
              where: { id: currentSession.taskId, remainingHours: { gte: creditHours } },
              data: { remainingHours: { decrement: creditHours } },
            });
            if (decremented.count === 0) {
              await tx.task.update({
                where: { id: currentSession.taskId },
                data: { remainingHours: 0 },
              });
            }
          }
        } else if (previousStatus === 'COMPLETED' && targetStatus !== 'COMPLETED') {
          const restoreHours = (currentSession.actualMinutesLogged ?? currentSession.durationMinutes) / 60;
          if (restoreHours > 0) {
            const incremented = await tx.task.updateMany({
              where: {
                id: currentSession.taskId,
                remainingHours: { lte: Math.max(0, currentSession.task.estimatedHours - restoreHours) },
              },
              data: { remainingHours: { increment: restoreHours } },
            });
            if (incremented.count === 0) {
              await tx.task.update({
                where: { id: currentSession.taskId },
                data: { remainingHours: currentSession.task.estimatedHours },
              });
            }
          }
        }

        if (targetStatus !== previousStatus) {
          const updatedTask = await tx.task.findUnique({ where: { id: currentSession.taskId } });
          if (updatedTask) {
            await tx.task.update({
              where: { id: currentSession.taskId },
              data: { status: updatedTask.remainingHours <= 0 ? 'COMPLETED' : 'IN_PROGRESS' },
            });
          }
        }

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
        include: { task: true },
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

      await prisma.$transaction(async (tx: any) => {
        if (session.status === 'COMPLETED' || session.completed) {
          const restoreHours = (session.actualMinutesLogged ?? session.durationMinutes) / 60;
          const restoredRemaining = Math.min(
            session.task.estimatedHours,
            session.task.remainingHours + restoreHours
          );
          await tx.task.update({
            where: { id: session.taskId },
            data: {
              remainingHours: restoredRemaining,
              status: restoredRemaining > 0 ? 'IN_PROGRESS' : 'COMPLETED',
            },
          });
        }
        await tx.studySession.delete({
          where: { id: sessionId },
        });
      }, { isolationLevel: 'Serializable' });

      res.json({
        success: true,
        message: 'Study block removed from schedule',
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/schedule/generate
  // Invokes the recursive backtracking constraint scheduler, validates hard constraints,
  // atomically replaces unlocked sessions, and returns persisted sessions and unscheduled task diagnostics.
  static async generateSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const {
        startDate,
        endDate,
        mode,
        targetDailyStudyCapHours,
        defaultSessionMinutes,
        preferredBreakMinutes,
        bufferMinutes,
        preferredStudyTime,
        searchBudgetSteps,
        searchTimeoutMs,
      } = req.body || {};

      // 1. Date normalization & validation
      const todayStr = localDateKey();
      const startStr = startDate ? validateDateFormat(String(startDate), 'Start date') : todayStr;

      let endStr: string;
      if (endDate) {
        endStr = validateDateFormat(String(endDate), 'End date');
      } else {
        const d = new Date(startStr);
        d.setDate(d.getDate() + 7);
        endStr = d.toISOString().split('T')[0];
      }

      const startMs = new Date(startStr).getTime();
      const endMs = new Date(endStr).getTime();
      const diffDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        throw ApiError.badRequest('End date must be on or after start date');
      }
      if (diffDays > 60) {
        throw ApiError.badRequest('Scheduling horizon cannot exceed 60 days');
      }

      // 2. Mode validation
      const normalizedMode = mode ? String(mode).toUpperCase() : 'BALANCED';
      if (!['BALANCED', 'FRONT_LOADED', 'POMODORO'].includes(normalizedMode)) {
        throw ApiError.badRequest('Invalid schedule mode. Must be BALANCED, FRONT_LOADED, or POMODORO');
      }

      // 3. Load authenticated student's user profile & preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw ApiError.notFound('User profile not found');
      }

      const effectiveDailyCap = targetDailyStudyCapHours !== undefined
        ? validateNumber(targetDailyStudyCapHours, 'Daily study cap', 0.5, 16)
        : user.targetDailyStudyCapHours;

      const effectiveSessionMinutes = defaultSessionMinutes !== undefined
        ? Math.round(validateNumber(defaultSessionMinutes, 'Default session minutes', 15, 240))
        : user.defaultSessionMinutes;

      const effectiveBreakMinutes = preferredBreakMinutes !== undefined
        ? Math.round(validateNumber(preferredBreakMinutes, 'Preferred break minutes', 0, 60))
        : user.preferredBreakMinutes;

      const effectiveBufferMinutes = bufferMinutes !== undefined
        ? Math.round(validateNumber(bufferMinutes, 'Buffer minutes', 0, 60))
        : user.bufferMinutes;

      const effectiveStudyTime = preferredStudyTime !== undefined
        ? (preferredStudyTime ? String(preferredStudyTime).toLowerCase() : undefined)
        : (user.preferredStudyTime ? String(user.preferredStudyTime).toLowerCase() : undefined);

      // 4. Load student's active tasks (status != COMPLETED, remainingHours > 0)
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          status: { not: 'COMPLETED' },
          remainingHours: { gt: 0 },
        },
        include: {
          subject: {
            select: { id: true, code: true, name: true, colorKey: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      // 5. Load student's weekly availability slots
      const availabilitySlots = await prisma.availabilitySlot.findMany({
        where: { userId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      // 6. Load existing sessions in scheduling horizon
      const existingSessions = await prisma.studySession.findMany({
        where: {
          userId,
          date: { gte: startStr, lte: endStr },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });

      // 7. Invoke the Recursive Backtracking Scheduling Engine
      const engineResult = StudyFlowSchedulerEngine.generateSchedule(
        tasks.map((t: any) => ({
          id: t.id,
          userId: t.userId,
          subjectId: t.subjectId,
          title: t.title,
          dueDate: t.dueDate,
          estimatedHours: t.estimatedHours,
          remainingHours: t.remainingHours,
          priority: t.priority as any,
          status: t.status,
          type: t.type,
        })),
        availabilitySlots.map((a: any) => ({
          id: a.id,
          userId: a.userId,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          type: a.type as any,
          label: a.label,
        })),
        existingSessions.map((s: any) => ({
          id: s.id,
          userId: s.userId,
          taskId: s.taskId,
          subjectId: s.subjectId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          durationMinutes: s.durationMinutes,
          completed: s.completed,
          status: s.status,
          locked: s.locked,
          notes: s.notes,
        })),
        {
          startDate: startStr,
          endDate: endStr,
          mode: normalizedMode as any,
          targetDailyStudyCapHours: effectiveDailyCap,
          defaultSessionMinutes: effectiveSessionMinutes,
          preferredBreakMinutes: effectiveBreakMinutes,
          bufferMinutes: effectiveBufferMinutes,
          preferredStudyTime: effectiveStudyTime as any,
          searchBudgetSteps: searchBudgetSteps ? Math.round(Number(searchBudgetSteps)) : 25000,
          searchTimeoutMs: searchTimeoutMs ? Math.round(Number(searchTimeoutMs)) : 4000,
        }
      );

      // 8. Safe Transactional Persistence:
      // Invariant: Locked sessions and completed sessions are NEVER modified or deleted.
      // Invariant: Unlocked sessions within the horizon are replaced with the newly generated schedule.
      const persistedSessions = await prisma.$transaction(async (tx: any) => {
        // Fetch current locked and completed sessions in range
        const protectedSessions = await tx.studySession.findMany({
          where: {
            userId,
            date: { gte: startStr, lte: endStr },
            OR: [{ locked: true }, { completed: true }, { status: 'COMPLETED' }],
          },
        });

        // Double-check: verify that no newly generated session overlaps any protected session
        for (const gen of engineResult.newSessions) {
          for (const prot of protectedSessions) {
            if (gen.date === prot.date) {
              if (intervalsOverlap(gen.startTime, gen.endTime, prot.startTime, prot.endTime)) {
                throw ApiError.conflict(
                  `Integrity violation: Generated study block for task ${gen.taskId} (${gen.startTime} - ${gen.endTime}) overlaps protected session (${prot.startTime} - ${prot.endTime}) on ${gen.date}`
                );
              }
            }
          }
        }

        // Atomically delete only unlocked, non-completed sessions within the horizon
        await tx.studySession.deleteMany({
          where: {
            userId,
            date: { gte: startStr, lte: endStr },
            locked: false,
            completed: false,
            status: { not: 'COMPLETED' },
          },
        });

        // Atomically insert the newly generated study blocks
        if (engineResult.newSessions.length > 0) {
          await tx.studySession.createMany({
            data: engineResult.newSessions.map((s: any) => ({
              userId,
              taskId: s.taskId,
              subjectId: s.subjectId,
              date: s.date,
              startTime: s.startTime,
              endTime: s.endTime,
              durationMinutes: s.durationMinutes,
              completed: false,
              locked: false,
              status: 'SCHEDULED',
              notes: s.notes || null,
            })),
          });
        }

        // Return all sessions in the horizon (both preserved and newly created)
        return tx.studySession.findMany({
          where: {
            userId,
            date: { gte: startStr, lte: endStr },
          },
          include: {
            task: {
              select: {
                id: true,
                title: true,
                priority: true,
                status: true,
                dueDate: true,
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
      });

      res.status(200).json({
        success: true,
        message: `Schedule generated successfully: ${engineResult.newSessions.length} sessions allocated (${engineResult.preservedSessions.length} locked/completed blocks preserved)`,
        data: {
          dateRange: {
            startDate: startStr,
            endDate: endStr,
            totalDays: diffDays + 1,
          },
          sessions: persistedSessions,
          generatedCount: engineResult.newSessions.length,
          preservedCount: engineResult.preservedSessions.length,
          unscheduledTasks: engineResult.unscheduledTasks,
          warnings: engineResult.warnings,
          summary: engineResult.summary,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
