/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  RotateCw,
  AlertTriangle,
  BookOpen,
  Plus,
  Download,
  Calendar,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { usePlanner } from '../../context/PlannerContext';
import { useToast } from '../../context/ToastContext';
import { CoreMetricsGrid } from '../../components/progress/CoreMetricsGrid';
import { WorkloadBalanceBar } from '../../components/progress/WorkloadBalanceBar';
import { SubjectAttentionMatrix } from '../../components/progress/SubjectAttentionMatrix';
import { WeeklyPacingChart } from '../../components/progress/WeeklyPacingChart';
import { DeadlineWorkloadHorizon } from '../../components/progress/DeadlineWorkloadHorizon';
import { StudyReflectionSection } from '../../components/progress/StudyReflectionSection';

export function ProgressPage() {
  const {
    subjects,
    tasks,
    sessions,
    journalEntries,
    addJournalEntry,
  } = usePlanner();
  const { showToast } = useToast();

  const [timeHorizon, setTimeHorizon] = useState<'week' | 'fortnight' | 'term'>('week');
  const [isLoading, setIsLoading] = useState(false);
  const [simulatedError, setSimulatedError] = useState<string | null>(null);

  // Trigger manual recalculate/refresh simulation
  const handleRefreshAnalytics = () => {
    setIsLoading(true);
    setSimulatedError(null);
    setTimeout(() => {
      setIsLoading(false);
      showToast('Pacing analytics synchronized with schedule', 'info');
    }, 450);
  };

  // Calculations for academic questions
  const totalTasksCount = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const completedTasksCount = completedTasks.length;

  const totalEstimatedHours = tasks.reduce((acc, t) => acc + t.estimatedHours, 0);
  const totalRemainingHours = tasks
    .filter((t) => t.status !== 'completed')
    .reduce((acc, t) => acc + t.remainingHours, 0);
  const totalCompletedHours = Math.max(0, totalEstimatedHours - totalRemainingHours);

  // Scheduled sessions hours
  const scheduledHours = sessions
    .filter((s) => !s.completed && s.status !== 'cancelled')
    .reduce((acc, s) => acc + s.durationMinutes / 60, 0);
  const completedSessionHours = sessions
    .filter((s) => s.completed)
    .reduce((acc, s) => acc + s.durationMinutes / 60, 0);

  const unscheduledHours = Math.max(0, totalRemainingHours - scheduledHours);

  // Weekly targets
  const weeklyTargetHours = subjects.reduce((acc, s) => acc + s.weeklyTargetHours, 0);
  const weeklyLoggedHours = completedSessionHours + 5.5; // includes previous week days in demo dataset (17.5h)

  // Imminent deadlines (<= 72 hours)
  const imminentDeadlines = tasks.filter((t) => {
    if (t.status === 'completed') return false;
    const diffHours = (new Date(t.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours <= 72 && diffHours > -24;
  });

  // Subjects needing attention
  const attentionSubjects = subjects.filter((s) => {
    const sTasks = tasks.filter((t) => t.subjectId === s.id && t.status !== 'completed');
    const hasUrgent = sTasks.some((t) => {
      const diffHours = (new Date(t.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
      return diffHours <= 48 && t.remainingHours > 0;
    });
    return hasUrgent;
  });

  // Export analytics summary
  const handleExportSummary = () => {
    const summaryData = {
      term: 'Fall 2026',
      week: 7,
      totalCourses: subjects.length,
      completionRate: `${Math.round((completedTasksCount / Math.max(1, totalTasksCount)) * 100)}%`,
      completedHours: totalCompletedHours,
      remainingHours: totalRemainingHours,
      weeklyPacingLogged: weeklyLoggedHours,
      weeklyTarget: weeklyTargetHours,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(summaryData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudyFlow_Pacing_Report_Week7.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Pacing summary exported to JSON', 'success');
  };

  // Error State View
  if (simulatedError) {
    return (
      <div className="max-w-5xl space-y-6 pb-12">
        <div className="surface-base rounded-2xl p-8 border border-rose-200 text-center space-y-4 shadow-2xs">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Analytics Synchronization Issue</h2>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              {simulatedError}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleRefreshAnalytics}
            icon={<RotateCw className="w-4 h-4" />}
          >
            Retry Analytics Calculation
          </Button>
        </div>
      </div>
    );
  }

  // Empty State View (if no courses enrolled)
  if (subjects.length === 0 && tasks.length === 0) {
    return (
      <div className="max-w-5xl space-y-6 pb-12">
        <div className="border-b border-slate-200/80 pb-5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Study Pacing & Progress
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Grounded academic pacing and workload distribution.
          </p>
        </div>

        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-sky-600" />}
          title="No Coursework or Enrolled Subjects Yet"
          description="Enroll in your term courses and log active problem sets or exams to unlock longitudinal study pacing and burnout prevention analytics."
          actionLabel="Enroll in Subjects"
          onAction={() => {
            window.location.href = '/subjects';
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl pb-12">
      {/* Editorial Header */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-2">
            <span>Longitudinal Analytics</span>
            <span aria-hidden="true">·</span>
            <span>Fall 2026</span>
            <span aria-hidden="true">·</span>
            <span className="font-bold text-sky-850">Week 7</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Study Pacing & Workload Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium leading-relaxed">
            Honest, analytical reflection on study hours, course balance, and fatigue limit adherence without decorative gamification.
          </p>
        </div>

        {/* Filter Controls & Secondary Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Segmented Time Horizon Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/70">
            <button
              onClick={() => setTimeHorizon('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                timeHorizon === 'week'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week 7
            </button>
            <button
              onClick={() => setTimeHorizon('fortnight')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                timeHorizon === 'fortnight'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 14 Days
            </button>
            <button
              onClick={() => setTimeHorizon('term')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                timeHorizon === 'term'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Term Horizon
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefreshAnalytics}
            disabled={isLoading}
            icon={<RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            title="Recalculate pacing analytics"
          >
            Sync
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportSummary}
            icon={<Download className="w-3.5 h-3.5" />}
            title="Download report summary"
          >
            Export
          </Button>
        </div>
      </div>

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : (
        /* Populated Analytical Views */
        <div className="space-y-8">
          {/* Section 1: Core Academic Metrics Answering What's Completed vs Remaining */}
          <CoreMetricsGrid
            totalEstimatedHours={totalEstimatedHours}
            totalCompletedHours={totalCompletedHours}
            totalRemainingHours={totalRemainingHours}
            completedTasksCount={completedTasksCount}
            totalTasksCount={totalTasksCount}
            weeklyTargetHours={weeklyTargetHours}
            weeklyLoggedHours={weeklyLoggedHours}
            dailyCapHours={5.5}
            imminentDeadlinesCount={imminentDeadlines.length}
            attentionSubjectsCount={attentionSubjects.length}
          />

          {/* Section 2: Workload Balance Visualization (Completed vs Scheduled vs Backlog) */}
          <WorkloadBalanceBar
            totalEstimatedHours={totalEstimatedHours}
            completedHours={totalCompletedHours}
            scheduledHours={scheduledHours}
            unscheduledHours={unscheduledHours}
          />

          {/* Section 3: "Which subjects need attention?" Deep Academic Breakdown */}
          <SubjectAttentionMatrix
            subjects={subjects}
            tasks={tasks}
            sessions={sessions}
          />

          {/* Section 4: Daily Completion & Fatigue Cap Adherence Chart (Mon-Sun) */}
          <WeeklyPacingChart
            sessions={sessions}
            dailyCapHours={5.5}
          />

          {/* Section 5: "What deadlines are approaching?" Chronological Horizon */}
          <DeadlineWorkloadHorizon
            tasks={tasks}
            subjects={subjects}
          />

          {/* Section 6: Qualitative Reflection Journal */}
          <StudyReflectionSection
            journalEntries={journalEntries}
            onAddEntry={addJournalEntry}
          />
        </div>
      )}
    </div>
  );
}
