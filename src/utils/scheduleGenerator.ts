/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ScheduledSession,
  Task,
  AvailabilitySlot,
  ScheduleConflict,
  ScheduleGenerationOptions,
} from '../types';
import { StudyFlowSchedulerEngine } from '../server/services/scheduler/schedulerEngine';
import { toLocalDateKey } from './date';

/**
 * Converts "HH:MM" string to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converts minutes from midnight to "HH:MM"
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Checks if two time windows on the same day overlap
 */
export function doTimesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && sB < eA;
}

/**
 * Detects schedule conflicts across study sessions, commitments, and deadlines.
 * Flags:
 *  1. Overlapping study sessions on the same date
 *  2. Sessions scheduled after task deadline
 *  3. Tasks with impending deadlines (<48h) and unscheduled workload
 *  4. Workload exceeding available weekly study capacity
 */
export function detectScheduleConflicts(
  sessions: ScheduledSession[],
  tasks: Task[],
  availability: AvailabilitySlot[],
  dailyStudyCapHours: number = 6.0
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // 1. Check for overlapping sessions on the same date
  const sessionsByDate: Record<string, ScheduledSession[]> = {};
  sessions.forEach((s) => {
    if (s.status === 'cancelled') return;
    if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
    sessionsByDate[s.date].push(s);
  });

  Object.entries(sessionsByDate).forEach(([date, daySessions]) => {
    for (let i = 0; i < daySessions.length; i++) {
      for (let j = i + 1; j < daySessions.length; j++) {
        const s1 = daySessions[i];
        const s2 = daySessions[j];
        if (doTimesOverlap(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) {
          conflicts.push({
            id: `conf_overlap_${s1.id}_${s2.id}`,
            type: 'overlap',
            title: `Time Overlap on ${date}`,
            description: `Sessions (${s1.startTime}–${s1.endTime} and ${s2.startTime}–${s2.endTime}) overlap. Reschedule one block to eliminate collision.`,
            severity: 'danger',
            sessionIds: [s1.id, s2.id],
            date,
          });
        }
      }
    }
  });

  // 2. Check for sessions scheduled after task deadline
  sessions.forEach((s) => {
    if (s.status === 'cancelled' || s.completed) return;
    const task = tasks.find((t) => t.id === s.taskId);
    if (!task) return;

    const sessionDateStr = `${s.date}T${s.endTime}:00`;
    const sessionTime = new Date(sessionDateStr).getTime();
    const taskDeadline = new Date(task.dueDate).getTime();

    if (sessionTime > taskDeadline) {
      conflicts.push({
        id: `conf_post_deadline_${s.id}`,
        type: 'deadline_passed',
        title: `Session Scheduled Past Deadline`,
        description: `Study block on ${s.date} at ${s.startTime} is set after "${task.title}" is due (${new Date(task.dueDate).toLocaleDateString()}).`,
        severity: 'danger',
        sessionIds: [s.id],
        taskId: task.id,
        date: s.date,
      });
    }
  });

  // 3. Check for imminent deadlines (<48h) with remaining hours and missing study blocks
  const now = Date.now();
  tasks.forEach((task) => {
    if (task.status === 'completed' || task.remainingHours <= 0) return;

    const taskDeadline = new Date(task.dueDate).getTime();
    const hoursUntilDue = (taskDeadline - now) / (1000 * 60 * 60);

    // Sum scheduled upcoming hours for this task
    const scheduledMinutes = sessions
      .filter((s) => s.taskId === task.id && !s.completed && s.status !== 'cancelled')
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    const scheduledHours = scheduledMinutes / 60;

    if (task.remainingHours > scheduledHours + 0.1) {
      const unscheduledHours = task.remainingHours - scheduledHours;
      if (hoursUntilDue <= 48 && hoursUntilDue > 0) {
        conflicts.push({
          id: `conf_imminent_${task.id}`,
          type: 'deadline_approaching',
          title: `Imminent Deadline: ${unscheduledHours.toFixed(1)}h Unallocated`,
          description: `"${task.title}" is due in ${Math.round(hoursUntilDue)} hours, but has ${unscheduledHours.toFixed(1)} hours of unscheduled study required.`,
          severity: 'warning',
          taskId: task.id,
        });
      } else if (scheduledHours === 0 && task.remainingHours > 0) {
        conflicts.push({
          id: `conf_unscheduled_${task.id}`,
          type: 'unscheduled_workload',
          title: `Unallocated Assignment: ${task.title}`,
          description: `${task.remainingHours.toFixed(1)}h remaining with no active study blocks on your schedule.`,
          severity: 'warning',
          taskId: task.id,
        });
      }
    }
  });

  // 4. Check for weekly capacity shortage
  const totalActiveRemainingHours = tasks
    .filter((t) => t.status !== 'completed')
    .reduce((sum, t) => sum + t.remainingHours, 0);

  // Preferred study slots per week
  const studySlotHours = availability
    .filter((a) => a.type === 'preferred_study')
    .reduce((sum, a) => {
      const duration = (timeToMinutes(a.endTime) - timeToMinutes(a.startTime)) / 60;
      return sum + Math.max(0, duration);
    }, 0);

  const weeklyCapLimit = dailyStudyCapHours * 7;
  const effectiveCapacity = Math.min(studySlotHours > 0 ? studySlotHours : weeklyCapLimit, weeklyCapLimit);

  if (totalActiveRemainingHours > effectiveCapacity * 1.25) {
    conflicts.push({
      id: 'conf_capacity_shortage',
      type: 'insufficient_availability',
      title: 'Weekly Workload Overload Warning',
      description: `Active coursework requires ${totalActiveRemainingHours.toFixed(1)}h, which exceeds your weekly open study capacity (~${effectiveCapacity.toFixed(1)}h). Consider expanding open study windows or adjusting deadlines.`,
      severity: 'warning',
    });
  }

  return conflicts;
}

/**
 * Production recursive backtracking schedule generator.
 *
 * INVARIANTS:
 * - Locked sessions (`session.locked === true`) are IMMUTABLE and NEVER overwritten or removed.
 * - Completed sessions are preserved.
 * - New sessions are slotted into available open time windows via recursive backtracking constraint search.
 */
export function generateMockSchedule(
  currentSessions: ScheduledSession[],
  tasks: Task[],
  availability: AvailabilitySlot[],
  options: Partial<ScheduleGenerationOptions> = {}
): {
  newSessions: ScheduledSession[];
  generatedCount: number;
  warnings: string[];
} {
  const startDate = options.startDate || toLocalDateKey();
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 6);
  const endDate = options.endDate || toLocalDateKey(defaultEndDate);
  const mode = options.mode || 'balanced';

  const result = StudyFlowSchedulerEngine.generateSchedule(
    tasks.map((t) => ({
      id: t.id,
      userId: t.userId || 'current_user',
      subjectId: t.subjectId,
      title: t.title,
      dueDate: t.dueDate,
      estimatedHours: t.estimatedHours,
      remainingHours: t.remainingHours,
      priority: (t.priority || 'medium').toUpperCase() as any,
      status: t.status,
      type: t.type,
    })),
    availability.map((a) => ({
      id: a.id,
      dayOfWeek: a.dayOfWeek,
      startTime: a.startTime,
      endTime: a.endTime,
      type: (a.type || 'preferred_study').toUpperCase() as any,
      label: a.label,
    })),
    currentSessions.map((s) => ({
      id: s.id,
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
      startDate,
      endDate,
      mode: mode.toUpperCase() as any,
      targetDailyStudyCapHours: options.dailyStudyCapHours || 6.0,
      defaultSessionMinutes: mode === 'pomodoro' ? 45 : mode === 'front_loaded' ? 90 : 50,
      preferredBreakMinutes: 10,
      bufferMinutes: 15,
    }
  );

  return {
    newSessions: result.sessions.map((s) => ({
      id: s.id,
      taskId: s.taskId,
      subjectId: s.subjectId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      durationMinutes: s.durationMinutes,
      completed: s.completed,
      status: (s.status ? s.status.toLowerCase() : 'scheduled') as any,
      locked: s.locked,
      notes: s.notes,
    })),
    generatedCount: result.newSessions.length,
    warnings: result.warnings,
  };
}
