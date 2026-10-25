/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar,
  AlertTriangle,
  Plus,
  BookOpen,
} from 'lucide-react';
import { ScheduledSession, Task, AvailabilitySlot, Subject } from '../../types';
import { usePlanner } from '../../context/PlannerContext';
import { SUBJECT_CATEGORY_STYLES } from '../../theme/tokens';
import { Badge, PriorityBadge } from '../ui/Badge';
import { timeToMinutes } from '../../utils/scheduleGenerator';

export interface WeeklyTimeGridProps {
  onSelectSession: (session: ScheduledSession) => void;
  onAddSessionAtTime?: (date: string, startTime: string) => void;
}

export function WeeklyTimeGrid({
  onSelectSession,
  onAddSessionAtTime,
}: WeeklyTimeGridProps) {
  const { sessions, tasks, subjects, availability, conflicts } = usePlanner();

  // Days in Fall 2026 Week 7
  const weekDays = [
    { date: '2026-10-05', dayOfWeek: 1, name: 'Mon', fullDate: 'Oct 5' },
    { date: '2026-10-06', dayOfWeek: 2, name: 'Tue', fullDate: 'Oct 6', isToday: true },
    { date: '2026-10-07', dayOfWeek: 3, name: 'Wed', fullDate: 'Oct 7' },
    { date: '2026-10-08', dayOfWeek: 4, name: 'Thu', fullDate: 'Oct 8' },
    { date: '2026-10-09', dayOfWeek: 5, name: 'Fri', fullDate: 'Oct 9' },
    { date: '2026-10-10', dayOfWeek: 6, name: 'Sat', fullDate: 'Oct 10' },
    { date: '2026-10-11', dayOfWeek: 0, name: 'Sun', fullDate: 'Oct 11' },
  ];

  // Mobile selected day state
  const [selectedMobileDate, setSelectedMobileDate] = useState('2026-10-06');

  // Time grid parameters: 08:00 (480 mins) to 22:00 (1320 mins)
  const START_HOUR = 8;
  const END_HOUR = 22;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const HOUR_HEIGHT = 64; // px per hour
  const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  // Helper to calculate top and height in px
  const getSlotGeometry = (startTime: string, endTime: string) => {
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const gridStartMins = START_HOUR * 60;

    const top = Math.max(0, ((startMins - gridStartMins) / 60) * HOUR_HEIGHT);
    const height = Math.max(28, ((endMins - startMins) / 60) * HOUR_HEIGHT);

    return { top, height };
  };

  // Current time anchor for Tuesday Oct 6 at 14:15
  const currentHourFraction = 14.25;
  const currentTimeTop = (currentHourFraction - START_HOUR) * HOUR_HEIGHT;

  return (
    <div className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* =========================================================================
          DESKTOP WEEKLY TIME GRID (lg and up)
         ========================================================================= */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="min-w-[860px]">
          {/* Header Row: Time Axis Spacer + 7 Day Headers */}
          <div className="grid grid-cols-[70px_repeat(7,minmax(0,1fr))] border-b border-slate-200/80 bg-slate-50/75 sticky top-0 z-20">
            {/* Time corner header */}
            <div className="p-3 border-r border-slate-200/60 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center">
              Time
            </div>

            {/* 7 Days Columns */}
            {weekDays.map((day) => {
              const dayTasks = tasks.filter((t) => t.dueDate.startsWith(day.date));

              return (
                <div
                  key={day.date}
                  className={`p-3 border-r border-slate-200/60 last:border-r-0 transition-colors ${
                    day.isToday ? 'bg-sky-50/80' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black uppercase tracking-wider ${
                        day.isToday ? 'text-sky-900' : 'text-slate-700'
                      }`}
                    >
                      {day.name}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        day.isToday
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'text-slate-500 bg-white/80 border border-slate-200/60'
                      }`}
                    >
                      {day.fullDate}
                    </span>
                  </div>

                  {/* All-Day Deadlines Ribbon */}
                  {dayTasks.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className="px-1.5 py-1 rounded-md text-[10px] font-bold bg-white border border-rose-200/90 text-rose-900 shadow-2xs flex items-center justify-between truncate"
                          title={`Due: ${task.title}`}
                        >
                          <span className="truncate mr-1">Due: {task.title}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time Grid Canvas */}
          <div
            className="grid grid-cols-[70px_repeat(7,minmax(0,1fr))] relative"
            style={{ height: `${GRID_HEIGHT}px` }}
          >
            {/* Left Time Column */}
            <div className="border-r border-slate-200/60 bg-slate-50/40 relative select-none">
              {hours.map((hour) => {
                const top = (hour - START_HOUR) * HOUR_HEIGHT;
                const formatted = `${hour < 10 ? '0' : ''}${hour}:00`;
                return (
                  <div
                    key={hour}
                    className="absolute right-2 -translate-y-2 text-[10px] font-mono font-bold text-slate-400"
                    style={{ top: `${top}px` }}
                  >
                    {formatted}
                  </div>
                );
              })}
            </div>

            {/* 7 Day Vertical Columns */}
            {weekDays.map((day) => {
              // Sessions on this day
              const daySessions = sessions.filter(
                (s) => s.date === day.date && s.status !== 'cancelled'
              );

              // Class commitments from availability on this day of week
              const dayClasses = availability.filter(
                (a) => a.dayOfWeek === day.dayOfWeek && a.type !== 'preferred_study'
              );
              return (
                <div
                  key={day.date}
                  className={`border-r border-slate-200/60 last:border-r-0 relative group ${
                    day.isToday ? 'bg-sky-50/20' : 'bg-white'
                  }`}
                  style={{ height: `${GRID_HEIGHT}px` }}
                >
                  {/* Horizontal Hour Guidelines */}
                  {hours.map((hour) => {
                    const top = (hour - START_HOUR) * HOUR_HEIGHT;
                    return (
                      <div
                        key={hour}
                        className="absolute inset-x-0 border-t border-slate-100 pointer-events-none"
                        style={{ top: `${top}px` }}
                      />
                    );
                  })}

                  {/* Current Time Indicator on Tuesday */}
                  {day.isToday && currentTimeTop >= 0 && currentTimeTop <= GRID_HEIGHT && (
                    <div
                      className="absolute inset-x-0 z-15 pointer-events-none flex items-center"
                      style={{ top: `${currentTimeTop}px` }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs -ml-1.5" />
                      <div className="h-0.5 bg-rose-500 flex-1 shadow-xs" />
                    </div>
                  )}

                  {/* 1. Academic Lecture / Work Commitments */}
                  {dayClasses.map((comm) => {
                    const { top, height } = getSlotGeometry(comm.startTime, comm.endTime);
                    return (
                      <div
                        key={comm.id}
                        className="absolute inset-x-1 rounded-xl p-2 z-5 border border-slate-300/80 bg-slate-100/90 text-slate-700 shadow-2xs overflow-hidden flex flex-col justify-between"
                        style={{ top: `${top}px`, height: `${height}px` }}
                        title={`${comm.label || 'Commitment'} (${comm.startTime}–${comm.endTime})`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500">
                            <span>
                              {comm.startTime}–{comm.endTime}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-slate-400">
                              {comm.type}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                            {comm.label || 'Class Lecture'}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 2. Scheduled Study Sessions */}
                  {daySessions.map((session) => {
                    const task = tasks.find((t) => t.id === session.taskId);
                    const subject = subjects.find((s) => s.id === session.subjectId);
                    const category = subject?.colorKey || 'cs';
                    const categoryStyle = SUBJECT_CATEGORY_STYLES[category];

                    const { top, height } = getSlotGeometry(session.startTime, session.endTime);

                    // Check if this session has a conflict
                    const hasConflict = conflicts.some(
                      (c) => c.sessionIds?.includes(session.id)
                    );

                    const status = session.status || (session.completed ? 'completed' : 'scheduled');

                    return (
                      <div
                        key={session.id}
                        onClick={() => onSelectSession(session)}
                        className={`absolute inset-x-1 rounded-xl p-2 z-10 border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:scale-[1.01] overflow-hidden flex flex-col justify-between ${
                          session.completed
                            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 opacity-80'
                            : status === 'missed'
                            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                            : `${categoryStyle.bgWash} ${categoryStyle.border} ${categoryStyle.text}`
                        } ${session.locked ? 'ring-1 ring-amber-400/80' : ''}`}
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        {/* Session Top Bar: Time, Lock & Status */}
                        <div className="min-w-0">
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                            <span className="tabular-nums">
                              {session.startTime}–{session.endTime}
                            </span>

                            <div className="flex items-center gap-1 shrink-0">
                              {hasConflict && (
                                <span title="Schedule collision or post-deadline">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                </span>
                              )}
                              {session.locked && (
                                <span title="Locked slot (Shielded from generation)">
                                  <Lock className="w-2.5 h-2.5 text-amber-700" />
                                </span>
                              )}
                              {session.completed && (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              )}
                            </div>
                          </div>

                          {/* Task title */}
                          <div
                            className={`text-xs font-extrabold truncate mt-0.5 leading-tight ${
                              session.completed ? 'line-through opacity-75' : 'text-slate-900'
                            }`}
                          >
                            {task?.title || 'Study Block'}
                          </div>

                          {/* Course code & minutes */}
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold opacity-80">
                            <span>{subject?.code}</span>
                            <span>·</span>
                            <span className="font-mono">{session.durationMinutes}m</span>
                          </div>
                        </div>

                        {/* Status chip if tight height */}
                        {height > 60 && (
                          <div className="flex items-center justify-between text-[9px] font-extrabold uppercase tracking-wider pt-1 border-t border-black/5">
                            <span>{status}</span>
                            {session.locked && (
                              <span className="text-amber-800 font-bold">LOCKED</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MOBILE WEEKLY AGENDA VIEW (Under lg screens)
         ========================================================================= */}
      <div className="lg:hidden p-4 space-y-4">
        {/* Day Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {weekDays.map((day) => {
            const isSelected = selectedMobileDate === day.date;
            const daySessionCount = sessions.filter(
              (s) => s.date === day.date && s.status !== 'cancelled'
            ).length;

            return (
              <button
                key={day.date}
                onClick={() => setSelectedMobileDate(day.date)}
                className={`px-3 py-2 rounded-xl text-center shrink-0 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-2xs font-extrabold'
                    : day.isToday
                    ? 'bg-sky-50 text-sky-900 border-sky-200 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 font-medium'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider">
                  {day.name}
                </div>
                <div className="text-sm font-mono font-bold mt-0.5">
                  {day.fullDate.split(' ')[1]}
                </div>
                {daySessionCount > 0 && (
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-sky-600'
                      }`}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Agenda List */}
        <div className="space-y-3 pt-2">
          {(() => {
            const currentDayMeta = weekDays.find((d) => d.date === selectedMobileDate);
            const daySessions = sessions.filter(
              (s) => s.date === selectedMobileDate && s.status !== 'cancelled'
            );
            const dayClasses = availability.filter(
              (a) =>
                a.dayOfWeek === currentDayMeta?.dayOfWeek &&
                a.type !== 'preferred_study'
            );
            const dayTasks = tasks.filter((t) =>
              t.dueDate.startsWith(selectedMobileDate)
            );

            return (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">
                    {currentDayMeta?.name}, {currentDayMeta?.fullDate}
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {daySessions.length} Study Blocks · {dayClasses.length} Commitments
                  </span>
                </div>

                {/* Deadlines for this day */}
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-rose-200 bg-rose-50/80 text-rose-950 flex items-center justify-between"
                  >
                    <div className="text-xs font-extrabold truncate">
                      Due: {t.title}
                    </div>
                    <PriorityBadge priority={t.priority} size="xs" />
                  </div>
                ))}

                {/* Class Commitments */}
                {dayClasses.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-500">
                      <span>
                        {c.startTime}–{c.endTime}
                      </span>
                      <span className="uppercase text-[10px] text-slate-400 font-bold">
                        {c.type}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {c.label || 'Course Lecture'}
                    </div>
                  </div>
                ))}

                {/* Study Sessions */}
                {daySessions.map((s) => {
                  const task = tasks.find((t) => t.id === s.taskId);
                  const subject = subjects.find((sub) => sub.id === s.subjectId);
                  const category = subject?.colorKey || 'cs';
                  const catStyle = SUBJECT_CATEGORY_STYLES[category];

                  return (
                    <div
                      key={s.id}
                      onClick={() => onSelectSession(s)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                        s.completed
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : `${catStyle.bgWash} ${catStyle.border}`
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {s.startTime}–{s.endTime} ({s.durationMinutes}m)
                        </span>
                        <div className="flex items-center gap-1.5">
                          {s.locked && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Locked</span>
                            </span>
                          )}
                          <Badge variant="subject" category={category}>
                            {subject?.code}
                          </Badge>
                        </div>
                      </div>

                      <div
                        className={`text-xs sm:text-sm font-extrabold ${
                          s.completed ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task?.title || 'Study Session'}
                      </div>
                    </div>
                  );
                })}

                {daySessions.length === 0 && dayClasses.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No scheduled blocks for this day.
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
