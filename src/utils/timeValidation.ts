/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AvailabilitySlot } from '../types';

export interface DayInfo {
  id: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  short: string;
}

export const DAYS_OF_WEEK: DayInfo[] = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 0, name: 'Sunday', short: 'Sun' },
];

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return -1;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

export function minutesToTimeString(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function calculateHours(startTime: string, endTime: string): number {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  if (startMin < 0 || endMin < 0 || endMin <= startMin) return 0;
  return (endMin - startMin) / 60;
}

export interface SlotValidationResult {
  isValid: boolean;
  durationMinutes: number;
  error: string | null;
  conflictingSlot?: AvailabilitySlot;
}

/**
 * Validates availability slot constraints:
 * - valid day and time format
 * - start time before end time
 * - non-zero duration (at least 15 mins)
 * - prevents accidental overlapping periods on the same day
 */
export function validateSlot(
  slot: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    id?: string;
    label?: string;
  },
  existingSlots: AvailabilitySlot[]
): SlotValidationResult {
  if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
    return {
      isValid: false,
      durationMinutes: 0,
      error: 'Please select a valid day of the week.',
    };
  }

  const startMin = parseTimeToMinutes(slot.startTime);
  const endMin = parseTimeToMinutes(slot.endTime);

  if (startMin === -1) {
    return {
      isValid: false,
      durationMinutes: 0,
      error: 'Please enter a valid start time in HH:MM format.',
    };
  }

  if (endMin === -1) {
    return {
      isValid: false,
      durationMinutes: 0,
      error: 'Please enter a valid end time in HH:MM format.',
    };
  }

  if (startMin === endMin) {
    return {
      isValid: false,
      durationMinutes: 0,
      error: 'Start time and end time cannot be identical. A window must have positive duration.',
    };
  }

  if (endMin < startMin) {
    return {
      isValid: false,
      durationMinutes: 0,
      error: `End time (${slot.endTime}) cannot be earlier than start time (${slot.startTime}). Time windows must be within the same calendar day.`,
    };
  }

  const durationMinutes = endMin - startMin;

  if (durationMinutes < 15) {
    return {
      isValid: false,
      durationMinutes,
      error: `Window duration is only ${durationMinutes} minutes. The minimum time block allowed is 15 minutes.`,
    };
  }

  // Check for conflicts on the same day of the week
  const sameDaySlots = existingSlots.filter(
    (s) => s.dayOfWeek === slot.dayOfWeek && s.id !== slot.id
  );

  for (const existing of sameDaySlots) {
    const exStart = parseTimeToMinutes(existing.startTime);
    const exEnd = parseTimeToMinutes(existing.endTime);

    // Overlap condition: start < exEnd && end > exStart
    if (startMin < exEnd && endMin > exStart) {
      const existingLabel =
        existing.label ||
        (existing.type === 'preferred_study'
          ? 'Study Window'
          : existing.type === 'class'
          ? 'Class Commitment'
          : existing.type === 'work'
          ? 'Work Shift'
          : 'Personal Block');

      return {
        isValid: false,
        durationMinutes,
        error: `Time conflict detected: This window overlaps with "${existingLabel}" (${existing.startTime} – ${existing.endTime}). Adjust the time so periods do not clash.`,
        conflictingSlot: existing,
      };
    }
  }

  return {
    isValid: true,
    durationMinutes,
    error: null,
  };
}
