/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Edit2,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { ScheduledSession, Task, Subject } from '../../types';
import { usePlanner } from '../../context/PlannerContext';
import { SUBJECT_CATEGORY_STYLES } from '../../theme/tokens';
import { Badge, PriorityBadge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface DailyTimelineProps {
  currentDate: string;
  onSelectSession: (session: ScheduledSession) => void;
  onEditSession: (session: ScheduledSession) => void;
  onAddSession: () => void;
}

export function DailyTimeline({
  currentDate,
  onSelectSession,
  onEditSession,
  onAddSession,
}: DailyTimelineProps) {
  const {
    sessions,
    tasks,
    subjects,
    availability,
    toggleSessionComplete,
    toggleSessionLock,
  } = usePlanner();

  // Sessions for this specific date
  const daySessions = sessions
    .filter((s) => s.date === currentDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Determine dayOfWeek for availability lookup
  const dateObj = new Date(`${currentDate}T12:00:00`);
  const dayOfWeek = dateObj.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  // Day commitments from availability
  const dayClasses = availability
    .filter((a) => a.dayOfWeek === dayOfWeek && a.type !== 'preferred_study')
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Combine commitments and sessions into a unified chronological stream
  type TimelineItem =
    | { type: 'session'; data: ScheduledSession }
    | { type: 'commitment'; data: typeof dayClasses[0] };

  const timelineItems: TimelineItem[] = [
    ...daySessions.map((s) => ({ type: 'session' as const, data: s })),
    ...dayClasses.map((c) => ({ type: 'commitment' as const, data: c })),
  ].sort((a, b) => a.data.startTime.localeCompare(b.data.startTime));

  // Day metrics
  const totalPlannedMinutes = daySessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const completedMinutes = daySessions
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  const totalHours = (totalPlannedMinutes / 60).toFixed(1);
  const completedHours = (completedMinutes / 60).toFixed(1);

  return (
    <div className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-6">
      {/* Day Overview Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <div className="text-xs font-bold text-sky-600 uppercase tracking-wider">
            Daily Study Timeline
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
            {dateObj.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-slate-700">
            <span>{completedHours}h</span>
            <span className="text-slate-400"> / </span>
            <span>{totalHours}h Completed</span>
          </div>

          <Button variant="secondary" size="sm" onClick={onAddSession}>
            + Add Block
          </Button>
        </div>
      </div>

      {/* Timeline Stream */}
      {timelineItems.length > 0 ? (
        <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {timelineItems.map((item, idx) => {
            if (item.type === 'commitment') {
              const comm = item.data;
              return (
                <div key={`comm_${comm.id}_${idx}`} className="relative group">
                  {/* Timeline circle node */}
                  <div className="absolute -left-6 sm:-left-8 top-3.5 w-3 h-3 rounded-full bg-slate-400 border-2 border-white shadow-xs" />

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 tabular-nums">
                          {comm.startTime} – {comm.endTime}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                          {comm.type} Commitment
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {comm.label || 'Course Lecture / Commitment'}
                    </div>
                  </div>
                </div>
              );
            }

            const session = item.data;
            const task = tasks.find((t) => t.id === session.taskId);
            const subject = subjects.find((s) => s.id === session.subjectId);
            const category = subject?.colorKey || 'cs';
            const categoryStyle = SUBJECT_CATEGORY_STYLES[category];

            const status = session.status || (session.completed ? 'completed' : 'scheduled');

            return (
              <div key={`ses_${session.id}`} className="relative group">
                {/* Timeline circle node */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs transition-colors ${
                    session.completed
                      ? 'bg-emerald-500'
                      : status === 'missed'
                      ? 'bg-amber-500'
                      : 'bg-sky-500'
                  }`}
                />

                <div
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    session.completed
                      ? 'bg-slate-50/70 border-slate-200 opacity-80'
                      : `${categoryStyle.bgWash} ${categoryStyle.border}`
                  }`}
                >
                  {/* Left: Complete check, Time, Task info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSessionComplete(session.id)}
                      className={`w-5 h-5 rounded-md mt-1 flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                        session.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                          : 'border-slate-300 hover:border-sky-500 bg-white'
                      }`}
                      aria-label="Toggle completed"
                    >
                      {session.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {session.startTime} – {session.endTime}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono font-semibold text-slate-500">
                          {session.durationMinutes} mins
                        </span>

                        {session.locked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Locked</span>
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            session.completed
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'missed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      <div
                        onClick={() => onSelectSession(session)}
                        className={`text-base font-extrabold cursor-pointer hover:underline ${
                          session.completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-900'
                        }`}
                      >
                        {task?.title || 'Course Deliverable Block'}
                      </div>

                      <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                        <span>{subject?.name}</span>
                        {task && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono">
                              Due{' '}
                              {new Date(task.dueDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <Badge variant="subject" category={category}>
                      {subject?.code}
                    </Badge>

                    <button
                      type="button"
                      onClick={() => toggleSessionLock(session.id)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                        session.locked
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                      }`}
                      title={session.locked ? 'Unlock session' : 'Lock session'}
                    >
                      {session.locked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditSession(session)}
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
                      title="Edit Session"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-slate-400 space-y-2">
          <Calendar className="w-8 h-8 mx-auto text-slate-300" />
          <p>No study sessions or class commitments scheduled for this date.</p>
          <Button variant="secondary" size="sm" onClick={onAddSession}>
            Schedule a Study Session
          </Button>
        </div>
      )}
    </div>
  );
}
