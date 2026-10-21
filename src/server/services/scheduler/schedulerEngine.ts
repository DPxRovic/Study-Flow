/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * StudyFlow Recursive / Backtracking Scheduling Engine
 *
 * Algorithmic Architecture:
 * - Constraint Satisfaction Problem (CSP) formulation for academic schedule generation.
 * - Discrete interval representation using half-open intervals [start, end) in minutes from midnight.
 * - Heuristic Work Item decomposition and ordering (Earliest Deadline First + Priority Weighting).
 * - Feasible candidate slot generation bounded by weekly study availability, busy commitments,
 *   locked sessions, daily study fatigue caps, and task deadlines.
 * - Depth-First Search (DFS) with recursive branching, constraint validation, and state-restoring backtracking.
 * - Safe branch pruning via forward-checking remaining time capacity vs remaining deliverable work.
 * - Comprehensive unplaced workload reporting with deterministic root-cause attribution.
 */

export type ScheduleMode = 'BALANCED' | 'FRONT_LOADED' | 'POMODORO' | 'balanced' | 'front_loaded' | 'pomodoro';
export type PriorityLevel = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'urgent' | 'high' | 'medium' | 'low';
export type SlotType = 'PREFERRED_STUDY' | 'CLASS' | 'WORK' | 'PERSONAL' | 'preferred_study' | 'class' | 'work' | 'personal';

export interface SchedulerTaskInput {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  dueDate: string | Date;
  estimatedHours: number;
  remainingHours: number;
  priority?: PriorityLevel;
  status?: string;
  type?: string;
}

export interface SchedulerAvailabilityInput {
  id?: string;
  userId?: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  type?: SlotType;
  label?: string | null;
}

export interface SchedulerSessionInput {
  id: string;
  userId?: string;
  taskId: string;
  subjectId: string;
  date: string;      // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  durationMinutes: number;
  completed?: boolean;
  status?: string;
  locked?: boolean;
  notes?: string | null;
}

export interface SchedulerOptions {
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  mode?: ScheduleMode;
  targetDailyStudyCapHours?: number;
  defaultSessionMinutes?: number;
  preferredBreakMinutes?: number;
  bufferMinutes?: number;
  preferredStudyTime?: 'morning' | 'afternoon' | 'evening';
  minSessionMinutes?: number;
  maxSessionMinutes?: number;
  searchBudgetSteps?: number;
  searchTimeoutMs?: number;
}

export interface PlacedSession {
  id: string;
  taskId: string;
  subjectId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  completed: boolean;
  locked: boolean;
  status: 'SCHEDULED' | 'scheduled';
  notes?: string;
}

export type UnscheduledReason =
  | 'DEADLINE_INFEASIBLE'
  | 'INSUFFICIENT_AVAILABILITY'
  | 'DAILY_CAP_REACHED'
  | 'LOCKED_BLOCK_CONFLICT'
  | 'SEARCH_LIMIT_EXCEEDED'
  | 'NO_FEASIBLE_SLOT'
  | 'INVALID_DURATION';

export interface UnscheduledTaskReport {
  taskId: string;
  taskTitle: string;
  subjectId: string;
  remainingHours: number;
  unscheduledHours: number;
  reason: UnscheduledReason;
  detail: string;
}

export interface SchedulerSummary {
  totalTasksConsidered: number;
  fullyScheduledTasks: number;
  partiallyScheduledTasks: number;
  unscheduledTasks: number;
  totalMinutesScheduled: number;
  totalHoursScheduled: number;
  searchSteps: number;
  backtrackCount: number;
  maxRecursionDepth: number;
  searchLimitExceeded: boolean;
  durationMs: number;
}

export interface SchedulerResult {
  sessions: PlacedSession[];
  newSessions: PlacedSession[];
  preservedSessions: PlacedSession[];
  unscheduledTasks: UnscheduledTaskReport[];
  warnings: string[];
  summary: SchedulerSummary;
}

export interface WorkItem {
  id: string;
  taskId: string;
  subjectId: string;
  taskTitle: string;
  priority: PriorityLevel;
  dueDate: string; // ISO date string
  dueTimestamp: number;
  durationMinutes: number;
  chunkIndex: number;
  totalChunks: number;
}

export interface TimeInterval {
  start: number; // minutes from midnight [0, 1440)
  end: number;   // minutes from midnight
}

export interface CandidateSlot {
  date: string;
  start: number;
  end: number;
  score: number;
}

export interface SearchState {
  stepCount: number;
  backtrackCount: number;
  maxSteps: number;
  startTime: number;
  timeoutMs: number;
  limitExceeded: boolean;
  currentDepth: number;
  maxDepth: number;
  backtrackLog?: Array<{ itemIndex: number; reason: string }>;
}

/**
 * Converts "HH:MM" 24h format to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const parts = timeStr.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/**
 * Converts minutes from midnight to "HH:MM" 24h format
 */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Half-open interval overlap check [startA, endA) and [startB, endB)
 */
