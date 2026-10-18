/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import {
  validateString,
  validateNumber,
  validateId,
  validateIsoDateTime,
  validateTaskPriority,
  validateTaskStatus,
  validateTaskType,
  validateSubtasks,
} from '../utils/validators';

export class TaskController {
  // GET /api/tasks (With search, filters, sorting, and pagination)
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const {
        subjectId,
        status,
        priority,
        type,
        search,
        sortBy,
        sortOrder,
        page,
        limit,
      } = req.query;

      const whereClause: any = { userId };

      if (subjectId && typeof subjectId === 'string' && subjectId !== 'all') {
        whereClause.subjectId = validateId(subjectId, 'Subject ID filter');
      }

      if (status && typeof status === 'string' && status !== 'all') {
        const s = status.toUpperCase();
        if (['BACKLOG', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(s)) {
          whereClause.status = s;
        } else if (status === 'active') {
          // 'active' matches anything not completed
          whereClause.status = { not: 'COMPLETED' };
        }
      }

      if (priority && typeof priority === 'string' && priority !== 'all') {
        const p = priority.toUpperCase();
        if (['URGENT', 'HIGH', 'MEDIUM', 'LOW'].includes(p)) {
          whereClause.priority = p;
        } else if (priority === 'high_urgent') {
          whereClause.priority = { in: ['URGENT', 'HIGH'] };
        }
      }

      if (type && typeof type === 'string' && type !== 'all') {
        whereClause.type = validateTaskType(type);
      }

      if (search && typeof search === 'string' && search.trim()) {
        const query = search.trim();
        whereClause.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
          { subject: { code: { contains: query, mode: 'insensitive' } } },
          { subject: { name: { contains: query, mode: 'insensitive' } } },
        ];
      }

      // Sorting
      let orderBy: any = { dueDate: 'asc' };
      if (sortBy === 'dueDateDesc') {
        orderBy = { dueDate: 'desc' };
      } else if (sortBy === 'priorityDesc') {
        orderBy = [{ priority: 'asc' }, { dueDate: 'asc' }];
      } else if (sortBy === 'hoursDesc') {
        orderBy = { remainingHours: 'desc' };
      } else if (sortBy === 'hoursAsc') {
        orderBy = { remainingHours: 'asc' };
      } else if (sortBy === 'title') {
        orderBy = { title: sortOrder === 'desc' ? 'desc' : 'asc' };
      }

