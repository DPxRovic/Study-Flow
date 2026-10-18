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
  validateSubjectCategory,
} from '../utils/validators';

export class SubjectController {
  // GET /api/subjects (Returns only subjects belonging to authenticated student)
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { search, category, page, limit } = req.query;

      const whereClause: any = { userId };

      if (category && typeof category === 'string' && category !== 'all') {
        whereClause.colorKey = validateSubjectCategory(category);
      }

      if (search && typeof search === 'string' && search.trim()) {
        const query = search.trim();
        whereClause.OR = [
          { code: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { instructor: { contains: query, mode: 'insensitive' } },
        ];
      }

      // Pagination support
      const pageNum = page ? Math.max(1, parseInt(String(page), 10) || 1) : 1;
      const pageSize = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 50;
      const skip = (pageNum - 1) * pageSize;

      const [total, subjects] = await Promise.all([
        prisma.subject.count({ where: whereClause }),
        prisma.subject.findMany({
          where: whereClause,
          include: {
            _count: {
              select: {
                tasks: true,
                studySessions: true,
              },
            },
          },
          orderBy: { code: 'asc' },
          skip,
          take: pageSize,
        }),
      ]);

      res.json({
        success: true,
        data: subjects,
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

  // GET /api/subjects/:id (Retrieve one subject owned by authenticated student)
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const subjectId = validateId(req.params.id, 'Subject ID');

      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: {
          tasks: {
            orderBy: { dueDate: 'asc' },
          },
          _count: {
            select: {
              tasks: true,
              studySessions: true,
            },
          },
        },
      });

      if (!subject) {
        throw ApiError.notFound('Course subject not found');
      }

      // Strict student ownership check: Prevent cross-user snooping
      if (subject.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not have permission to view this course');
      }

      res.json({
        success: true,
        data: subject,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/subjects
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { code, name, instructor, credits, colorKey, weeklyTargetHours, classroom, officeHours } = req.body;

      const validCode = validateString(code, 'Course Code', 2, 20).toUpperCase();
      const validName = validateString(name, 'Course Title', 2, 100);
      const validCredits = validateNumber(credits !== undefined ? credits : 4, 'Credits', 1, 12);
      const validHours = validateNumber(weeklyTargetHours !== undefined ? weeklyTargetHours : 6.0, 'Weekly Target Hours', 0.5, 40);
      const validColor = validateSubjectCategory(colorKey);

      // Check for duplicate course code in the student's active schedule
      const existing = await prisma.subject.findFirst({
        where: {
          userId,
          code: validCode,
        },
      });

      if (existing) {
        throw ApiError.conflict(`You are already enrolled in a course with code "${validCode}"`);
      }

      const newSubject = await prisma.subject.create({
        data: {
          userId,
          code: validCode,
          name: validName,
          instructor: instructor ? validateString(instructor, 'Instructor', 1, 100) : 'Staff Faculty',
          credits: validCredits,
          colorKey: validColor,
          weeklyTargetHours: validHours,
          classroom: classroom ? validateString(classroom, 'Classroom', 1, 100) : null,
          officeHours: officeHours ? validateString(officeHours, 'Office hours', 1, 150) : null,
        },
      });

      res.status(201).json({
        success: true,
        message: `Enrolled in ${newSubject.code}`,
        data: newSubject,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/subjects/:id (Strict student ownership check)
  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const subjectId = validateId(req.params.id, 'Subject ID');

      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
      });
      if (!subject) {
        throw ApiError.notFound('Course subject not found');
      }

      // Enforce strict ownership
      if (subject.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this subject');
      }

      const { code, name, instructor, credits, colorKey, weeklyTargetHours, classroom, officeHours } = req.body;
      const updates: any = {};

      if (code !== undefined) {
        const validCode = validateString(code, 'Course Code', 2, 20).toUpperCase();
        // Check duplicate code if updating code
        if (validCode !== subject.code) {
          const duplicate = await prisma.subject.findFirst({
            where: {
              userId,
              code: validCode,
              NOT: { id: subjectId },
            },
          });
          if (duplicate) {
            throw ApiError.conflict(`Another course already uses code "${validCode}"`);
          }
        }
        updates.code = validCode;
      }

      if (name !== undefined) {
        updates.name = validateString(name, 'Course Title', 2, 100);
      }
      if (instructor !== undefined) {
        updates.instructor = instructor ? validateString(instructor, 'Instructor', 1, 100) : null;
      }
      if (credits !== undefined) {
        updates.credits = validateNumber(credits, 'Credits', 1, 12);
      }
      if (colorKey !== undefined) {
        updates.colorKey = validateSubjectCategory(colorKey);
      }
      if (weeklyTargetHours !== undefined) {
        updates.weeklyTargetHours = validateNumber(weeklyTargetHours, 'Weekly Target Hours', 0.5, 40);
      }
      if (classroom !== undefined) {
        updates.classroom = classroom ? validateString(classroom, 'Classroom', 1, 100) : null;
      }
      if (officeHours !== undefined) {
        updates.officeHours = officeHours ? validateString(officeHours, 'Office hours', 1, 150) : null;
      }

      const updated = await prisma.subject.update({
        where: { id: subjectId },
        data: updates,
      });

      res.json({
        success: true,
        message: 'Course updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/subjects/:id (Strict student ownership + cascading delete by Prisma schema relation)
  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const subjectId = validateId(req.params.id, 'Subject ID');

      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: {
          _count: {
            select: {
              tasks: true,
              studySessions: true,
            },
          },
        },
      });

      if (!subject) {
        throw ApiError.notFound('Course subject not found');
      }

      if (subject.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this subject');
      }

      // Prisma relation onDelete: Cascade ensures atomic deletion of associated tasks & sessions
      await prisma.subject.delete({
        where: { id: subjectId },
      });

      res.json({
        success: true,
        message: `Subject ${subject.code} and ${subject._count.tasks} associated tasks removed from term catalog`,
      });
    } catch (err) {
      next(err);
    }
  }
}