export function doIntervalsOverlap(sA: number, eA: number, sB: number, eB: number): boolean {
  return sA < eB && sB < eA;
}

/**
 * Merges overlapping and adjacent intervals
 */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length <= 1) return [...intervals];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const result: TimeInterval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = result[result.length - 1];

    if (current.start <= prev.end) {
      prev.end = Math.max(prev.end, current.end);
    } else {
      result.push(current);
    }
  }

  return result;
}

/**
 * Subtracts busy intervals from open intervals: open - busy
 */
export function subtractIntervals(open: TimeInterval[], busy: TimeInterval[]): TimeInterval[] {
  if (open.length === 0) return [];
  if (busy.length === 0) return [...open];

  const mergedBusy = mergeIntervals(busy);
  let currentOpen = [...open];

  for (const b of mergedBusy) {
    const nextOpen: TimeInterval[] = [];
    for (const o of currentOpen) {
      // b is completely before o, or completely after o
      if (b.end <= o.start || b.start >= o.end) {
        nextOpen.push(o);
      } else {
        // Overlap: split or trim o
        if (b.start > o.start) {
          nextOpen.push({ start: o.start, end: b.start });
        }
        if (b.end < o.end) {
          nextOpen.push({ start: b.end, end: o.end });
        }
      }
    }
    currentOpen = nextOpen;
  }

  return currentOpen.filter((int) => int.end > int.start);
}

/**
 * Computes list of dates between startDate and endDate (inclusive)
 */
export function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startStr + 'T12:00:00Z');
  const end = new Date(endStr + 'T12:00:00Z');

  while (curr.getTime() <= end.getTime()) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Priority numeric weighting for heuristic sorting
 */
function getPriorityWeight(priority?: PriorityLevel): number {
  const p = (priority || 'MEDIUM').toUpperCase();
  switch (p) {
    case 'URGENT': return 4;
    case 'HIGH': return 3;
    case 'MEDIUM': return 2;
    case 'LOW': return 1;
    default: return 2;
  }
}

/**
 * Decomposes a task's remaining hours into discrete feasible WorkItems
 */
export function splitTaskIntoWorkItems(
  task: SchedulerTaskInput,
  targetDurationMinutes: number,
  minDurationMinutes: number = 25,
  maxDurationMinutes: number = 120
): WorkItem[] {
  const remainingHours = Number(task.remainingHours);
  if (isNaN(remainingHours) || remainingHours <= 0) {
    return [];
  }

  const totalMinutes = Math.round(remainingHours * 60);
  if (totalMinutes < minDurationMinutes) {
    // If the task has a tiny remainder but > 0, schedule it as minDuration or totalMinutes
    return [{
      id: `${task.id}_chunk_0`,
      taskId: task.id,
      subjectId: task.subjectId,
      taskTitle: task.title,
      priority: task.priority || 'MEDIUM',
      dueDate: typeof task.dueDate === 'string' ? task.dueDate : task.dueDate.toISOString(),
      dueTimestamp: new Date(task.dueDate).getTime(),
      durationMinutes: Math.max(15, totalMinutes),
      chunkIndex: 0,
      totalChunks: 1,
    }];
  }

  const chunkDurations: number[] = [];
  let remaining = totalMinutes;

  while (remaining > 0) {
    if (remaining <= targetDurationMinutes) {
      if (remaining >= minDurationMinutes || chunkDurations.length === 0) {
        chunkDurations.push(remaining);
      } else {
        // Remainder is smaller than minDuration, merge with previous chunk if allowed
        const prev = chunkDurations[chunkDurations.length - 1];
        if (prev + remaining <= maxDurationMinutes) {
          chunkDurations[chunkDurations.length - 1] = prev + remaining;
        } else {
          const combined = prev + remaining;
          const c1 = Math.floor(combined / 2);
          const c2 = combined - c1;
          chunkDurations[chunkDurations.length - 1] = c1;
          chunkDurations.push(c2);
        }
      }
      remaining = 0;
    } else {
      // remaining > targetDurationMinutes
      const remainderAfter = remaining - targetDurationMinutes;
      if (remainderAfter > 0 && remainderAfter < minDurationMinutes) {
        const combined = targetDurationMinutes + remainderAfter;
        if (combined <= maxDurationMinutes) {
          chunkDurations.push(combined);
          remaining = 0;
        } else {
          const c1 = Math.floor(combined / 2);
          const c2 = combined - c1;
          chunkDurations.push(c1);
          chunkDurations.push(c2);
          remaining = 0;
        }
      } else {
        chunkDurations.push(targetDurationMinutes);
        remaining -= targetDurationMinutes;
      }
    }
  }

  const totalChunks = chunkDurations.length;
  const dueDateStr = typeof task.dueDate === 'string' ? task.dueDate : task.dueDate.toISOString();
  const dueTimestamp = new Date(task.dueDate).getTime();

  return chunkDurations.map((dur, idx) => ({
    id: `${task.id}_chunk_${idx}`,
    taskId: task.id,
    subjectId: task.subjectId,
    taskTitle: task.title,
    priority: task.priority || 'MEDIUM',
    dueDate: dueDateStr,
    dueTimestamp,
    durationMinutes: dur,
    chunkIndex: idx,
    totalChunks,
  }));
}

