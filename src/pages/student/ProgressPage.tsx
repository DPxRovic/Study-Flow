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
import { useAuth } from '../../context/AuthContext';
import { CoreMetricsGrid } from '../../components/progress/CoreMetricsGrid';
import { WorkloadBalanceBar } from '../../components/progress/WorkloadBalanceBar';
import { SubjectAttentionMatrix } from '../../components/progress/SubjectAttentionMatrix';
import { WeeklyPacingChart } from '../../components/progress/WeeklyPacingChart';
import { DeadlineWorkloadHorizon } from '../../components/progress/DeadlineWorkloadHorizon';
import { StudyReflectionSection } from '../../components/progress/StudyReflectionSection';
import { formatCurrentWeekLabel, getLocalWeekDays } from '../../utils/date';

export function ProgressPage() {
  const {
    subjects,
    tasks,
    sessions,
    journalEntries,
    addJournalEntry,
    refreshData,
  } = usePlanner();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [simulatedError, setSimulatedError] = useState<string | null>(null);

  // Trigger manual recalculate/refresh from database
  const handleRefreshAnalytics = async () => {
    setIsLoading(true);
    setSimulatedError(null);
    try {
      await refreshData();
      showToast('Pacing analytics synchronized with schedule', 'info');
    } catch {
      setSimulatedError('Failed to refresh live analytics from server');
    } finally {
      setIsLoading(false);
    }
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
  const unscheduledHours = Math.max(0, totalRemainingHours - scheduledHours);

  // Weekly targets
  const weeklyTargetHours = subjects.reduce((acc, s) => acc + s.weeklyTargetHours, 0);
  const currentWeekDateKeys = new Set(getLocalWeekDays().map((day) => day.date));
  const weeklyLoggedHours = sessions
    .filter((session) => session.completed && currentWeekDateKeys.has(session.date))
    .reduce((acc, session) => acc + (session.actualMinutesLogged ?? session.durationMinutes) / 60, 0);
  const dailyCapHours = user?.targetDailyStudyCapHours || 5.5;
  const currentWeekWorkByDay = getLocalWeekDays().map((day) => ({
    date: day.date,
    hours: sessions
      .filter((session) => session.date === day.date && session.status !== 'cancelled')
      .reduce((acc, session) => acc + session.durationMinutes / 60, 0),
  }));
  const activeStudyDays = currentWeekWorkByDay.filter((day) => day.hours > 0);
  const capExceededDaysCount = activeStudyDays.filter((day) => day.hours > dailyCapHours).length;
  const capAdherencePercentage = activeStudyDays.length > 0
    ? Math.round(((activeStudyDays.length - capExceededDaysCount) / activeStudyDays.length) * 100)
    : 0;

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
      term: user?.term || 'Current term',
      horizon: 'current-week',
      week: formatCurrentWeekLabel(),
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
    a.download = `StudyFlow_Pacing_Report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Pacing summary exported to JSON', 'success');
  };

  // Error State View
  if (simulatedError) {
    return (
      <div className="max-w-[1440px] w-full space-y-6 pb-12 font-sans">
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
      <div className="max-w-[1440px] w-full space-y-6 pb-12 font-sans">
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
        <StudyReflectionSection
          journalEntries={journalEntries}
          onAddEntry={addJournalEntry}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1440px] w-full pb-12 font-sans">
      {/* Editorial Header */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-2">
            <span>Longitudinal Analytics</span>
            <span aria-hidden="true">·</span>
            <span>{user?.term || 'Current Term'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-bold text-sky-850">Week of {formatCurrentWeekLabel()}</span>
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
          <div className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 border border-slate-200/70">
            Current-week analytics
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
            dailyCapHours={dailyCapHours}
            capAdherencePercentage={capAdherencePercentage}
            capExceededDaysCount={capExceededDaysCount}
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
            dailyCapHours={dailyCapHours}
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
