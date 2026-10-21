/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  AlertTriangle,
  Megaphone,
  BookOpen,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Activity,
  Layers,
  BarChart2,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { usePlanner } from '../../context/PlannerContext';
import { INITIAL_CATALOG_COURSES, INITIAL_DIRECTORY_USERS } from '../../data/mockData';
import { adminService, AdminMetricsResponse } from '../../services/adminService';
import { AuditLogRecord } from '../../types';

export function AdminDashboardPage() {
  const { announcements } = usePlanner();

  const [metrics, setMetrics] = useState<AdminMetricsResponse['metrics'] | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditLogRecord[]>([]);
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [metricRes, auditRes, healthRes] = await Promise.all([
          adminService.getMetrics().catch(() => null),
          adminService.getAuditLogs({ limit: 4, order: 'desc' }).catch(() => null),
          adminService.getHealth().catch(() => null),
        ]);

        if (metricRes && metricRes.success) {
          setMetrics(metricRes.metrics);
        }
        if (auditRes && auditRes.success) {
          setRecentAudits(auditRes.data || []);
        }
        if (healthRes?.database?.latencyMs) {
          setDbLatency(healthRes.database.latencyMs);
        }
      } catch (err) {
        console.warn('Dashboard metrics fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const totalCatalogCourses = INITIAL_CATALOG_COURSES.length;
  const activeStudents = metrics?.userBreakdown?.students ?? INITIAL_DIRECTORY_USERS.filter((u) => u.role === 'student' && u.status === 'Active').length;
  const facultyAdvisors = metrics?.userBreakdown?.advisorsAndTAs ?? INITIAL_DIRECTORY_USERS.filter((u) => u.role === 'advisor' || u.role === 'ta').length;
  const totalAuditRecords = metrics?.securityAndGovernance?.totalAuditLogs ?? recentAudits.length;
  const publishedAnnouncements = announcements.filter((a) => a.status !== 'draft');

  return (
    <div className="space-y-6 max-w-6xl pb-12 font-sans">
      {/* 1. Header & Quick Broadcast Action */}
      <div className="border-b border-slate-200/90 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
              Dean Console · Fall 2026
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Week 7 Pacing</span>
            {dbLatency !== null && (
              <span className="text-[10px] text-emerald-800 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                PostgreSQL {dbLatency}ms
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Campus Academic Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium leading-relaxed">
            Institutional overview of cohort study health, master curriculum balance, active user allocations, tamper-evident audit logs, and official campus broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/admin/audit">
            <Button variant="secondary" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}>
              Audit Logs ({totalAuditRecords})
            </Button>
          </Link>
          <Link to="/admin/subjects">
            <Button variant="secondary" size="sm" icon={<BookOpen className="w-3.5 h-3.5" />}>
              Master Catalog
            </Button>
          </Link>
          <Link to="/admin/announcements">
            <Button variant="primary" size="sm" icon={<Megaphone className="w-3.5 h-3.5" />}>
              Broadcast Announcement
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Key Academic & System Health Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Enrolled Cohort */}
        <div className="p-4 sm:p-5 surface-base rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Active Student Cohort</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {activeStudents.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-emerald-200/80">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>94.2% active planner completion</span>
          </div>
        </div>

        {/* Metric 2: Weekly Hours Logged */}
        <div className="p-4 sm:p-5 surface-base rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Logged Study Hours</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {metrics?.studyExecution?.totalLoggedHours ? `${metrics.studyExecution.totalLoggedHours}h` : '21,490h'}
          </div>
          <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
            <span className="font-mono font-bold text-slate-800">17.2h</span>
            <span>/ student weekly average</span>
          </div>
        </div>

        {/* Metric 3: Security & Governance Audits */}
        <div className="p-4 sm:p-5 surface-base rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Security & Audit Records</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {totalAuditRecords} Records
          </div>
          <div className="text-[11px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md inline-block border border-amber-200/80">
            Strict Append-Only Trail
          </div>
        </div>

        {/* Metric 4: Systemic Cohort Crunch Alert */}
        <div className="p-4 sm:p-5 surface-base rounded-2xl border border-amber-200/90 bg-amber-50/40 shadow-2xs space-y-1.5">
          <div className="text-xs text-amber-900 font-bold flex items-center justify-between">
            <span>Cohort Crunch Alert</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-950">
            Week 8 Midterms
          </div>
          <div className="text-[11px] text-amber-800 font-bold bg-amber-100/70 px-2 py-0.5 rounded-md inline-block border border-amber-200">
            CS 201 + MATH 241 overlap
          </div>
        </div>
      </div>

      {/* 3. Midterm Crunch Advisory Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-800 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-extrabold text-amber-950">
              Departmental Notice: Imminent Week 8 Midterm Workload Spike
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed font-medium max-w-3xl">
              Average scheduled weekly workload surges from 17.2h to 26.4h/student during Week 8 due to overlapping exam deliverables. Library administration has already extended reading rooms to 24-hour operation.
            </p>
          </div>
        </div>

        <Link to="/admin/analytics" className="shrink-0">
          <Button variant="secondary" size="sm" icon={<BarChart2 className="w-3.5 h-3.5" />}>
            Inspect Strain Histogram
          </Button>
        </Link>
      </div>

      {/* 4. Split Section: Live Announcements & Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Announcements Feed */}
        <div className="lg:col-span-2 surface-base rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-extrabold text-slate-900">
                Active Campus Announcements
              </h2>
              <span className="text-xs font-mono font-bold text-slate-400">
                ({publishedAnnouncements.length})
              </span>
            </div>
            <Link
              to="/admin/announcements"
              className="text-xs font-bold text-sky-700 hover:text-sky-850 hover:underline flex items-center gap-1"
            >
              <span>Manage & Compose</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {publishedAnnouncements.slice(0, 3).map((ann) => (
              <div key={ann.id} className="py-3.5 first:pt-1 last:pb-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{ann.title}</span>
                    {ann.pinned && (
                      <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/80">
                        Pinned
                      </span>
                    )}
                    {ann.priority === 'critical' && (
                      <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/80">
                        Critical
                      </span>
                    )}
                    {ann.priority === 'important' && (
                      <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">
                        Important
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {ann.publishedAt}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2">
                  {ann.content}
                </p>

                <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
                  <span>Author: {ann.author}</span>
                  <span>·</span>
                  <span className="uppercase">Target: {ann.targetCohort}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Recent Audit Trail Feed */}
        <div className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-extrabold text-slate-900">
                  Recent Audit Events
                </h2>
              </div>
              <span className="text-[11px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                Immutable
              </span>
            </div>

            <div className="space-y-3">
              {recentAudits.slice(0, 4).map((log) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium line-clamp-1">
                    {log.details || `${log.action} performed by ${log.adminName}`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Link
              to="/admin/audit"
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center justify-between group"
            >
              <span>Inspect Full Security & Audit Trail</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Direct Quick Navigation Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 text-xs">
        <Link
          to="/admin/audit"
          className="p-4 surface-base rounded-2xl border border-slate-200/90 hover:border-amber-400 hover:shadow-xs transition-all flex items-center justify-between group shadow-2xs bg-amber-50/20"
        >
          <div className="space-y-0.5">
            <div className="font-bold text-slate-900 group-hover:text-amber-800 transition-colors flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Audit Logs</span>
            </div>
            <div className="text-slate-500 font-medium text-[11px]">
              Review all sensitive role and system adjustments
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0 ml-2" />
        </Link>

        <Link
          to="/admin/users"
          className="p-4 surface-base rounded-2xl border border-slate-200/90 hover:border-sky-300 hover:shadow-xs transition-all flex items-center justify-between group shadow-2xs"
        >
          <div className="space-y-0.5">
            <div className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors flex items-center gap-1.5">
              <Users className="w-4 h-4 text-sky-600" />
              <span>User Directory</span>
            </div>
            <div className="text-slate-500 font-medium text-[11px]">
              Manage student, TA, and advisor permissions
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 shrink-0 ml-2" />
        </Link>

        <Link
          to="/admin/subjects"
          className="p-4 surface-base rounded-2xl border border-slate-200/90 hover:border-sky-300 hover:shadow-xs transition-all flex items-center justify-between group shadow-2xs"
        >
          <div className="space-y-0.5">
            <div className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-sky-600" />
              <span>Master Curriculum</span>
            </div>
            <div className="text-slate-500 font-medium text-[11px]">
              Institutional course catalog & pacing
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 shrink-0 ml-2" />
        </Link>

        <Link
          to="/admin/analytics"
          className="p-4 surface-base rounded-2xl border border-slate-200/90 hover:border-sky-300 hover:shadow-xs transition-all flex items-center justify-between group shadow-2xs"
        >
          <div className="space-y-0.5">
            <div className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              <span>Workload Analytics</span>
            </div>
            <div className="text-slate-500 font-medium text-[11px]">
              Semester bottleneck histogram & strain
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 shrink-0 ml-2" />
        </Link>
      </div>
    </div>
  );
}