/**
 * Evaluates candidate slot quality score
 */
function scoreCandidateSlot(
  date: string,
  startMin: number,
  endMin: number,
  item: WorkItem,
  mode: string,
  preferredStudyTime: string | undefined,
  dayIndex: number,
  totalDays: number,
  currentDayScheduledMinutes: number,
  targetDailyCapMinutes: number
): number {
  let score = 100;

  // 1. Mode heuristic scoring
  if (mode === 'FRONT_LOADED') {
    // Strongly favor earlier days in the horizon
    const dayRatio = (totalDays - dayIndex) / Math.max(1, totalDays);
    score += dayRatio * 60;
  } else if (mode === 'BALANCED') {
    // Favor days with lower current workload (load-balancing)
    const utilization = currentDayScheduledMinutes / Math.max(1, targetDailyCapMinutes);
    score += (1 - utilization) * 50;
  } else if (mode === 'POMODORO') {
    // Favor standard pomodoro duration matches
    if (item.durationMinutes === 45 || item.durationMinutes === 50) {
      score += 30;
    }
  }

  // 2. Preferred study time of day
  if (preferredStudyTime) {
    if (preferredStudyTime === 'morning' && startMin >= 360 && endMin <= 720) {
      score += 25;
    } else if (preferredStudyTime === 'afternoon' && startMin >= 720 && endMin <= 1020) {
      score += 25;
    } else if (preferredStudyTime === 'evening' && startMin >= 1020 && endMin <= 1380) {
      score += 25;
    }
  }

  // 3. Proximity to deadline (anti-cramming: earlier is better, far before deadline)
  const sessionEndTime = new Date(`${date}T${minutesToTime(endMin)}:00Z`).getTime();
  const timeUntilDueMs = item.dueTimestamp - sessionEndTime;
  if (timeUntilDueMs > 0) {
    const hoursUntilDue = timeUntilDueMs / (1000 * 60 * 60);
    // Award up to 40 points for pacing buffer before deadline
    score += Math.min(40, hoursUntilDue * 0.5);
  }

  // 4. Priority weighting bonus
  score += getPriorityWeight(item.priority) * 10;

  return score;
}

/**
 * StudyFlow Recursive Scheduling Engine
 */
