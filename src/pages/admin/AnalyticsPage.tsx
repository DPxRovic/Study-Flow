/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, BookOpen, CheckCircle2, Clock, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { adminService, AdminMetricsResponse } from '../../services/adminService';

type Metrics = AdminMetricsResponse['metrics'];

export function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getMetrics();
      if (!response?.success || !response.metrics) throw new Error('Metrics response was incomplete');
      setMetrics(response.metrics);
    } catch (loadError) {
      console.warn('Could not load administrative analytics:', loadError);
      setMetrics(null);
      setError('Live analytics are unavailable. Check the API and database connection, then retry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div className="space-y-6 max-w-[1440px] w-full pb-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1">
            Live institutional metrics
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Cohort Workload Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Current totals calculated from persisted users, coursework, study sessions, and governance records.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={isLoading}
          onClick={loadMetrics}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Registered users',
            value: metrics ? metrics.userBreakdown.totalUsers.toLocaleString() : '—',
            detail: metrics ? `${metrics.userBreakdown.students} students · ${metrics.userBreakdown.administrators} admins` : 'Unavailable',
            icon: Users,
          },
          {
            label: 'Course enrollments',
            value: metrics ? metrics.academicWorkload.totalEnrollments.toLocaleString() : '—',
            detail: metrics ? `${metrics.academicWorkload.totalTasksAllocated} tasks tracked` : 'Unavailable',
            icon: BookOpen,
          },
          {
            label: 'Logged study hours',
            value: metrics ? `${metrics.studyExecution.totalLoggedHours.toLocaleString()}h` : '—',
            detail: metrics ? `${metrics.studyExecution.completedSessions} completed sessions` : 'Unavailable',
            icon: Clock,
          },
          {
            label: 'Audit records',
            value: metrics ? metrics.securityAndGovernance.totalAuditLogs.toLocaleString() : '—',
            detail: metrics ? `${metrics.securityAndGovernance.activeAnnouncements} announcements` : 'Unavailable',
            icon: ShieldCheck,
          },
        ].map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="surface-base p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
              <span>{label}</span>
              <Icon className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">{value}</div>
            <div className="text-[11px] text-slate-500">{detail}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="surface-base p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Task completion
          </h2>
          <div className="text-3xl font-extrabold font-mono text-slate-900">
            {metrics ? `${metrics.academicWorkload.taskCompletionRate}%` : '—'}
          </div>
          <p className="text-xs text-slate-500">
            {metrics
              ? `${metrics.academicWorkload.completedTasks} of ${metrics.academicWorkload.totalTasksAllocated} persisted tasks are complete.`
              : 'No live task-completion data is available.'}
          </p>
        </div>

        <div className="surface-base p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" /> Session execution
          </h2>
          <div className="text-3xl font-extrabold font-mono text-slate-900">
            {metrics ? `${metrics.studyExecution.sessionExecutionRate}%` : '—'}
          </div>
          <p className="text-xs text-slate-500">
            {metrics
              ? `${metrics.studyExecution.completedSessions} of ${metrics.studyExecution.totalSessionsScheduled} persisted sessions are complete.`
              : 'No live session-execution data is available.'}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500 border border-slate-200 rounded-xl bg-slate-50 p-3">
        Term histograms and course-level strain comparisons are hidden until the backend exposes date-bucketed, cohort-filtered aggregates.
      </p>
    </div>
  );
}
