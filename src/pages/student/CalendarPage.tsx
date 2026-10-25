/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  CalendarRange,
  Columns,
  ListOrdered,
  Plus,
  Lock,
  Info,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge, PriorityBadge } from '../../components/ui/Badge';
import { usePlanner } from '../../context/PlannerContext';
import { useToast } from '../../context/ToastContext';
import { SUBJECT_CATEGORY_STYLES } from '../../theme/tokens';
import { ScheduledSession, Task } from '../../types';
import { exportCalendarToICS } from '../../utils/icsExport';
import { WeeklyTimeGrid } from '../../components/schedule/WeeklyTimeGrid';
import { DailyTimeline } from '../../components/schedule/DailyTimeline';
import { SessionDetailModal } from '../../components/schedule/SessionDetailModal';
import { SessionEditModal } from '../../components/schedule/SessionEditModal';
import { formatLongLocalDate, toLocalDateKey } from '../../utils/date';

export function CalendarPage() {
  const navigate = useNavigate();
  const {
    tasks,
    subjects,
    sessions,
    availability,
    toggleSessionComplete,
    toggleSessionLock,
  } = usePlanner();
  const { showToast } = useToast();

  // Calendar View Mode: 'month' | 'week' | 'day'
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');

  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDayNumber, setSelectedDayNumber] = useState(today.getDate());
  const selectedDate = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    selectedDayNumber
  );
  const selectedDateStr = toLocalDateKey(selectedDate);

  // Modals state
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<ScheduledSession | null>(null);
  const [sessionToEdit, setSessionToEdit] = useState<ScheduledSession | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [initialEditDate, setInitialEditDate] = useState<string | undefined>(undefined);
  const [initialEditTime, setInitialEditTime] = useState<string | undefined>(undefined);

  const currentMonthName = visibleMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const daysInMonth = Array.from(
    { length: new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate() },
    (_, i) => i + 1
  );
  const firstDayOffset = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1
  ).getDay();

  const moveMonth = (offset: number) => {
    const nextMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + offset,
      1
    );
    const isCurrentMonth =
      nextMonth.getFullYear() === today.getFullYear() &&
      nextMonth.getMonth() === today.getMonth();
    setVisibleMonth(nextMonth);
    setSelectedDayNumber(isCurrentMonth ? today.getDate() : 1);
  };

  // Handle RFC 5545 iCalendar export
  const handleExportICS = () => {
    try {
      exportCalendarToICS({ sessions, tasks, subjects, availability });
      showToast('Downloaded StudyFlow calendar file', 'success');
    } catch {
      showToast('Unable to generate ICS file', 'error');
    }
  };

  // Open modal to add new session
  const handleOpenAddSession = (date?: string, startTime?: string) => {
    setSessionToEdit(null);
    setInitialEditDate(date || selectedDateStr);
    setInitialEditTime(startTime || '14:00');
    setIsEditModalOpen(true);
  };

  // Open modal to edit existing session
  const handleOpenEditSession = (session: ScheduledSession) => {
    setSelectedSessionForDetail(null);
    setSessionToEdit(session);
    setInitialEditDate(session.date);
    setInitialEditTime(session.startTime);
    setIsEditModalOpen(true);
  };

  // Sessions for the currently selected day in month view
  const selectedDaySessions = sessions
    .filter((s) => s.date === selectedDateStr && s.status !== 'cancelled')
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const selectedDayOfWeek = selectedDate.getDay();

  // Recurring course lectures for the selected day
  const selectedDayLectures = availability
    .filter((a) => a.dayOfWeek === selectedDayOfWeek && a.type !== 'preferred_study')
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Deadlines due on selected day
  const selectedDayDeadlines = tasks.filter((t) => t.dueDate.startsWith(selectedDateStr));

  return (
    <div className="space-y-6 max-w-[1440px] w-full pb-16 font-sans">
      {/* =========================================================================
          1. HEADER & VIEW SWITCHER
         ========================================================================= */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>Academic Calendar Grid · {formatLongLocalDate(today)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Term Calendar & Commitments
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl font-medium leading-relaxed">
            Unified view integrating course lectures, assignment milestones, and allocated study blocks.
          </p>
        </div>

        {/* View Switcher & Export Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                calendarView === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                calendarView === 'week'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Week</span>
            </button>
            <button
              onClick={() => setCalendarView('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                calendarView === 'day'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Day</span>
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={handleExportICS}
            icon={<Download className="w-3.5 h-3.5 text-slate-500" />}
          >
            Export .ics
          </Button>
        </div>
      </div>

      {sessions.length === 0 && (
        <EmptyState
          icon={<CalendarIcon className="w-7 h-7 text-sky-600" />}
          title="No study sessions planned"
          description={
            subjects.length === 0
              ? 'Add your first course, then record deadlines and availability to begin building a schedule.'
              : tasks.length === 0
              ? 'Add an assignment or exam so StudyFlow has coursework to place on your calendar.'
              : !availability.some((slot) => slot.type === 'preferred_study')
              ? 'Set a preferred study window so StudyFlow knows when you are available.'
              : 'Your setup is ready. Generate your first schedule to add study sessions to the calendar.'
          }
          actionLabel={
            subjects.length === 0
              ? 'Add Your First Course'
              : tasks.length === 0
              ? 'Add Assignment or Exam'
              : !availability.some((slot) => slot.type === 'preferred_study')
              ? 'Set Weekly Availability'
              : 'Open Schedule Generator'
          }
          onAction={() => {
            if (subjects.length === 0) navigate('/subjects');
            else if (tasks.length === 0) navigate('/tasks');
            else if (!availability.some((slot) => slot.type === 'preferred_study')) navigate('/availability');
            else navigate('/schedule');
          }}
        />
      )}

      {/* =========================================================================
          2. VIEW RENDERER (MONTH / WEEK / DAY)
         ========================================================================= */}

      {calendarView === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7/12): True Month Calendar Grid */}
          <div className="lg:col-span-7 surface-base rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold border border-sky-200/60 shadow-2xs">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-base font-extrabold text-slate-900">{currentMonthName}</span>
                  <span className="text-[11px] text-slate-500 block">Monthly commitments and deadlines</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 7-Day Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-extrabold text-slate-400 uppercase tracking-wider py-1 border-b border-slate-100">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Day Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDayOffset }, (_, index) => (
                <div
                  key={`offset-${index}`}
                  className="h-16 p-1.5 bg-slate-50/40 rounded-xl opacity-30"
                  aria-hidden="true"
                />
              ))}

              {daysInMonth.map((day) => {
                const dayDateStr = toLocalDateKey(
                  new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)
                );
                const isSelected = selectedDayNumber === day;
                const isToday = dayDateStr === todayKey;

                // Deadlines for this day
                const dayDeadlines = tasks.filter((t) => t.dueDate.startsWith(dayDateStr));
                // Scheduled study sessions for this day
                const dayStudySessions = sessions.filter(
                  (s) => s.date === dayDateStr && s.status !== 'cancelled'
                );

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayNumber(day)}
                    className={`h-16 p-1.5 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                      isSelected
                        ? 'surface-base border-2 border-sky-500 shadow-xs ring-2 ring-sky-500/20 bg-gradient-to-br from-sky-50/90 to-white'
                        : isToday
                        ? 'surface-base border-sky-400 bg-sky-50/30 shadow-2xs'
                        : 'surface-base border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono w-full">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                          isToday
                            ? 'bg-sky-600 text-white shadow-2xs'
                            : isSelected
                            ? 'text-sky-850 font-black'
                            : 'text-slate-700'
                        }`}
                      >
                        {day}
                      </span>

                      {/* Status indicator badges */}
                      <div className="flex items-center gap-1">
                        {dayDeadlines.length > 0 && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-rose-500"
                            title={`${dayDeadlines.length} deadline(s)`}
                          />
                        )}
                        {dayStudySessions.length > 0 && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-sky-500"
                            title={`${dayStudySessions.length} session(s)`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Micro label for notable milestones */}
                    <div className="truncate text-[9px] font-bold w-full">
                      {dayDeadlines.length > 0 ? (
                        <span className="text-rose-600 truncate block">
                          Due: {dayDeadlines[0].title.slice(0, 10)}..
                        </span>
                      ) : dayStudySessions.length > 0 ? (
                        <span className="text-sky-600 font-mono">
                          {dayStudySessions.length} block{dayStudySessions.length > 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Deliverable Due Date</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Allocated Study Block</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span>Available Window</span>
              </div>
            </div>
          </div>

          {/* Right Column (5/12): Day Agenda Drawer with time-ordered blocks */}
          <div className="lg:col-span-5 surface-base rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                  {selectedDateStr === todayKey ? "Today's Agenda" : 'Day Agenda'}
                </div>
                <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {selectedDate.toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAddSession(selectedDateStr)}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer text-xs font-bold flex items-center gap-1"
                  title="Schedule session for this date"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </button>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {selectedDaySessions.length} Study Block{selectedDaySessions.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Deadlines Section if any */}
            {selectedDayDeadlines.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span>Deliverables Due Today</span>
                </div>
                {selectedDayDeadlines.map((task) => {
                  const sub = subjects.find((s) => s.id === task.subjectId);
                  return (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/70 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-extrabold text-rose-950 block truncate">
                          {task.title}
                        </span>
                        <span className="text-[11px] text-rose-700 font-medium">
                          {sub?.code} · {task.estimatedHours}h estimated
                        </span>
                      </div>
                      <PriorityBadge priority={task.priority} size="xs" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Time-ordered Schedule Stream */}
            <div className="space-y-2.5">
              {/* Course Lectures */}
              {selectedDayLectures.map((lec) => (
                <div
                  key={lec.id}
                  className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono tabular-nums font-bold text-blue-900">
                      {lec.startTime} – {lec.endTime}
                    </span>
                    <span className="font-bold text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md uppercase">
                      Lecture Commitment
                    </span>
                  </div>
                  <div className="text-xs font-bold text-blue-950">
                    {lec.label || 'Course Lecture Commitment'}
                  </div>
                </div>
              ))}

              {/* Study Sessions */}
              {selectedDaySessions.map((session) => {
                const task = tasks.find((t) => t.id === session.taskId);
                const subject = subjects.find((s) => s.id === session.subjectId);
                const category = subject?.colorKey || 'cs';
                const catStyle = SUBJECT_CATEGORY_STYLES[category];

                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSessionForDetail(session)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      session.completed
                        ? 'bg-slate-50/80 border-slate-200 opacity-75'
                        : `${catStyle.bgWash} ${catStyle.border} hover:shadow-xs`
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {session.startTime} – {session.endTime} ({session.durationMinutes}m)
                      </span>
                      <div className="flex items-center gap-1.5">
                        {session.locked && (
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
                      className={`text-xs font-bold leading-snug ${
                        session.completed ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {task?.title || 'Course assignment focus block'}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-slate-500 font-medium">
                        Status: <strong className="capitalize">{session.status || (session.completed ? 'completed' : 'scheduled')}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSessionComplete(session.id);
                        }}
                        className={`font-semibold cursor-pointer transition-colors ${
                          session.completed ? 'text-slate-400 hover:text-slate-600' : 'text-sky-600 hover:text-sky-700'
                        }`}
                      >
                        {session.completed ? 'Mark Incomplete' : 'Mark Done ✓'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {selectedDaySessions.length === 0 && selectedDayLectures.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <CalendarIcon className="w-6 h-6 mx-auto text-slate-300" />
                  <p>No study sessions or lectures are planned for this date.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenAddSession(selectedDateStr)}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Schedule Study Block
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Week View */}
      {calendarView === 'week' && (
        <WeeklyTimeGrid
          onSelectSession={(session) => setSelectedSessionForDetail(session)}
          onAddSessionAtTime={(date, startTime) => handleOpenAddSession(date, startTime)}
        />
      )}

      {/* Day View */}
      {calendarView === 'day' && (
        <DailyTimeline
          currentDate={selectedDateStr}
          onSelectSession={(session) => setSelectedSessionForDetail(session)}
          onEditSession={(session) => handleOpenEditSession(session)}
          onAddSession={() => handleOpenAddSession(selectedDateStr)}
        />
      )}

      {/* =========================================================================
          3. MODALS (DETAIL & EDIT)
         ========================================================================= */}
      <SessionDetailModal
        session={selectedSessionForDetail}
        isOpen={!!selectedSessionForDetail}
        onClose={() => setSelectedSessionForDetail(null)}
        onEdit={handleOpenEditSession}
      />

      <SessionEditModal
        session={sessionToEdit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSessionToEdit(null);
        }}
        initialDate={initialEditDate}
        initialStartTime={initialEditTime}
      />
    </div>
  );
}