export class StudyFlowSchedulerEngine {
  /**
   * Main entry point: Generates a validated schedule using recursive backtracking search
   */
  static generateSchedule(
    tasks: SchedulerTaskInput[],
    availability: SchedulerAvailabilityInput[],
    existingSessions: SchedulerSessionInput[],
    options: SchedulerOptions
  ): SchedulerResult {
    const startTimeMs = Date.now();
    const warnings: string[] = [];

    // 1. Validate & normalize horizon
    const { startDate, endDate } = options;
    if (!startDate || !endDate) {
      throw new Error('Scheduler requires valid startDate and endDate strings in YYYY-MM-DD format');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be on or before end date');
    }

    const horizonDates = getDatesInRange(startDate, endDate);
    if (horizonDates.length > 60) {
      throw new Error('Scheduling horizon exceeds maximum permitted 60-day limit');
    }

    // 2. Normalize parameters
    const mode = (options.mode || 'BALANCED').toUpperCase();
    const dailyCapHours = options.targetDailyStudyCapHours && options.targetDailyStudyCapHours > 0
      ? options.targetDailyStudyCapHours
      : 5.5;
    const dailyCapMinutes = Math.round(dailyCapHours * 60);

    const defaultSessionMinutes = options.defaultSessionMinutes || (mode === 'POMODORO' ? 45 : mode === 'FRONT_LOADED' ? 90 : 50);
    const minSessionMinutes = options.minSessionMinutes || (mode === 'POMODORO' ? 25 : 30);
    const maxSessionMinutes = options.maxSessionMinutes || 120;
    const bufferMinutes = options.bufferMinutes !== undefined ? options.bufferMinutes : 10;
    const searchBudgetSteps = options.searchBudgetSteps || 25000;
    const searchTimeoutMs = options.searchTimeoutMs || 4000;

    // 3. Partition existing sessions into preserved (locked or completed) vs discarded
    // Preserved sessions are IMMUTABLE occupied time
    const preservedSessions: PlacedSession[] = [];
    const occupiedByDate = new Map<string, Array<{ start: number; end: number; taskId?: string }>>();
    const dailyMinutesByDate = new Map<string, number>();

    // Initialize maps for all horizon dates
    for (const d of horizonDates) {
      occupiedByDate.set(d, []);
      dailyMinutesByDate.set(d, 0);
    }

    for (const s of existingSessions) {
      const isLocked = Boolean(s.locked);
      const isCompleted = Boolean(s.completed || (s.status && s.status.toUpperCase() === 'COMPLETED'));

      if (isLocked || isCompleted) {
        preservedSessions.push({
          id: s.id,
          taskId: s.taskId,
          subjectId: s.subjectId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          durationMinutes: s.durationMinutes,
          completed: isCompleted,
          locked: isLocked,
          status: isCompleted ? 'SCHEDULED' : 'SCHEDULED',
          notes: s.notes || undefined,
        });

        // Add occupied interval if session is within horizon
        if (occupiedByDate.has(s.date)) {
          const sMin = timeToMinutes(s.startTime);
          const eMin = timeToMinutes(s.endTime);
          occupiedByDate.get(s.date)!.push({ start: sMin, end: eMin, taskId: s.taskId });
          const curr = dailyMinutesByDate.get(s.date) || 0;
          dailyMinutesByDate.set(s.date, curr + (eMin - sMin));
        }
      }
    }

    // Sort existing occupied intervals on each day
    for (const [, intervals] of occupiedByDate.entries()) {
      intervals.sort((a, b) => a.start - b.start);
    }

    // 4. Filter and prepare tasks needing scheduling
    // Hard constraint: Tasks must have remainingHours > 0 and not be completed
    const activeTasks = tasks.filter((t) => {
      const isComp = t.status && t.status.toUpperCase() === 'COMPLETED';
      return !isComp && Number(t.remainingHours) > 0;
    });

    if (activeTasks.length === 0) {
      return {
        sessions: [...preservedSessions],
        newSessions: [],
        preservedSessions,
        unscheduledTasks: [],
        warnings: ['No pending assignments require scheduled study time.'],
        summary: {
          totalTasksConsidered: 0,
          fullyScheduledTasks: 0,
          partiallyScheduledTasks: 0,
          unscheduledTasks: 0,
          totalMinutesScheduled: preservedSessions.reduce((acc, s) => acc + s.durationMinutes, 0),
          totalHoursScheduled: Math.round(preservedSessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 6) / 10,
          searchSteps: 0,
          backtrackCount: 0,
          maxRecursionDepth: 0,
          searchLimitExceeded: false,
          durationMs: Date.now() - startTimeMs,
        },
      };
    }

    // 5. Build availability lookup by dayOfWeek (0=Sun..6=Sat)
    // Distinguish PREFERRED_STUDY from busy commitments (CLASS, WORK, PERSONAL)
    const preferredStudyByDay = new Map<number, TimeInterval[]>();
    const busyCommitmentsByDay = new Map<number, TimeInterval[]>();

    for (let day = 0; day <= 6; day++) {
      preferredStudyByDay.set(day, []);
      busyCommitmentsByDay.set(day, []);
    }

    for (const slot of availability) {
      const sMin = timeToMinutes(slot.startTime);
      const eMin = timeToMinutes(slot.endTime);
      if (eMin <= sMin) continue; // Skip invalid non-positive intervals

      const type = (slot.type || 'PREFERRED_STUDY').toUpperCase();
      const interval = { start: sMin, end: eMin };

      if (type === 'PREFERRED_STUDY') {
        preferredStudyByDay.get(slot.dayOfWeek)?.push(interval);
      } else {
        // CLASS, WORK, PERSONAL are busy non-study commitments
        busyCommitmentsByDay.get(slot.dayOfWeek)?.push(interval);
      }
    }

    // Check if availability has any study windows at all
    let totalAvailabilityMinutes = 0;
    for (let day = 0; day <= 6; day++) {
      const open = preferredStudyByDay.get(day) || [];
      const busy = busyCommitmentsByDay.get(day) || [];
      const net = subtractIntervals(open, busy);
      preferredStudyByDay.set(day, net);
      totalAvailabilityMinutes += net.reduce((acc, i) => acc + (i.end - i.start), 0);
    }

    if (totalAvailabilityMinutes === 0) {
      warnings.push('No weekly study availability windows configured. Set study availability to schedule tasks.');
      const unscheduled: UnscheduledTaskReport[] = activeTasks.map((t) => ({
        taskId: t.id,
        taskTitle: t.title,
        subjectId: t.subjectId,
        remainingHours: t.remainingHours,
        unscheduledHours: t.remainingHours,
        reason: 'INSUFFICIENT_AVAILABILITY',
        detail: 'Student weekly calendar has 0 available study hours configured.',
      }));

      return {
        sessions: [...preservedSessions],
        newSessions: [],
        preservedSessions,
        unscheduledTasks: unscheduled,
        warnings,
        summary: {
          totalTasksConsidered: activeTasks.length,
          fullyScheduledTasks: 0,
          partiallyScheduledTasks: 0,
          unscheduledTasks: activeTasks.length,
          totalMinutesScheduled: 0,
          totalHoursScheduled: 0,
          searchSteps: 0,
          backtrackCount: 0,
          maxRecursionDepth: 0,
          searchLimitExceeded: false,
          durationMs: Date.now() - startTimeMs,
        },
      };
    }

    // 6. Split active tasks into WorkItems
    const allWorkItems: WorkItem[] = [];
    for (const task of activeTasks) {
      const items = splitTaskIntoWorkItems(task, defaultSessionMinutes, minSessionMinutes, maxSessionMinutes);
      allWorkItems.push(...items);
    }

    // 7. Heuristic Ordering of WorkItems:
    // Primary: Earliest Deadline First (EDF)
    // Secondary: Priority Weight descending (URGENT > HIGH > MEDIUM > LOW)
    // Tertiary: Duration descending (Fit larger chunks first)
    allWorkItems.sort((a, b) => {
      if (a.dueTimestamp !== b.dueTimestamp) {
        return a.dueTimestamp - b.dueTimestamp;
      }
      const pA = getPriorityWeight(a.priority);
      const pB = getPriorityWeight(b.priority);
      if (pA !== pB) {
        return pB - pA;
      }
      return b.durationMinutes - a.durationMinutes;
    });

    // 8. Recursive Search Execution
    const searchState: SearchState = {
      stepCount: 0,
      backtrackCount: 0,
      maxSteps: searchBudgetSteps,
      startTime: startTimeMs,
      timeoutMs: searchTimeoutMs,
      limitExceeded: false,
      currentDepth: 0,
      maxDepth: 0,
    };

    const currentSchedule: PlacedSession[] = [];
    const scheduledItemIds = new Set<string>();

    // Execute recursive search
    // We attempt to solve the complete set of work items.
    // If the complete set is infeasible (e.g. deadline or capacity constraints prevent some items),
    // we progressive-solve the maximal subset of work items that satisfy hard constraints.
    const completeSuccess = this.recursiveSearch(
      0,
      allWorkItems,
      currentSchedule,
      occupiedByDate,
      dailyMinutesByDate,
      preferredStudyByDay,
      horizonDates,
      mode,
      options.preferredStudyTime,
      dailyCapMinutes,
      bufferMinutes,
      searchState
    );

    if (completeSuccess) {
      for (const s of currentSchedule) {
        scheduledItemIds.add(s.id);
      }
    } else {
      // Infeasible for full set: Reset state and solve greedily-backtracked per task
      // to pack the maximum feasible deliverables and report unplaced tasks honestly.
      warnings.push('Not all tasks could fit within available windows and deadlines. Partial schedule generated.');
      currentSchedule.length = 0;

      // Reset occupied intervals and daily minutes to preserved sessions only
      occupiedByDate.clear();
      dailyMinutesByDate.clear();
      for (const d of horizonDates) {
        occupiedByDate.set(d, []);
        dailyMinutesByDate.set(d, 0);
      }
      for (const p of preservedSessions) {
        if (occupiedByDate.has(p.date)) {
          const sMin = timeToMinutes(p.startTime);
          const eMin = timeToMinutes(p.endTime);
          occupiedByDate.get(p.date)!.push({ start: sMin, end: eMin, taskId: p.taskId });
          dailyMinutesByDate.set(p.date, (dailyMinutesByDate.get(p.date) || 0) + (eMin - sMin));
        }
      }

      // Group work items by task and place task by task recursively
      for (const task of activeTasks) {
        const taskItems = allWorkItems.filter((w) => w.taskId === task.id);
        const taskSchedule: PlacedSession[] = [];

        const taskSuccess = this.recursiveSearch(
          0,
          taskItems,
          taskSchedule,
          occupiedByDate,
          dailyMinutesByDate,
          preferredStudyByDay,
          horizonDates,
          mode,
          options.preferredStudyTime,
          dailyCapMinutes,
          bufferMinutes,
          searchState
        );

        if (taskSuccess) {
          currentSchedule.push(...taskSchedule);
          for (const s of taskSchedule) {
            scheduledItemIds.add(s.id);
          }
        } else {
          // Task could not be placed completely.
          // Try placing individual chunks of this task if partial work is permitted
          for (const item of taskItems) {
            const singleItemSchedule: PlacedSession[] = [];
            const itemSuccess = this.recursiveSearch(
              0,
              [item],
              singleItemSchedule,
              occupiedByDate,
              dailyMinutesByDate,
              preferredStudyByDay,
              horizonDates,
              mode,
              options.preferredStudyTime,
              dailyCapMinutes,
              bufferMinutes,
              searchState
            );
            if (itemSuccess) {
              currentSchedule.push(...singleItemSchedule);
              scheduledItemIds.add(item.id);
            }
          }
        }
      }
    }

    // 9. Analyze Unscheduled Workload and Reasons
    const scheduledMinutesByTask = new Map<string, number>();
    for (const s of currentSchedule) {
      const prev = scheduledMinutesByTask.get(s.taskId) || 0;
      scheduledMinutesByTask.set(s.taskId, prev + s.durationMinutes);
    }

    const unscheduledReports: UnscheduledTaskReport[] = [];
    let fullyScheduledCount = 0;
    let partiallyScheduledCount = 0;

    for (const task of activeTasks) {
      const taskNeededMinutes = Math.round(task.remainingHours * 60);
      const scheduledMinutes = scheduledMinutesByTask.get(task.id) || 0;
      const unplacedMinutes = Math.max(0, taskNeededMinutes - scheduledMinutes);

      if (unplacedMinutes === 0) {
        fullyScheduledCount++;
      } else {
        if (scheduledMinutes > 0) {
          partiallyScheduledCount++;
        }
        // Determine root cause reason
        const reason = this.diagnoseUnscheduledReason(
          task,
          unplacedMinutes,
          horizonDates,
          preferredStudyByDay,
          occupiedByDate,
          dailyMinutesByDate,
          dailyCapMinutes,
          searchState
        );

        let detailMsg: string;
        switch (reason) {
          case 'DEADLINE_INFEASIBLE':
            detailMsg = `Deadline (${new Date(task.dueDate).toLocaleDateString()}) occurs before sufficient study windows are available.`;
            break;
          case 'INSUFFICIENT_AVAILABILITY':
            detailMsg = `Total weekly study availability (${(totalAvailabilityMinutes / 60).toFixed(1)}h) is insufficient for remaining coursework.`;
            break;
          case 'DAILY_CAP_REACHED':
            detailMsg = `Maximum daily study cap (${dailyCapHours}h/day) limits available capacity on remaining days.`;
            break;
          case 'LOCKED_BLOCK_CONFLICT':
            detailMsg = 'Locked sessions and fixed commitments occupy required time windows.';
            break;
          case 'SEARCH_LIMIT_EXCEEDED':
            detailMsg = 'Search budget limit was reached while exploring alternative placements.';
            break;
          default:
            detailMsg = 'No feasible non-overlapping window matching duration requirements was found.';
            break;
        }

        unscheduledReports.push({
          taskId: task.id,
          taskTitle: task.title,
          subjectId: task.subjectId,
          remainingHours: task.remainingHours,
          unscheduledHours: Math.round((unplacedMinutes / 60) * 10) / 10,
          reason,
          detail: detailMsg,
        });

        warnings.push(`Task "${task.title}": ${((unplacedMinutes) / 60).toFixed(1)}h unallocated (${detailMsg})`);
      }
    }

    const totalMinutesScheduled = currentSchedule.reduce((acc, s) => acc + s.durationMinutes, 0);

    return {
      sessions: [...preservedSessions, ...currentSchedule],
      newSessions: currentSchedule,
      preservedSessions,
      unscheduledTasks: unscheduledReports,
      warnings,
      summary: {
        totalTasksConsidered: activeTasks.length,
        fullyScheduledTasks: fullyScheduledCount,
        partiallyScheduledTasks: partiallyScheduledCount,
        unscheduledTasks: unscheduledReports.length,
        totalMinutesScheduled,
        totalHoursScheduled: Math.round((totalMinutesScheduled / 60) * 10) / 10,
        searchSteps: searchState.stepCount,
        backtrackCount: searchState.backtrackCount,
        maxRecursionDepth: searchState.maxDepth,
        searchLimitExceeded: searchState.limitExceeded,
        durationMs: Date.now() - startTimeMs,
      },
    };
  }

