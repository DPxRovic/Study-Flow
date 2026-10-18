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
  const now = new Date('2026-10-06T12:00:00').getTime(); // Fall 2026 reference anchor
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
 * Temporary deterministic schedule generator.
 *
 * IMPORTANT NOTE FOR ARCHITECTURE:
 * This heuristic generator provides a clean contract for the frontend schedule surface.
 * In Prompt 14, this will be replaced with the full recursive backtracking constraint solver.
 *
 * INVARIANTS:
 * - Locked sessions (`session.locked === true`) are IMMUTABLE and NEVER overwritten or removed.
 * - Completed sessions are preserved.
 * - New sessions are slotted into available open time windows.
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
  const mode = options.mode || 'balanced';
  const warnings: string[] = [];

  // Keep ALL locked sessions and completed sessions untouched!
  const preservedSessions = currentSessions.filter(
    (s) => s.locked === true || s.completed === true
  );

  // Active tasks needing study hours
  const activeTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.remainingHours > 0
  );

  if (activeTasks.length === 0) {
    return {
      newSessions: preservedSessions,
      generatedCount: 0,
      warnings: ['No pending assignments require scheduled study time.'],
    };
  }

  // Days in Fall 2026 Week 7: Oct 6 (Tue) to Oct 11 (Sun)
  const days = [
    { date: '2026-10-06', dayOfWeek: 2, label: 'Tuesday' },
    { date: '2026-10-07', dayOfWeek: 3, label: 'Wednesday' },
    { date: '2026-10-08', dayOfWeek: 4, label: 'Thursday' },
    { date: '2026-10-09', dayOfWeek: 5, label: 'Friday' },
    { date: '2026-10-10', dayOfWeek: 6, label: 'Saturday' },
    { date: '2026-10-11', dayOfWeek: 0, label: 'Sunday' },
  ];

  const generatedSessions: ScheduledSession[] = [...preservedSessions];
  let generatedCount = 0;

  // Track hours allocated per task
  const allocatedMinutesByTask: Record<string, number> = {};
  preservedSessions.forEach((s) => {
    if (s.status !== 'cancelled') {
      allocatedMinutesByTask[s.taskId] =
        (allocatedMinutesByTask[s.taskId] || 0) + s.durationMinutes;
    }
  });

  // Target block size based on heuristic mode
  const targetBlockMinutes =
    mode === 'pomodoro' ? 45 : mode === 'front_loaded' ? 90 : 60;

  days.forEach((day, dayIndex) => {
    // Collect occupied intervals on this day from preserved sessions
    const occupiedTimes = generatedSessions
      .filter((s) => s.date === day.date && s.status !== 'cancelled')
      .map((s) => ({
        start: timeToMinutes(s.startTime),
        end: timeToMinutes(s.endTime),
      }));

    // Find candidate study hours: 10:00 to 20:00
    const startHour = mode === 'front_loaded' && dayIndex < 3 ? 9 : 11;
    let candidateMinute = startHour * 60;

    // Filter tasks with remaining hours to schedule
    for (const task of activeTasks) {
      const neededMinutes = Math.round(task.remainingHours * 60);
      const alreadyAllocated = allocatedMinutesByTask[task.id] || 0;
      if (alreadyAllocated >= neededMinutes) continue;

      const duration = Math.min(
        targetBlockMinutes,
        neededMinutes - alreadyAllocated
      );

      if (duration < 20) continue;

      // Find non-overlapping gap
      let proposedStart = candidateMinute;
      let proposedEnd = proposedStart + duration;

      let hasCollision = occupiedTimes.some(
        (occ) => proposedStart < occ.end && occ.start < proposedEnd
      );

      while (hasCollision && proposedStart < 20 * 60) {
        proposedStart += 30;
        proposedEnd = proposedStart + duration;
        hasCollision = occupiedTimes.some(
          (occ) => proposedStart < occ.end && occ.start < proposedEnd
        );
      }

      if (proposedEnd <= 21 * 60) {
        const newSession: ScheduledSession = {
          id: `gen_${task.id}_${day.date}_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 6)}`,
          taskId: task.id,
          subjectId: task.subjectId,
          date: day.date,
          startTime: minutesToTime(proposedStart),
          endTime: minutesToTime(proposedEnd),
          durationMinutes: duration,
          completed: false,
          status: 'scheduled',
          locked: false,
          notes: `${
            mode === 'pomodoro'
              ? '45m Pomodoro sprint'
              : mode === 'front_loaded'
              ? 'Front-loaded focus block'
              : 'Paced study session'
          }: ${task.title}`,
        };

        generatedSessions.push(newSession);
        occupiedTimes.push({ start: proposedStart, end: proposedEnd });
        allocatedMinutesByTask[task.id] = alreadyAllocated + duration;
        generatedCount++;
        candidateMinute = proposedEnd + (mode === 'pomodoro' ? 15 : 30); // buffer
      }
    }
  });

  // Check if any tasks still have unscheduled hours
  activeTasks.forEach((task) => {
    const needed = Math.round(task.remainingHours * 60);
    const scheduled = allocatedMinutesByTask[task.id] || 0;
    if (scheduled < needed) {
      warnings.push(
        `Capacity note: "${task.title}" has ${((needed - scheduled) / 60).toFixed(
          1
        )}h unscheduled due to limited open daytime windows.`
      );
    }
  });

  return {
    newSessions: generatedSessions,
    generatedCount,
    warnings,
  };
}
