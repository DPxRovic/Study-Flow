/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CalendarRange,
  RotateCw,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Zap,
  Layers,
  Sliders,
  Plus,
  Calendar as CalendarIcon,
  Filter,
  Info,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { usePlanner } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ScheduledSession, Task } from '../../types';
import { WeeklyTimeGrid } from '../../components/schedule/WeeklyTimeGrid';
import { DailyTimeline } from '../../components/schedule/DailyTimeline';
import { ScheduleConflictsBanner } from '../../components/schedule/ScheduleConflictsBanner';
import { UnscheduledTasksDrawer } from '../../components/schedule/UnscheduledTasksDrawer';
import { SessionDetailModal } from '../../components/schedule/SessionDetailModal';
import { SessionEditModal } from '../../components/schedule/SessionEditModal';

export function SchedulePage() {
  const { user } = useAuth();
  const {
    sessions,
    tasks,
    subjects,
    conflicts,
    generateSchedule,
    resetDemoData,
  } = usePlanner();
  const { showToast } = useToast();

  // View Mode: 'week' | 'day'
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDayDate, setSelectedDayDate] = useState('2026-10-06'); // Anchor Tuesday

  // Optimization Heuristic Mode
  const [mode, setMode] = useState<'balanced' | 'front_loaded' | 'pomodoro'>('balanced');
  const [isGenerating, setIsGenerating] = useState(false);

  // Modals & Panels state
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<ScheduledSession | null>(null);
  const [sessionToEdit, setSessionToEdit] = useState<ScheduledSession | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUnscheduledDrawerOpen, setIsUnscheduledDrawerOpen] = useState(false);
  const [initialEditDate, setInitialEditDate] = useState<string | undefined>(undefined);
  const [initialEditTime, setInitialEditTime] = useState<string | undefined>(undefined);
  const [initialEditTask, setInitialEditTask] = useState<Task | undefined>(undefined);

  // Auto-generate handler
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const result = generateSchedule({
        mode,
        maxDailyHours: user?.targetDailyStudyCapHours || 5.5,
      });
      setIsGenerating(false);
      showToast(
        `Regenerated study plan (${result.generatedCount} sessions allocated, locked sessions preserved).`,
        'success'
      );
    }, 450);
  };

  // Open modal to add new session
  const handleOpenAddSession = (date?: string, startTime?: string, task?: Task) => {
    setSessionToEdit(null);
    setInitialEditDate(date || selectedDayDate);
    setInitialEditTime(startTime || '14:00');
    setInitialEditTask(task);
    setIsEditModalOpen(true);
  };

  // Open modal to edit existing session
  const handleOpenEditSession = (session: ScheduledSession) => {
    setSelectedSessionForDetail(null);
    setSessionToEdit(session);
    setInitialEditDate(session.date);
    setInitialEditTime(session.startTime);
    setInitialEditTask(undefined);
    setIsEditModalOpen(true);
  };

  // Select session to open detail modal
  const handleSelectSession = (session: ScheduledSession) => {
    setSelectedSessionForDetail(session);
  };

  // Count locked sessions
  const lockedCount = sessions.filter((s) => s.locked).length;

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* =========================================================================
          1. HEADER & PRIMARY ACTIONS
         ========================================================================= */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Academic Work Schedule · Fall Term Week 7</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Study Schedule & Time Allocation
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium leading-relaxed">
            Time-structured planner mapping course deliverable workloads against your weekly availability
            windows.
          </p>
        </div>

        {/* Action button cluster */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => setIsUnscheduledDrawerOpen(true)}
            icon={<Layers className="w-4 h-4 text-slate-500" />}
          >
            Unscheduled Tasks
          </Button>

          <Button
            variant="secondary"
            onClick={() => handleOpenAddSession()}
            icon={<Plus className="w-4 h-4 text-slate-500" />}
          >
            New Session Block
          </Button>

          <Button
            variant="primary"
            onClick={handleGenerate}
            loading={isGenerating}
            icon={<RotateCw className="w-4 h-4" />}
          >
            Regenerate Schedule
          </Button>
        </div>
      </div>

      {/* =========================================================================
          2. CONFLICT DIAGNOSTICS BANNER
         ========================================================================= */}
      <ScheduleConflictsBanner
        conflicts={conflicts}
        onResolveConflict={handleGenerate}
        onSelectSession={handleSelectSession}
      />

      {/* =========================================================================
          3. GENERATION ENGINE & HEURISTIC CONTROLS (TRANSPARENT ALGORITHM)
         ========================================================================= */}
      <div className="surface-base rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Scheduling Engine Optimization
              </span>
              <span className="text-xs text-slate-500">
                Configure how the engine distributes pending task hours across open availability slots
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lockedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                <Lock className="w-3 h-3" />
                <span>{lockedCount} session{lockedCount > 1 ? 's' : ''} locked</span>
              </span>
            )}
            <span className="text-xs font-mono font-medium text-slate-500">
              Daily cap: {user?.targetDailyStudyCapHours || 5.5}h
            </span>
          </div>
        </div>

        {/* 3 Heuristic Modes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setMode('balanced')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              mode === 'balanced'
                ? 'surface-base border-2 border-sky-500 shadow-xs bg-gradient-to-br from-sky-50/90 to-white ring-2 ring-sky-500/20'
                : 'surface-base border-slate-200/90 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold text-slate-900">Balanced Pacing</span>
              {mode === 'balanced' && (
                <span className="w-2 h-2 rounded-full bg-sky-600" />
              )}
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Spreads hours evenly across open days prior to deadlines to prevent fatigue and cramming.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode('front_loaded')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              mode === 'front_loaded'
                ? 'surface-base border-2 border-sky-500 shadow-xs bg-gradient-to-br from-sky-50/90 to-white ring-2 ring-sky-500/20'
                : 'surface-base border-slate-200/90 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold text-slate-900">Front-Loaded</span>
              {mode === 'front_loaded' && (
                <span className="w-2 h-2 rounded-full bg-sky-600" />
              )}
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Allocates heavier sessions earlier in the week to ensure buffer space for revisions.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode('pomodoro')}
            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
              mode === 'pomodoro'
                ? 'surface-base border-2 border-sky-500 shadow-xs bg-gradient-to-br from-sky-50/90 to-white ring-2 ring-sky-500/20'
                : 'surface-base border-slate-200/90 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold text-slate-900">Pomodoro Sprints</span>
              {mode === 'pomodoro' && (
                <span className="w-2 h-2 rounded-full bg-sky-600" />
              )}
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Splits assignments into focused 45-minute sprint intervals with enforced rest gaps.
            </p>
          </button>
        </div>

        {/* Temporary simulation notice */}
        <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            <strong>Deterministic Prototype:</strong> Generation currently applies rule-based heuristic allocation.
            Locked blocks (marked with <Lock className="w-2.5 h-2.5 inline text-amber-700" />) will never be overwritten.
          </span>
        </div>
      </div>

      {/* =========================================================================
          4. SCHEDULE VIEW SELECTOR (WEEKLY TIME-GRID VS DAILY TIMELINE)
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl w-fit">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'week'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Weekly Time Grid</span>
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'day'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Daily Timeline</span>
          </button>
        </div>

        {/* Day selector if in Day View mode */}
        {viewMode === 'day' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { date: '2026-10-05', label: 'Mon Oct 5' },
              { date: '2026-10-06', label: 'Tue Oct 6 (Today)' },
              { date: '2026-10-07', label: 'Wed Oct 7' },
              { date: '2026-10-08', label: 'Thu Oct 8' },
              { date: '2026-10-09', label: 'Fri Oct 9' },
              { date: '2026-10-10', label: 'Sat Oct 10' },
              { date: '2026-10-11', label: 'Sun Oct 11' },
            ].map((d) => (
              <button
                key={d.date}
                onClick={() => setSelectedDayDate(d.date)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedDayDate === d.date
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================================
          5. SCHEDULE CONTENT
         ========================================================================= */}
      {viewMode === 'week' ? (
        <WeeklyTimeGrid
          onSelectSession={handleSelectSession}
          onAddSessionAtTime={(date, startTime) => handleOpenAddSession(date, startTime)}
        />
      ) : (
        <DailyTimeline
          currentDate={selectedDayDate}
          onSelectSession={handleSelectSession}
          onEditSession={handleOpenEditSession}
          onAddSession={() => handleOpenAddSession(selectedDayDate)}
        />
      )}

      {/* =========================================================================
          6. MODALS & DRAWERS
         ========================================================================= */}
      {/* Session Details Modal */}
      <SessionDetailModal
        session={selectedSessionForDetail}
        isOpen={!!selectedSessionForDetail}
        onClose={() => setSelectedSessionForDetail(null)}
        onEdit={handleOpenEditSession}
      />

      {/* Session Add/Edit Modal */}
      <SessionEditModal
        session={sessionToEdit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSessionToEdit(null);
        }}
        initialDate={initialEditDate}
        initialStartTime={initialEditTime}
        initialTask={initialEditTask}
      />

      {/* Unscheduled Tasks Drawer */}
      <UnscheduledTasksDrawer
        isOpen={isUnscheduledDrawerOpen}
        onClose={() => setIsUnscheduledDrawerOpen(false)}
        onScheduleTask={(task) => {
          setIsUnscheduledDrawerOpen(false);
          handleOpenAddSession(undefined, undefined, task);
        }}
      />
    </div>
  );
}
