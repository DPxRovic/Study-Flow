/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiError } from '../utils/ApiError';
import { SubjectCategory, TaskPriority, TaskStatus, TaskType, SlotType } from '../../types';

export const VALID_SUBJECT_CATEGORIES: SubjectCategory[] = [
  'stem',
  'cs',
  'humanities',
  'science',
  'social',
  'arts',
];

export const VALID_TASK_TYPES: TaskType[] = [
  'assignment',
  'problem_set',
  'paper',
  'reading',
  'exam_prep',
  'project_milestone',
];

export const VALID_TASK_PRIORITIES: TaskPriority[] = [
  'urgent',
  'high',
  'medium',
  'low',
];

export const VALID_TASK_STATUSES: TaskStatus[] = [
  'backlog',
  'scheduled',
  'in_progress',
  'completed',
];

export const VALID_SLOT_TYPES: SlotType[] = [
  'preferred_study',
  'class',
  'work',
  'personal',
];

export const VALID_SESSION_STATUSES = [
  'scheduled',
  'completed',
  'missed',
  'cancelled',
] as const;

export const VALID_NOTIFICATION_CATEGORIES = [
  'deadline',
  'overdue',
  'conflict',
  'schedule',
  'task_completed',
  'announcement',
] as const;

export function validateNotificationCategory(category: any): string {
  if (!category) return 'deadline';
  const norm = String(category).toLowerCase();
  if (!VALID_NOTIFICATION_CATEGORIES.includes(norm as any)) {
    throw ApiError.badRequest(
      `Invalid notification category. Allowed values: ${VALID_NOTIFICATION_CATEGORIES.join(', ')}`
    );
  }
  return norm;
}

export function validateSessionStatus(status: any): 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CANCELLED' {
  if (!status) return 'SCHEDULED';
  const norm = String(status).toLowerCase();
  if (!VALID_SESSION_STATUSES.includes(norm as any)) {
    throw ApiError.badRequest(
      `Invalid study session status. Allowed values: ${VALID_SESSION_STATUSES.join(', ')}`
    );
  }
  return norm.toUpperCase() as 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
}

export function validateEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw ApiError.badRequest('Email address is required');
  }
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw ApiError.badRequest('Invalid university email address format');
  }
  return trimmed.toLowerCase();
}

export function validatePassword(password: string): string {
  if (!password || typeof password !== 'string') {
    throw ApiError.badRequest('Password is required');
  }
  if (password.length < 6) {
    throw ApiError.badRequest('Password must be at least 6 characters long');
  }
  return password;
}

export function validateString(val: any, fieldName: string, minLength = 1, maxLength = 255): string {
  if (val === undefined || val === null || typeof val !== 'string') {
    throw ApiError.badRequest(`${fieldName} must be a valid text string`);
  }
  const trimmed = val.trim();
  if (trimmed.length < minLength) {
    throw ApiError.badRequest(`${fieldName} cannot be empty`);
  }
  if (trimmed.length > maxLength) {
    throw ApiError.badRequest(`${fieldName} cannot exceed ${maxLength} characters`);
  }
  return trimmed;
}

export function validateNumber(val: any, fieldName: string, min = 0, max = 1000): number {
  if (val === undefined || val === null || val === '') {
    throw ApiError.badRequest(`${fieldName} is required`);
  }
  const num = Number(val);
  if (isNaN(num)) {
    throw ApiError.badRequest(`${fieldName} must be a valid number`);
  }
  if (num < min || num > max) {
    throw ApiError.badRequest(`${fieldName} must be between ${min} and ${max}`);
  }
  return num;
}

export function validateDayOfWeek(dayOfWeek: any): number {
  if (dayOfWeek === undefined || dayOfWeek === null || dayOfWeek === '') {
    throw ApiError.badRequest('Day of week is required');
  }
  const day = Number(dayOfWeek);
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw ApiError.badRequest('Day of week must be an integer between 0 (Sunday) and 6 (Saturday)');
  }
  return day;
}

export function validateTimeFormat(time: string, fieldName: string): string {
  if (!time || typeof time !== 'string') {
    throw ApiError.badRequest(`${fieldName} must be a valid time string`);
  }
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(time)) {
    throw ApiError.badRequest(`${fieldName} must follow HH:mm 24-hour format (e.g. 09:30 or 14:00)`);
  }
  return time;
}

export function validateTimeInterval(startTime: string, endTime: string): { start: string; end: string; durationMinutes: number } {
  const validStart = validateTimeFormat(startTime, 'Start time');
  const validEnd = validateTimeFormat(endTime, 'End time');

  const [startH, startM] = validStart.split(':').map(Number);
  const [endH, endM] = validEnd.split(':').map(Number);

  const startTotalMinutes = startH * 60 + startM;
  const endTotalMinutes = endH * 60 + endM;

  if (startTotalMinutes >= endTotalMinutes) {
    throw ApiError.badRequest(
      `Interval start time (${validStart}) must be strictly earlier than end time (${validEnd}). Overnight intervals across midnight are not supported on single-day availability slots.`
    );
  }

  const durationMinutes = endTotalMinutes - startTotalMinutes;
  if (durationMinutes < 15) {
    throw ApiError.badRequest('Availability interval duration must be at least 15 minutes');
  }

  return { start: validStart, end: validEnd, durationMinutes };
}

export function validateSlotType(type: any): SlotType {
  if (!type) return 'preferred_study';
  const raw = String(type).toLowerCase();
  
  if (raw === 'class_lecture' || raw === 'class') return 'class';
  if (raw === 'work_shift' || raw === 'work') return 'work';
  if (raw === 'personal_commitment' || raw === 'personal') return 'personal';
  if (raw === 'preferred_study') return 'preferred_study';

  if (!VALID_SLOT_TYPES.includes(raw as SlotType)) {
    throw ApiError.badRequest(`Invalid slot type "${type}". Allowed values: ${VALID_SLOT_TYPES.join(', ')}`);
  }
  return raw as SlotType;
}

