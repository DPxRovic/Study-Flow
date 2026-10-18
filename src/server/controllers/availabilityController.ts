/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import {
  validateId,
  validateDayOfWeek,
  validateTimeInterval,
  validateSlotType,
  validateString,
  validateStudyPreferences,
} from '../utils/validators';

/**
 * Checks whether [startA, endA) and [startB, endB) overlap.
 * Uses strict inequality because adjacent periods (e.g. 09:00-10:00 and 10:00-11:00) do NOT overlap.
 */
function intervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

export class AvailabilityController {
  // GET /api/availability (Returns weekly recurring slots for authenticated student)
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { dayOfWeek } = req.query;

      const whereClause: any = { userId };
      if (dayOfWeek !== undefined) {
        whereClause.dayOfWeek = validateDayOfWeek(dayOfWeek);
      }

      const userSlots = await prisma.availabilitySlot.findMany({
        where: whereClause,
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      // Group summaries by day for easy scheduler client consumption
      const summaryByDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      userSlots.forEach((slot) => {
        const [sh, sm] = slot.startTime.split(':').map(Number);
        const [eh, em] = slot.endTime.split(':').map(Number);
        const duration = eh * 60 + em - (sh * 60 + sm);
        summaryByDay[slot.dayOfWeek] = (summaryByDay[slot.dayOfWeek] || 0) + duration;
      });

      res.json({
        success: true,
        data: userSlots,
        meta: {
          totalSlots: userSlots.length,
          totalMinutesByDay: summaryByDay,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/availability/:id (Retrieve a single slot)
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const slotId = validateId(req.params.id, 'Availability Slot ID');

      const slot = await prisma.availabilitySlot.findUnique({
        where: { id: slotId },
      });

      if (!slot) {
        throw ApiError.notFound('Availability slot not found');
      }

      if (slot.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not have permission to view this availability slot');
      }

      res.json({
        success: true,
        data: slot,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/availability (Create an availability slot with concurrency-safe overlap check)
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { dayOfWeek, startTime, endTime, type, label } = req.body;

      const validDay = validateDayOfWeek(dayOfWeek);
      const { start, end } = validateTimeInterval(startTime, endTime);
      const slotType = validateSlotType(type);
      const validLabel = label ? validateString(label, 'Slot label', 1, 100) : null;

      // Mapping to Prisma Schema Enum
      let dbSlotType: 'PREFERRED_STUDY' | 'CLASS' | 'WORK' | 'PERSONAL' = 'PREFERRED_STUDY';
      if (slotType === 'class') dbSlotType = 'CLASS';
      else if (slotType === 'work') dbSlotType = 'WORK';
      else if (slotType === 'personal') dbSlotType = 'PERSONAL';

      // Execute inside Prisma transaction to prevent concurrent race condition overlaps
      const createdSlot = await prisma.$transaction(async (tx) => {
        // Query all existing slots on that day for this student
        const daySlots = await tx.availabilitySlot.findMany({
          where: {
            userId,
            dayOfWeek: validDay,
          },
        });

        // Detect overlapping intervals
        for (const existing of daySlots) {
          if (intervalsOverlap(start, end, existing.startTime, existing.endTime)) {
            throw ApiError.conflict(
              `Time slot ${start} - ${end} overlaps with existing slot "${existing.label || existing.type}" (${existing.startTime} - ${existing.endTime}) on day ${validDay}`
            );
          }
        }

        return tx.availabilitySlot.create({
          data: {
            userId,
            dayOfWeek: validDay,
            startTime: start,
            endTime: end,
            type: dbSlotType,
            label: validLabel,
          },
        });
      });

      res.status(201).json({
        success: true,
        message: 'Availability slot saved successfully',
        data: createdSlot,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/availability/:id (Update an availability slot)
  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const slotId = validateId(req.params.id, 'Availability Slot ID');

      const existingSlot = await prisma.availabilitySlot.findUnique({
        where: { id: slotId },
      });

      if (!existingSlot) {
        throw ApiError.notFound('Availability slot not found');
      }

      if (existingSlot.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this availability slot');
      }

      const { dayOfWeek, startTime, endTime, type, label } = req.body;

      const targetDay = dayOfWeek !== undefined ? validateDayOfWeek(dayOfWeek) : existingSlot.dayOfWeek;
      const targetStart = startTime !== undefined ? startTime : existingSlot.startTime;
      const targetEnd = endTime !== undefined ? endTime : existingSlot.endTime;

      const { start, end } = validateTimeInterval(targetStart, targetEnd);

      let dbSlotType = existingSlot.type;
      if (type !== undefined) {
        const slotType = validateSlotType(type);
        if (slotType === 'class') dbSlotType = 'CLASS';
        else if (slotType === 'work') dbSlotType = 'WORK';
        else if (slotType === 'personal') dbSlotType = 'PERSONAL';
        else dbSlotType = 'PREFERRED_STUDY';
      }

      const targetLabel = label !== undefined ? (label ? validateString(label, 'Slot label', 1, 100) : null) : existingSlot.label;

      const updatedSlot = await prisma.$transaction(async (tx) => {
        // Query other slots on the target day for this student
        const daySlots = await tx.availabilitySlot.findMany({
          where: {
            userId,
            dayOfWeek: targetDay,
            NOT: { id: slotId },
          },
        });

        // Detect overlapping intervals
        for (const other of daySlots) {
          if (intervalsOverlap(start, end, other.startTime, other.endTime)) {
            throw ApiError.conflict(
              `Updated time slot ${start} - ${end} overlaps with existing slot "${other.label || other.type}" (${other.startTime} - ${other.endTime}) on day ${targetDay}`
            );
          }
        }

        return tx.availabilitySlot.update({
          where: { id: slotId },
          data: {
            dayOfWeek: targetDay,
            startTime: start,
            endTime: end,
            type: dbSlotType,
            label: targetLabel,
          },
        });
      });

      res.json({
        success: true,
        message: 'Availability slot updated successfully',
        data: updatedSlot,
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/availability/:id (Delete slot with strict student ownership)
  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const slotId = validateId(req.params.id, 'Availability Slot ID');

      const slot = await prisma.availabilitySlot.findUnique({
        where: { id: slotId },
      });

      if (!slot) {
        throw ApiError.notFound('Availability slot not found');
      }

      if (slot.userId !== userId && req.user!.role !== 'admin') {
        throw ApiError.forbidden('You do not own this availability block');
      }

      await prisma.availabilitySlot.delete({
        where: { id: slotId },
      });

      res.json({
        success: true,
        message: 'Availability slot removed successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/availability/preferences (Get student study scheduling preferences)
  static async getPreferences(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          targetDailyStudyCapHours: true,
          defaultSessionMinutes: true,
          preferredBreakMinutes: true,
          preferredStudyTime: true,
          bufferMinutes: true,
          term: true,
        },
      });

      if (!user) {
        throw ApiError.notFound('Student account not found');
      }

      res.json({
        success: true,
        data: {
          targetDailyStudyCapHours: user.targetDailyStudyCapHours,
          defaultSessionMinutes: user.defaultSessionMinutes,
          preferredBreakMinutes: user.preferredBreakMinutes,
          preferredStudyTime: user.preferredStudyTime || 'afternoon',
          bufferMinutes: user.bufferMinutes,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/availability/preferences (Update study scheduling preferences with validation)
  static async updatePreferences(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validatedPrefs = validateStudyPreferences(req.body);

      if (Object.keys(validatedPrefs).length === 0) {
        throw ApiError.badRequest('At least one study preference field must be provided to update');
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: validatedPrefs,
        select: {
          targetDailyStudyCapHours: true,
          defaultSessionMinutes: true,
          preferredBreakMinutes: true,
          preferredStudyTime: true,
          bufferMinutes: true,
        },
      });

      res.json({
        success: true,
        message: 'Study preferences updated successfully',
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  }
}