      // Pagination
      const pageNum = page ? Math.max(1, parseInt(String(page), 10) || 1) : 1;
      const pageSize = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50)) : 50;
      const skip = (pageNum - 1) * pageSize;

      const [total, tasks] = await Promise.all([
        prisma.task.count({ where: whereClause }),
        prisma.task.findMany({
          where: whereClause,
          include: {
            subject: {
              select: { id: true, code: true, name: true, colorKey: true, credits: true },
            },
            studySessions: {
              select: { id: true, date: true, startTime: true, endTime: true, completed: true },
            },
          },
          orderBy,
          skip,
          take: pageSize,
        }),
      ]);

      res.json({
        success: true,
        data: tasks,
        pagination: {
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

  // GET /api/tasks/:id (Retrieve one task owned by authenticated student)
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const taskId = validateId(req.params.id, 'Task ID');

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          subject: {
            select: { id: true, code: true, name: true, colorKey: true, instructor: true },
          },
          studySessions: {
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          },
        },
      });

      if (!task) {
        throw ApiError.notFound('Assignment task not found');
      }

      if (task.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not have permission to view this assignment');
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/tasks
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const {
        subjectId,
        title,
        dueDate,
        estimatedHours,
        remainingHours,
        type,
        priority,
        status,
        notes,
        subtasks,
      } = req.body;

      const validSubjectId = validateId(subjectId, 'Subject ID');

      // Verify that the student owns the target subject
      const subject = await prisma.subject.findUnique({
        where: { id: validSubjectId },
      });
      if (!subject || (subject.userId !== userId && req.user!.role !== 'admin')) {
        throw ApiError.forbidden('Specified course subject does not belong to your account');
      }

      const validTitle = validateString(title, 'Assignment Title', 2, 140);
      const validDueDate = validateIsoDateTime(dueDate, 'Due date');
      const validEstimated = validateNumber(
        estimatedHours !== undefined ? estimatedHours : 2.0,
        'Estimated hours',
        0.25,
        100
      );
      const validRemaining = validateNumber(
        remainingHours !== undefined ? remainingHours : validEstimated,
        'Remaining hours',
        0,
        validEstimated
      );

      const validPriority = validateTaskPriority(priority).toUpperCase() as 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
      const validStatus = validateTaskStatus(status).toUpperCase() as 'BACKLOG' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
      const validType = validateTaskType(type);
      const validSubtasksList = validateSubtasks(subtasks);

      // If status is completed upon creation, remaining hours must be 0
      const finalRemaining = validStatus === 'COMPLETED' ? 0 : validRemaining;

      const newTask = await prisma.task.create({
        data: {
          userId,
          subjectId: validSubjectId,
          title: validTitle,
          dueDate: validDueDate,
          estimatedHours: validEstimated,
          remainingHours: finalRemaining,
          type: validType,
          priority: validPriority,
          status: validStatus,
          notes: notes ? validateString(notes, 'Notes', 0, 2000) : null,
          subtasks: validSubtasksList as any,
        },
        include: {
          subject: {
            select: { id: true, code: true, name: true, colorKey: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Assignment added to queue',
        data: newTask,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/tasks/:id (Strict student ownership check)
  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const taskId = validateId(req.params.id, 'Task ID');

      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });
      if (!task) {
        throw ApiError.notFound('Assignment task not found');
      }

      if (task.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not have access to this assignment');
      }

      const {
        subjectId,
        title,
        dueDate,
        estimatedHours,
        remainingHours,
        type,
        priority,
        status,
        notes,
        subtasks,
      } = req.body;

      const updates: any = {};

      if (subjectId !== undefined) {
        const validSubjectId = validateId(subjectId, 'Subject ID');
        const subject = await prisma.subject.findUnique({ where: { id: validSubjectId } });
        if (!subject || (subject.userId !== userId && req.user!.role !== 'admin')) {
          throw ApiError.forbidden('Destination course subject does not belong to your account');
        }
        updates.subjectId = validSubjectId;
      }

      if (title !== undefined) {
        updates.title = validateString(title, 'Title', 2, 140);
      }
      if (dueDate !== undefined) {
        updates.dueDate = validateIsoDateTime(dueDate, 'Due date');
      }
      if (estimatedHours !== undefined) {
        updates.estimatedHours = validateNumber(estimatedHours, 'Estimated hours', 0.25, 100);
      }
      if (remainingHours !== undefined) {
        const targetEstimated = updates.estimatedHours || task.estimatedHours;
        updates.remainingHours = validateNumber(remainingHours, 'Remaining hours', 0, targetEstimated);
      }
      if (type !== undefined) {
        updates.type = validateTaskType(type);
      }
      if (priority !== undefined) {
        updates.priority = validateTaskPriority(priority).toUpperCase();
      }
      if (status !== undefined) {
        const newStatus = validateTaskStatus(status).toUpperCase();
        updates.status = newStatus;
        // Consistency guarantee: marking completed zeros out remaining workload
        if (newStatus === 'COMPLETED') {
          updates.remainingHours = 0;
        } else if (task.status === 'COMPLETED' && remainingHours === undefined) {
          // If reopened and remainingHours was not explicitly given, restore to estimated
          updates.remainingHours = updates.estimatedHours || task.estimatedHours;
        }
      }
      if (notes !== undefined) {
        updates.notes = notes ? validateString(notes, 'Notes', 0, 2000) : null;
      }
      if (subtasks !== undefined) {
        updates.subtasks = validateSubtasks(subtasks) as any;
      }

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: updates,
        include: {
          subject: {
            select: { id: true, code: true, name: true, colorKey: true },
          },
        },
      });

      res.json({
        success: true,
        message: 'Assignment updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/tasks/:id/complete (Dedicated 1-click status & progress toggle)
  static async toggleComplete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const taskId = validateId(req.params.id, 'Task ID');

      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });
      if (!task) {
        throw ApiError.notFound('Assignment task not found');
      }

      if (task.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this assignment');
      }

      const isNowCompleted = task.status !== 'COMPLETED';
      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: isNowCompleted ? 'COMPLETED' : 'IN_PROGRESS',
          remainingHours: isNowCompleted ? 0 : task.estimatedHours,
        },
        include: {
          subject: {
            select: { id: true, code: true, name: true, colorKey: true },
          },
        },
      });

      res.json({
        success: true,
        message: isNowCompleted ? 'Assignment marked as completed' : 'Assignment reopened into progress queue',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/tasks/:id (Strict student ownership + cascading delete of study blocks)
  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const taskId = validateId(req.params.id, 'Task ID');

      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });
      if (!task) {
        throw ApiError.notFound('Assignment task not found');
      }

      if (task.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not have access to this assignment');
      }

      // Deleting task automatically cascades to related studySessions via schema onDelete: Cascade
      await prisma.task.delete({
        where: { id: taskId },
      });

      res.json({
        success: true,
        message: 'Assignment and related scheduled study blocks removed',
      });
    } catch (err) {
      next(err);
    }
  }
}