  /**
   * Recursive Backtracking Search Core
   *
   * Formally:
   * solve(index):
   *   if index == workItems.length: return true (Base Case)
   *   for each candidate slot c in generateCandidates(workItems[index]):
   *     if valid(c):
   *       apply(c)
   *       if solve(index + 1) == true: return true
   *       undo(c) (BACKTRACK)
   *   return false
   */
  private static recursiveSearch(
    itemIndex: number,
    workItems: WorkItem[],
    currentSchedule: PlacedSession[],
    occupiedByDate: Map<string, Array<{ start: number; end: number; taskId?: string }>>,
    dailyMinutesByDate: Map<string, number>,
    preferredStudyByDay: Map<number, TimeInterval[]>,
    horizonDates: string[],
    mode: string,
    preferredStudyTime: string | undefined,
    dailyCapMinutes: number,
    bufferMinutes: number,
    state: SearchState
  ): boolean {
    // Search step / timeout limit check
    state.stepCount++;
    if (state.stepCount > state.maxSteps || (Date.now() - state.startTime > state.timeoutMs)) {
      state.limitExceeded = true;
      return false;
    }

    // Track recursion depth
    state.currentDepth = itemIndex;
    if (state.currentDepth > state.maxDepth) {
      state.maxDepth = state.currentDepth;
    }

    // BASE CASE: All work items placed!
    if (itemIndex >= workItems.length) {
      return true;
    }

    const item = workItems[itemIndex];

    // FORWARD CHECKING / PRUNING:
    // Check if remaining open horizon capacity before item's deadline is strictly less
    // than this item's required duration. If so, prune this branch immediately.
    let remainingCapacityBeforeDeadline = 0;
    for (const d of horizonDates) {
      const dayDate = new Date(d + 'T00:00:00Z').getTime();
      if (dayDate > item.dueTimestamp) break;

      const dailyUsed = dailyMinutesByDate.get(d) || 0;
      const dayCapacityRemaining = Math.max(0, dailyCapMinutes - dailyUsed);
      remainingCapacityBeforeDeadline += dayCapacityRemaining;
      if (remainingCapacityBeforeDeadline >= item.durationMinutes) break;
    }

    if (remainingCapacityBeforeDeadline < item.durationMinutes) {
      // Safely prune branch: impossible to place this item before its deadline
      return false;
    }

    // Generate feasible candidate slots for this work item
    const candidates = this.generateCandidateSlots(
      item,
      occupiedByDate,
      dailyMinutesByDate,
      preferredStudyByDay,
      horizonDates,
      mode,
      preferredStudyTime,
      dailyCapMinutes,
      bufferMinutes
    );

    if (candidates.length === 0) {
      // No feasible slot in this branch, backtrack
      return false;
    }

    // Branching: Iterate through candidate slots
    for (const cand of candidates) {
      // Hard Constraint Re-Validation
      const dayOccupied = occupiedByDate.get(cand.date) || [];
      const overlaps = dayOccupied.some((occ) => doIntervalsOverlap(cand.start, cand.end, occ.start, occ.end));
      if (overlaps) continue;

      const currentDayMinutes = dailyMinutesByDate.get(cand.date) || 0;
      if (currentDayMinutes + item.durationMinutes > dailyCapMinutes) continue;

      // Check deadline: candidate slot must end on or before task deadline
      const candEndIso = `${cand.date}T${minutesToTime(cand.end)}:00Z`;
      if (new Date(candEndIso).getTime() > item.dueTimestamp) continue;

      // --- APPLY CANDIDATE (State Transition) ---
      const newSession: PlacedSession = {
        id: `sess_${item.taskId}_${cand.date}_${cand.start}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        taskId: item.taskId,
        subjectId: item.subjectId,
        date: cand.date,
        startTime: minutesToTime(cand.start),
        endTime: minutesToTime(cand.end),
        durationMinutes: item.durationMinutes,
        completed: false,
        locked: false,
        status: 'SCHEDULED',
        notes: `Scheduled study block (${item.chunkIndex + 1}/${item.totalChunks}): ${item.taskTitle}`,
      };

      currentSchedule.push(newSession);
      const intervalEntry = { start: cand.start, end: cand.end, taskId: item.taskId };
      dayOccupied.push(intervalEntry);
      dayOccupied.sort((a, b) => a.start - b.start);
      dailyMinutesByDate.set(cand.date, currentDayMinutes + item.durationMinutes);

      // --- RECURSIVE STEP ---
      const solutionFound = this.recursiveSearch(
        itemIndex + 1,
        workItems,
        currentSchedule,
        occupiedByDate,
        dailyMinutesByDate,
        preferredStudyByDay,
        horizonDates,
        mode,
        preferredStudyTime,
        dailyCapMinutes,
        bufferMinutes,
        state
      );

      if (solutionFound) {
        return true; // Success propagated up the recursion call stack
      }

      // --- BACKTRACK (State Restoration) ---
      currentSchedule.pop();
      const removeIdx = dayOccupied.findIndex((o) => o.start === cand.start && o.end === cand.end);
      if (removeIdx >= 0) {
        dayOccupied.splice(removeIdx, 1);
      }
      dailyMinutesByDate.set(cand.date, currentDayMinutes);
      state.backtrackCount++;

      // If budget exceeded during recursive call, abort early
      if (state.limitExceeded) {
        return false;
      }
    }

    // All candidates for this work item failed in this branch
    return false;
  }

  /**
   * Generates candidate slots for a work item across horizon dates
   */
  private static generateCandidateSlots(
    item: WorkItem,
    occupiedByDate: Map<string, Array<{ start: number; end: number; taskId?: string }>>,
    dailyMinutesByDate: Map<string, number>,
    preferredStudyByDay: Map<number, TimeInterval[]>,
    horizonDates: string[],
    mode: string,
    preferredStudyTime: string | undefined,
    dailyCapMinutes: number,
    bufferMinutes: number
  ): CandidateSlot[] {
    const candidates: CandidateSlot[] = [];
    const duration = item.durationMinutes;

    for (let dayIdx = 0; dayIdx < horizonDates.length; dayIdx++) {
      const dateStr = horizonDates[dayIdx];
      const dayDate = new Date(dateStr + 'T12:00:00Z');
      const dayOfWeek = dayDate.getUTCDay();

      // Check if day is past task deadline
      const dayStartIso = `${dateStr}T00:00:00Z`;
      if (new Date(dayStartIso).getTime() > item.dueTimestamp) {
        continue;
      }

      // Check remaining daily capacity
      const currentDayMinutes = dailyMinutesByDate.get(dateStr) || 0;
      if (currentDayMinutes + duration > dailyCapMinutes) {
        continue;
      }

      // Get open study intervals for this day of week
      const openIntervals = preferredStudyByDay.get(dayOfWeek) || [];
      if (openIntervals.length === 0) continue;

      // Get occupied intervals on this specific date
      const occupied = occupiedByDate.get(dateStr) || [];

      // Expand occupied intervals with buffer spacing if requested
      const occupiedWithBuffer: TimeInterval[] = occupied.map((o) => ({
        start: Math.max(0, o.start - bufferMinutes),
        end: Math.min(1440, o.end + bufferMinutes),
      }));

      // Free intervals = open intervals minus occupied (with buffer)
      const freeIntervals = subtractIntervals(openIntervals, occupiedWithBuffer);

      // Extract candidate slot positions
      for (const free of freeIntervals) {
        if (free.end - free.start < duration) continue;

        // Step through free interval by 30-min increments (or boundary)
        const step = 30;
        for (let s = free.start; s + duration <= free.end; s += step) {
          const e = s + duration;

          // Deadline check
          const slotEndIso = `${dateStr}T${minutesToTime(e)}:00Z`;
          if (new Date(slotEndIso).getTime() > item.dueTimestamp) {
            continue;
          }

          const score = scoreCandidateSlot(
            dateStr,
            s,
            e,
            item,
            mode,
            preferredStudyTime,
            dayIdx,
            horizonDates.length,
            currentDayMinutes,
            dailyCapMinutes
          );

          candidates.push({ date: dateStr, start: s, end: e, score });
        }

        // Also check exact end boundary if not aligned to 30-min step
        const exactEndStart = free.end - duration;
        if (exactEndStart >= free.start && exactEndStart % step !== 0) {
          const slotEndIso = `${dateStr}T${minutesToTime(free.end)}:00Z`;
          if (new Date(slotEndIso).getTime() <= item.dueTimestamp) {
            const score = scoreCandidateSlot(
              dateStr,
              exactEndStart,
              free.end,
              item,
              mode,
              preferredStudyTime,
              dayIdx,
              horizonDates.length,
              currentDayMinutes,
              dailyCapMinutes
            );
            candidates.push({ date: dateStr, start: exactEndStart, end: free.end, score });
          }
        }
      }
    }

    // Sort candidate slots by quality score descending (best candidate explored first)
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  /**
   * Diagnoses exact mathematical root cause when a task cannot be scheduled
   */
  private static diagnoseUnscheduledReason(
    task: SchedulerTaskInput,
    unplacedMinutes: number,
    horizonDates: string[],
    preferredStudyByDay: Map<number, TimeInterval[]>,
    occupiedByDate: Map<string, Array<{ start: number; end: number }>>,
    dailyMinutesByDate: Map<string, number>,
    dailyCapMinutes: number,
    state: SearchState
  ): UnscheduledReason {
    if (state.limitExceeded) {
      return 'SEARCH_LIMIT_EXCEEDED';
    }

    const taskDueTime = new Date(task.dueDate).getTime();
    let totalFreeMinutesBeforeDeadline = 0;
    let totalFreeMinutesInHorizon = 0;
    let totalPotentialCapacityBeforeDeadline = 0;

    for (const d of horizonDates) {
      const dayDate = new Date(d + 'T12:00:00Z');
      const dayOfWeek = dayDate.getUTCDay();
      const openIntervals = preferredStudyByDay.get(dayOfWeek) || [];
      const occupied = occupiedByDate.get(d) || [];
      const free = subtractIntervals(openIntervals, occupied);
      const freeMins = free.reduce((acc, i) => acc + (i.end - i.start), 0);

      totalFreeMinutesInHorizon += freeMins;

      const dayEndIso = `${d}T23:59:59Z`;
      if (new Date(dayEndIso).getTime() <= taskDueTime) {
        totalFreeMinutesBeforeDeadline += freeMins;
        const used = dailyMinutesByDate.get(d) || 0;
        totalPotentialCapacityBeforeDeadline += Math.max(0, dailyCapMinutes - used);
      }
    }

    if (totalFreeMinutesBeforeDeadline < unplacedMinutes) {
      return 'DEADLINE_INFEASIBLE';
    }

    if (totalFreeMinutesInHorizon < unplacedMinutes) {
      return 'INSUFFICIENT_AVAILABILITY';
    }

    if (totalPotentialCapacityBeforeDeadline < unplacedMinutes) {
      return 'DAILY_CAP_REACHED';
    }

    return 'NO_FEASIBLE_SLOT';
  }
}
