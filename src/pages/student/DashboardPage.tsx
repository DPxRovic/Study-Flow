/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  CheckSquare,
  Clock,
  CalendarRange,
  ArrowRight,
  TrendingUp,
  BookOpen,
  AlertCircle,
  Coffee,
  Check,
  Calendar,
  Layers,
  GraduationCap,
  Plus,
  Play,
  Flame,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge, PriorityBadge } from '../../components/ui/Badge';
import { usePlanner } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import { SUBJECT_CATEGORY_STYLES } from '../../theme/tokens';
import { FocusTimerModal } from '../../components/dashboard/FocusTimerModal';
import { formatCurrentWeekLabel, formatLongLocalDate, toLocalDateKey } from '../../utils/date';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    tasks,
    subjects,
    sessions,
    todaySessions,
    toggleSessionComplete,
    announcements,
    generateSchedule,
    availability,
  } = usePlanner();

  // State for active focus timer modal
  const [timerModalOpen, setTimerModalOpen] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const now = new Date();
  const todayName = now.toLocaleDateString(undefined, { weekday: 'long' });
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  // Tabular stats calculations
  const totalMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const completedMinutes = todaySessions
    .filter((s) => s.completed)
    .reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHoursStr = (totalMinutes / 60).toFixed(1);
  const completedHoursStr = (completedMinutes / 60).toFixed(1);
  const remainingHoursStr = Math.max(0, (totalMinutes - completedMinutes) / 60).toFixed(1);
  const progressPercent = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0;

  // Active session right now / next focus session
  const activeSession = todaySessions.find((s) => !s.completed) || todaySessions[0] || null;
  const activeTask = tasks.find((t) => t.id === activeSession?.taskId) || null;
  const activeSubject = subjects.find((s) => s.id === activeSession?.subjectId) || null;
  const activeCategory = activeSubject?.colorKey || 'cs';
  const activeStyle = SUBJECT_CATEGORY_STYLES[activeCategory] || SUBJECT_CATEGORY_STYLES.cs;

  // Target daily cap calculation
  const dailyCap = user?.targetDailyStudyCapHours || 5.5;
  const totalPlannedHours = totalMinutes / 60;
  const capMargin = Math.max(0, dailyCap - totalPlannedHours);
  const isOverCap = totalPlannedHours > dailyCap;

  // Filtered today's sessions
  const filteredSessions = todaySessions.filter((s) => {
    if (timelineFilter === 'pending') return !s.completed;
    if (timelineFilter === 'completed') return s.completed;
    return true;
  });

  // Upcoming deadlines with semantic urgency classification
  const upcomingTasks = tasks
    .filter((t) => t.status !== 'completed')
    .map((task) => {
      const subject = subjects.find((s) => s.id === task.subjectId);
      const dueDateObj = new Date(task.dueDate);
      const diffHours = (dueDateObj.getTime() - now.getTime()) / (1000 * 3600);
      const diffDays = Math.ceil(diffHours / 24);

      let urgency: 'urgent' | 'approaching' | 'normal' | 'overdue' = 'normal';
      let urgencyLabel = `In ${diffDays} days`;
      let urgencyColor = 'text-slate-600 bg-slate-100 border-slate-200';

      if (diffHours < 0) {
        urgency = 'overdue';
        urgencyLabel = 'Overdue';
        urgencyColor = 'text-rose-700 bg-rose-50 border-rose-200';
      } else if (diffHours <= 48) {
        urgency = 'urgent';
        urgencyLabel = diffHours <= 24 ? 'Due Tomorrow' : 'Due in 2 days';
        urgencyColor = 'text-amber-700 bg-amber-50 border-amber-200';
      } else if (diffDays <= 5) {
        urgency = 'approaching';
        urgencyLabel = `In ${diffDays} days`;
        urgencyColor = 'text-sky-700 bg-sky-50 border-sky-200';
      }

      return {
        ...task,
        subject,
        diffDays,
        urgency,
        urgencyLabel,
        urgencyColor,
      };
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Class commitments for the user's real local day.
  const todayClasses = availability.filter((slot) => slot.dayOfWeek === now.getDay() && slot.type === 'class');

  const nextThreeDays = Array.from({ length: 3 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index + 1);
    const dateKey = toLocalDateKey(date);
    const daySessions = sessions
      .filter((session) => session.date === dateKey && session.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const dueTasks = tasks.filter((task) => task.status !== 'completed' && task.dueDate.startsWith(dateKey));
    const plannedHours = daySessions.reduce((sum, session) => sum + session.durationMinutes / 60, 0);

    return {
      dateKey,
      label: date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
      daySessions,
      dueTasks,
      plannedHours,
    };
  });

  const activeTasksCount = tasks.filter((t) => t.status !== 'completed').length;

  return (
    <div className="space-y-6 max-w-[1440px] w-full pb-12 font-sans">
      {/* 1. Header & Quick Actions */}
      <div className="border-b border-slate-200/90 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/80">
              Student Workspace · {user?.term || 'Fall 2026'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Week of {formatCurrentWeekLabel(now)}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
              isOverCap
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOverCap ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
              Cap: {dailyCap}h / day
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {greeting}, {user?.name?.split(' ')[0] || 'Student'}.
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium leading-relaxed">
            Curriculum pacing, active deliverable deadlines, weekly time windows, and fatigue safeguard boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/schedule">
            <Button variant="secondary" size="sm" icon={<CalendarRange className="w-3.5 h-3.5 text-sky-600" />}>
              Study Schedule
            </Button>
          </Link>
          <Link to="/subjects">
            <Button variant="secondary" size="sm" icon={<BookOpen className="w-3.5 h-3.5" />}>
              Courses ({subjects.length})
            </Button>
          </Link>
          <Link to="/tasks">
            <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
              Add Assignment
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Key Academic Workload & Progress Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Active in Queue */}
        <div className="p-4 sm:p-5 surface-base rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Active Deliverables</span>
            <CheckSquare className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {activeTasksCount} tasks
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {tasks.filter((t) => t.priority === 'urgent').length} due &le; 48 hours
          </div>
        </div>

        {/* Metric 2: Enrolled Courses */}
        <div className="p-4 sm:p-5 surface-base rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Enrolled Courses</span>
            <BookOpen className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {subjects.length} courses
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {subjects.reduce((sum, s) => sum + (s.credits || 3), 0)} total credit units
          </div>
        </div>

        {/* Metric 3: Daily Study Cap */}
        <div className="p-4 sm:p-5 surface-base rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Daily Study Cap</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {dailyCap}h / day
          </div>
          <div className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Fatigue Safeguard</span>
          </div>
        </div>

        {/* Metric 4: Scheduled Study */}
        <div className="p-4 sm:p-5 surface-base rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Today's Study Progress</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {completedHoursStr}h / {totalHoursStr}h
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {progressPercent}% complete ({remainingHoursStr}h remaining)
          </div>
        </div>
      </div>

      {/* 3. Main Content: Getting Started Guide (when no subjects) or Full Student Focus Plan */}
      {subjects.length === 0 ? (
        <div className="surface-base rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Welcome to Your Academic Atelier</h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Your planner is ready for your personalized term courses, weekly commitments, and study rhythm.
              </p>
            </div>
            <Link to="/subjects">
              <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
                Add Your First Course
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/subjects"
              className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-sky-50/40 hover:border-sky-300 transition-all space-y-2 group"
            >
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div className="font-bold text-sm text-slate-900 group-hover:text-sky-900">
                1. Enroll in Courses
              </div>
              <div className="text-xs text-slate-600">
                Add your lecture classes, course credit units, and weekly study targets.
              </div>
            </Link>

            <Link
              to="/availability"
              className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-sky-50/40 hover:border-sky-300 transition-all space-y-2 group"
            >
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div className="font-bold text-sm text-slate-900 group-hover:text-sky-900">
                2. Set Availability Windows
              </div>
              <div className="text-xs text-slate-600">
                Block out class lecture hours, campus commitments, and preferred focus times.
              </div>
            </Link>

            <Link
              to="/tasks"
              className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-sky-50/40 hover:border-sky-300 transition-all space-y-2 group"
            >
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div className="font-bold text-sm text-slate-900 group-hover:text-sky-900">
                3. Track Assignments
              </div>
              <div className="text-xs text-slate-600">
                Log homework, lab reports, and upcoming exams to generate an optimized study schedule.
              </div>
            </Link>
          </div>
        </div>
      ) : (
        <>

      {/* =========================================================================
          2. THE VISUAL ANCHOR: "NEXT FOCUS" COMMANDING ACADEMIC FOCAL POINT
          Immediately answers: "What do I need to do right now?"
         ========================================================================= */}
      {activeSession && activeTask ? (
        <section aria-labelledby="next-focus-heading" className="relative">
          <div className="surface-focal rounded-3xl border-l-4 border-l-sky-400 p-6 sm:p-7 space-y-5">
            {/* Top Meta Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {activeSession.completed ? 'Completed Block' : 'Next Focus Block'}
                </span>
                <span className="font-mono tabular-nums text-xs text-slate-200 font-bold">
                  {activeSession.startTime} – {activeSession.endTime}
                </span>
                <span className="text-slate-600 text-xs">·</span>
                <span className="text-xs text-slate-300 font-mono font-medium">
                  {activeSession.durationMinutes} min block
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-cyan-300 uppercase tracking-wide">
                  {activeSubject?.code}
                </span>
                <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                  · {activeSubject?.name}
                </span>
              </div>
            </div>

            {/* Core Deliverable Information */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <h2 id="next-focus-heading" className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
                  {activeTask.title}
                </h2>

                {activeTask.notes && (
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {activeTask.notes}
                  </p>
                )}

                {/* Subtasks / Deliverable Status Line */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1 font-medium">
                  <span className="text-amber-300 font-semibold">
                    Due {new Date(activeTask.dueDate).toLocaleString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-slate-200">{activeTask.remainingHours.toFixed(1)}h remaining</span>
                  {activeTask.subtasks && activeTask.subtasks.length > 0 && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-cyan-300 font-bold">
                        {activeTask.subtasks.filter((s) => s.completed).length}/{activeTask.subtasks.length} subtasks done
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons: Focus Timer & Mark Session Done */}
              <div className="shrink-0 flex flex-col sm:flex-row items-center gap-2.5 pt-2 lg:pt-0">
                <button
                  type="button"
                  onClick={() => setTimerModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 backdrop-blur-xs shadow-xs"
                >
                  <Play className="w-4 h-4 fill-current text-sky-400" />
                  <span>Start Focus Session</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleSessionComplete(activeSession.id)}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md active:scale-[0.98] ${
                    activeSession.completed
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-slate-950 shadow-sky-500/20'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {activeSession.completed ? 'Session Completed ✓' : 'Mark Session Done'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Empty / All-Completed Today State */
        <section className="p-8 rounded-3xl surface-base text-center space-y-3 border border-slate-200/90 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900">
              {todaySessions.length > 0 ? 'All planned study blocks completed!' : 'No study sessions planned today'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
              {todaySessions.length > 0
                ? `You've logged ${completedHoursStr} hours of focused coursework today. You can review upcoming deadlines or prepare the next study plan.`
                : tasks.length === 0
                ? 'Add an assignment or exam with a deadline, then set your availability to generate a realistic plan.'
                : availability.length === 0
                ? 'Set your weekly availability so StudyFlow knows when you are free to focus.'
                : 'Your setup is ready. Generate a schedule to allocate your remaining coursework.'}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            {tasks.length === 0 ? (
              <Link to="/tasks">
                <Button variant="primary" icon={<Plus className="w-3.5 h-3.5" />}>
                  Add an Assignment or Exam
                </Button>
              </Link>
            ) : availability.length === 0 ? (
              <Link to="/availability">
                <Button variant="primary" icon={<CalendarRange className="w-3.5 h-3.5" />}>
                  Set Weekly Availability
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => generateSchedule({ maxDailyHours: dailyCap })}
                  icon={<CalendarRange className="w-3.5 h-3.5" />}
                >
                  Generate Next Study Blocks
                </Button>
                <Link to="/tasks">
                  <Button variant="primary" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                    View Assignment Backlog
                  </Button>
                </Link>
              </>
            )}
          </div>
        </section>
      )}

      {/* =========================================================================
          3. MAIN ASYMMETRIC CONTENT GRID
          Left (7/12): Authentic Academic Timetable & Session Queue
          Right (5/12): Upcoming Deadlines Radar & Weekly Workload Balance
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* -----------------------------------------------------------------------
            LEFT COLUMN (7/12): TODAY'S ACADEMIC TIMETABLE
            Replaces generic card wrappers with a structured collegiate timeline!
           ----------------------------------------------------------------------- */}
        <section
          aria-labelledby="timetable-heading"
          className="lg:col-span-7 surface-base rounded-3xl p-5 sm:p-6 space-y-5"
        >
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 id="timetable-heading" className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-sky-600" />
                <span>Today's Academic Timetable</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Classes, scheduled breaks, and focused study blocks for {todayName}
              </p>
            </div>

            {/* Filter Segmented Control */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 surface-inset border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setTimelineFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timelineFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All ({todaySessions.length})
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('pending')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timelineFilter === 'pending'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Pending ({todaySessions.filter((s) => !s.completed).length})
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('completed')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timelineFilter === 'completed'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Done ({todaySessions.filter((s) => s.completed).length})
              </button>
            </div>
          </div>

          {/* Timetable Vertical Track Structure */}
          <div className="relative pl-4 sm:pl-6 space-y-4 before:absolute before:left-[11px] sm:before:left-[19px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200/90">
            {/* Class commitments from the user's availability */}
            {todayClasses.map((classSlot) => (
              <div key={classSlot.id} className="relative flex items-start gap-3.5 group">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-white shadow-2xs shrink-0 mt-2 z-10" />
                <div className="flex-1 p-3.5 surface-binder border-blue-200/90 bg-blue-50/40 border-l-4 border-l-blue-600 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">
                      {classSlot.startTime} – {classSlot.endTime}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                      Class commitment
                    </span>
                  </div>
                  <div className="text-xs text-blue-950 font-bold">
                    {classSlot.label || 'Scheduled class'}
                  </div>
                </div>
              </div>
            ))}

            {todayClasses.length === 0 && filteredSessions.length === 0 && (
              <div className="relative flex items-start gap-3.5">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-300 ring-4 ring-white shrink-0 mt-2 z-10" />
                <div className="flex-1 p-4 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 font-medium">
                  Nothing is scheduled for today. Add availability or open the schedule to plan a study block.
                </div>
              </div>
            )}

            {/* Study Sessions from Planner Context */}
            {filteredSessions.map((session, index) => {
              const task = tasks.find((t) => t.id === session.taskId);
              const subject = subjects.find((s) => s.id === session.subjectId);
              const category = subject?.colorKey || 'cs';
              const style = SUBJECT_CATEGORY_STYLES[category] || SUBJECT_CATEGORY_STYLES.cs;

              return (
                <React.Fragment key={session.id}>
                  {/* Rest Break Marker between heavy study blocks */}
                  {index === 1 && (
                    <div className="relative flex items-center gap-3.5 my-2">
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-400 ring-4 ring-white shadow-2xs shrink-0 z-10" />
                      <div className="flex-1 px-3.5 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-950 flex items-center gap-2.5 font-medium shadow-2xs">
                        <Coffee className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Recommended 15m fatigue break · Hydrate & rest eyes before afternoon focus</span>
                      </div>
                    </div>
                  )}

                  {/* Study Session Item */}
                  <div className="relative flex items-start gap-3.5 group">
                    <button
                      type="button"
                      onClick={() => toggleSessionComplete(session.id)}
                      className={`w-3.5 h-3.5 rounded-full ring-4 ring-white shrink-0 mt-3.5 z-10 transition-colors cursor-pointer shadow-2xs ${
                        session.completed
                          ? 'bg-emerald-600 ring-emerald-100'
                          : 'bg-sky-500 hover:bg-sky-600 ring-sky-100'
                      }`}
                      aria-label={session.completed ? 'Mark session incomplete' : 'Mark session complete'}
                    />

                    <div
                      className={`flex-1 p-3.5 sm:p-4 rounded-2xl surface-binder border transition-all ${
                        session.completed
                          ? 'bg-slate-50/60 border-slate-200 opacity-70 border-l-4 border-l-slate-300'
                          : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-xs border-l-4'
                      }`}
                      style={{
                        borderLeftColor: session.completed ? '#cbd5e1' : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono tabular-nums font-bold text-slate-900">
                              {session.startTime} – {session.endTime}
                            </span>
                            <span className="text-slate-300" aria-hidden="true">·</span>
                            <span className="text-slate-500 font-mono text-[11px] font-semibold">
                              {session.durationMinutes}m block
                            </span>
                          </div>

                          <div
                            className={`text-xs sm:text-sm font-bold truncate ${
                              session.completed ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {task?.title || 'Focused study block'}
                          </div>
                        </div>

                        {/* Subject Badge & Checkbox Toggle */}
                        <div className="shrink-0 flex items-center gap-2.5">
                          <Badge variant="subject" category={category}>
                            {subject?.code}
                          </Badge>

                          <button
                            type="button"
                            onClick={() => toggleSessionComplete(session.id)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                              session.completed
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                : 'border-slate-300 hover:border-sky-500 bg-white surface-inset'
                            }`}
                            aria-label={`Toggle session ${session.id}`}
                          >
                            {session.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Timetable Footer with Schedule Link */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <span className="font-medium">
              Deterministic Knapsack Scheduling · Spaced Study Blocks
            </span>
            <Link
              to="/schedule"
              className="font-bold text-sky-700 hover:text-sky-850 hover:underline flex items-center gap-1"
            >
              <span>View Full Weekly Timetable</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* -----------------------------------------------------------------------
            RIGHT COLUMN (5/12): ACADEMIC RADAR & WORKLOAD BALANCE
           ----------------------------------------------------------------------- */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. UPCOMING DEADLINES RADAR */}
          <section
            aria-labelledby="deadlines-heading"
            className="surface-base rounded-3xl p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 id="deadlines-heading" className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Upcoming Deliverables</span>
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">Sorted by nearest deadline</p>
              </div>

              <Link
                to="/tasks"
                className="text-xs font-bold text-sky-700 hover:text-sky-850 hover:underline"
              >
                View all ({tasks.length})
              </Link>
            </div>

            {/* Concise rows with semantic urgency tags */}
            <div className="divide-y divide-slate-100">
              {upcomingTasks.slice(0, 4).map((task) => {
                const priorityHover =
                  task.priority === 'urgent'
                    ? 'hover:bg-rose-50/35 hover:border-l-rose-500'
                    : task.priority === 'high'
                    ? 'hover:bg-rose-50/25 hover:border-l-rose-400'
                    : task.priority === 'medium'
                    ? 'hover:bg-amber-50/25 hover:border-l-amber-400'
                    : 'hover:bg-emerald-50/20 hover:border-l-emerald-400';

                return (
                  <div
                    key={task.id}
                    className={`py-2.5 px-2.5 rounded-xl transition-all duration-150 flex items-center justify-between gap-3 text-xs border-l-3 border-l-transparent ${priorityHover}`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-extrabold text-slate-900">{task.subject?.code}</span>
                        <PriorityBadge priority={task.priority} size="xs" showCode />
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${task.urgencyColor}`}>
                          {task.urgencyLabel}
                        </span>
                      </div>
                      <div className="text-slate-900 font-bold truncate text-[13px]">
                        {task.title}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-slate-900 surface-inset px-2.5 py-1 rounded-md text-[11px] shadow-2xs">
                        {task.remainingHours.toFixed(1)}h left
                      </span>
                    </div>
                  </div>
                );
              })}
              {upcomingTasks.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">
                  No upcoming deadlines. Add an assignment or exam when you are ready.
                </div>
              )}
            </div>
          </section>

          {/* 2. SCHEDULE PREVIEW (What happens next?) */}
          <section
            aria-labelledby="preview-heading"
            className="surface-base rounded-3xl p-5 space-y-3.5 shadow-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 id="preview-heading" className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>Next 3 Days Rhythm</span>
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">Anti-cram workload pacing preview</p>
              </div>
              <Link
                to="/schedule"
                className="text-xs font-bold text-sky-700 hover:text-sky-850 hover:underline"
              >
                Schedule →
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              {nextThreeDays.map((day, index) => {
                const planLabels = [
                  ...day.daySessions.map((session) => {
                    const task = tasks.find((item) => item.id === session.taskId);
                    const subject = subjects.find((item) => item.id === session.subjectId);
                    return task?.title || `${subject?.code || 'Study'} session`;
                  }),
                  ...day.dueTasks.map((task) => `${task.title} due`),
                ];
                const itemCount = day.daySessions.length + day.dueTasks.length;

                return (
                  <div
                    key={day.dateKey}
                    className="p-3 rounded-xl surface-inset border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{day.label}{index === 0 ? ' (Tomorrow)' : ''}</span>
                        {itemCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {planLabels.length > 0 ? planLabels.join(' · ') : 'No study blocks or deadlines planned'}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-700 text-xs shrink-0">
                      {day.plannedHours.toFixed(1)}h planned
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. WEEKLY COURSE TARGET BALANCE */}
          <section
            aria-labelledby="targets-heading"
            className="surface-base rounded-3xl p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 id="targets-heading" className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-600" />
                  <span>Course Study Targets</span>
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">Weekly allocated study distribution</p>
              </div>
              <Link
                to="/subjects"
                className="text-xs font-bold text-sky-700 hover:text-sky-850 hover:underline"
              >
                Courses ({subjects.length})
              </Link>
            </div>

            <div className="space-y-3.5">
              {subjects.map((sub) => {
                const style = SUBJECT_CATEGORY_STYLES[sub.colorKey] || SUBJECT_CATEGORY_STYLES.cs;
                return (
                  <div key={sub.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                        <span className="font-extrabold text-slate-900">{sub.code}</span>
                        <span className="text-slate-500 text-[11px] truncate max-w-[140px] font-medium">
                          {sub.name}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-slate-700 text-[11px] font-bold">
                        {sub.weeklyTargetHours}h / week
                      </span>
                    </div>
                    {/* Course progress inset track */}
                    <div className="w-full surface-inset h-2 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full ${style.accentBar} shadow-2xs`}
                        style={{ width: `${Math.min(100, (sub.weeklyTargetHours / 10) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. CAMPUS ADVISORY NOTICE */}
          {announcements.length > 0 && (
            <aside
              aria-label="Campus announcement"
              className="p-4 rounded-3xl surface-binder border-sky-300/80 bg-gradient-to-r from-sky-50 to-cyan-50/50 flex items-start gap-3.5 text-xs shadow-2xs border-l-4 border-l-sky-600"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="font-extrabold text-sky-950 truncate">
                  {announcements[0].title}
                </div>
                <p className="text-sky-850 leading-relaxed line-clamp-2 text-[11px] font-medium">
                  {announcements[0].content}
                </p>
              </div>
            </aside>
          )}
        </div>
      </div>
        </>
      )}

      {/* =========================================================================
          4. FOCUS TIMER MODAL (Distraction-Free Collegiate Focus Session)
         ========================================================================= */}
      <FocusTimerModal
        isOpen={timerModalOpen}
        onClose={() => setTimerModalOpen(false)}
        session={activeSession}
        task={activeTask}
        subject={activeSubject}
        onCompleteSession={(sessionId, actualMinutesLogged) => {
          toggleSessionComplete(sessionId, actualMinutesLogged);
        }}
      />
    </div>
  );
}