export function validateStudyPreferences(prefs: any): {
  targetDailyStudyCapHours?: number;
  defaultSessionMinutes?: number;
  preferredBreakMinutes?: number;
  preferredStudyTime?: string;
  bufferMinutes?: number;
} {
  const result: any = {};

  if (prefs.targetDailyStudyCapHours !== undefined) {
    result.targetDailyStudyCapHours = validateNumber(
      prefs.targetDailyStudyCapHours,
      'Target daily study cap hours',
      1.0,
      14.0
    );
  }

  if (prefs.defaultSessionMinutes !== undefined) {
    result.defaultSessionMinutes = Math.round(
      validateNumber(prefs.defaultSessionMinutes, 'Default session duration (minutes)', 20, 180)
    );
  }

  if (prefs.preferredBreakMinutes !== undefined) {
    result.preferredBreakMinutes = Math.round(
      validateNumber(prefs.preferredBreakMinutes, 'Preferred break duration (minutes)', 5, 60)
    );
  }

  if (prefs.preferredStudyTime !== undefined) {
    const raw = String(prefs.preferredStudyTime).toLowerCase();
    const allowed = ['morning', 'afternoon', 'evening', 'flexible'];
    if (!allowed.includes(raw)) {
      throw ApiError.badRequest(`Invalid preferred study time. Allowed: ${allowed.join(', ')}`);
    }
    result.preferredStudyTime = raw;
  }

  if (prefs.bufferMinutes !== undefined) {
    result.bufferMinutes = Math.round(
      validateNumber(prefs.bufferMinutes, 'Transition buffer minutes', 0, 45)
    );
  }

  return result;
}

export function validateDateFormat(date: string, fieldName: string): string {
  if (!date || typeof date !== 'string') {
    throw ApiError.badRequest(`${fieldName} must be a valid date string`);
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw ApiError.badRequest(`${fieldName} must follow YYYY-MM-DD format (e.g. 2026-10-12)`);
  }
  return date;
}

export function validateIsoDateTime(dateTime: string, fieldName: string): Date {
  if (!dateTime || typeof dateTime !== 'string') {
    throw ApiError.badRequest(`${fieldName} must be a valid ISO date-time string`);
  }
  const parsed = new Date(dateTime);
  if (isNaN(parsed.getTime())) {
    throw ApiError.badRequest(`${fieldName} contains an invalid date value`);
  }
  return parsed;
}

export function validateId(id: string, fieldName = 'Resource ID'): string {
  if (!id || typeof id !== 'string') {
    throw ApiError.badRequest(`${fieldName} is required`);
  }
  const trimmed = id.trim();
  if (trimmed.length < 3 || trimmed.length > 128 || /[^a-zA-Z0-9_\-]/.test(trimmed)) {
    throw ApiError.badRequest(`${fieldName} has an invalid identifier format`);
  }
  return trimmed;
}

export function validateSubjectCategory(colorKey: any): SubjectCategory {
  if (!colorKey) return 'cs';
  const normalized = String(colorKey).toLowerCase() as SubjectCategory;
  if (!VALID_SUBJECT_CATEGORIES.includes(normalized)) {
    throw ApiError.badRequest(
      `Invalid subject colorKey category. Allowed values: ${VALID_SUBJECT_CATEGORIES.join(', ')}`
    );
  }
  return normalized;
}

export function validateTaskPriority(priority: any): TaskPriority {
  if (!priority) return 'medium';
  const normalized = String(priority).toLowerCase() as TaskPriority;
  if (!VALID_TASK_PRIORITIES.includes(normalized)) {
    throw ApiError.badRequest(
      `Invalid task priority. Allowed values: ${VALID_TASK_PRIORITIES.join(', ')}`
    );
  }
  return normalized;
}

export function validateTaskStatus(status: any): TaskStatus {
  if (!status) return 'backlog';
  const normalized = String(status).toLowerCase() as TaskStatus;
  if (!VALID_TASK_STATUSES.includes(normalized)) {
    throw ApiError.badRequest(
      `Invalid task status. Allowed values: ${VALID_TASK_STATUSES.join(', ')}`
    );
  }
  return normalized;
}

export function validateTaskType(type: any): TaskType {
  if (!type) return 'assignment';
  const normalized = String(type).toLowerCase() as TaskType;
  if (!VALID_TASK_TYPES.includes(normalized)) {
    throw ApiError.badRequest(
      `Invalid task type. Allowed values: ${VALID_TASK_TYPES.join(', ')}`
    );
  }
  return normalized;
}

export function validateSubtasks(subtasks: any): Array<{ id: string; title: string; completed: boolean }> {
  if (!subtasks) return [];
  if (!Array.isArray(subtasks)) {
    throw ApiError.badRequest('Subtasks must be an array of checklist items');
  }
  if (subtasks.length > 50) {
    throw ApiError.badRequest('Subtasks list cannot exceed 50 items');
  }

  return subtasks.map((st, index) => {
    if (!st || typeof st !== 'object') {
      throw ApiError.badRequest(`Subtask item at index ${index} is invalid`);
    }
    const id = st.id && typeof st.id === 'string' ? validateId(st.id, `Subtask #${index + 1} ID`) : `subtask_${Date.now()}_${index}`;
    const title = validateString(st.title, `Subtask #${index + 1} title`, 1, 200);
    const completed = Boolean(st.completed);
    return { id, title, completed };
  });
}
