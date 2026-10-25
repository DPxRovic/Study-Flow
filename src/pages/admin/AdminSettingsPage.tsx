/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  Save,
  ShieldCheck,
  History,
  Calendar,
  AlertCircle,
  Clock,
  RotateCcw,
  CheckCircle2,
  Lock,
  ArrowRight,
  Activity,
  Server,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';
import { usePlanner } from '../../context/PlannerContext';
import { adminService } from '../../services/adminService';
import { AuditLogRecord } from '../../types';

export function AdminSettingsPage() {
  const { showToast } = useToast();
  const { refreshData } = usePlanner();

  // Academic Term Boundary State
  const [termName, setTermName] = useState('Fall Semester 2026');
  const [academicYear, setAcademicYear] = useState('2026–2027');
  const [startDate, setStartDate] = useState('2026-08-24');
  const [endDate, setEndDate] = useState('2026-12-18');
  const [censusDate, setCensusDate] = useState('2026-09-08');
  const [withdrawalDeadline, setWithdrawalDeadline] = useState('2026-10-16');
  const [readingStart, setReadingStart] = useState('2026-12-07');
  const [readingEnd, setReadingEnd] = useState('2026-12-09');
  const [finalsStart, setFinalsStart] = useState('2026-12-10');
  const [finalsEnd, setFinalsEnd] = useState('2026-12-18');

  // Study Policy Safeguards
  const [defaultDailyStudyCap, setDefaultDailyStudyCap] = useState('6.0');
  const [defaultSessionMinutes, setDefaultSessionMinutes] = useState('50');
  const [overloadThreshold, setOverloadThreshold] = useState('8.0');

  // Live Audit Logs & Health from Backend
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [isLoadingAudits, setIsLoadingAudits] = useState(true);
  const [systemHealth, setSystemHealth] = useState<{ ok: boolean; latencyMs: number } | null>(null);
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [isSavingPolicies, setIsSavingPolicies] = useState(false);

  const fetchLiveAudits = async () => {
    try {
      const [res, healthRes, settingsRes] = await Promise.all([
        adminService.getAuditLogs({ limit: 5, order: 'desc' }),
        adminService.getHealth().catch(() => null),
        adminService.getSettings().catch(() => null),
      ]);

      if (res && res.success) {
        setAuditLogs(res.data || []);
      }
      if (healthRes?.database) {
        setSystemHealth(healthRes.database);
      }
      if (settingsRes?.data) {
        const s = settingsRes.data;
        if (s.termName) setTermName(s.termName);
        if (s.academicYear) setAcademicYear(s.academicYear);
        if (s.startDate) setStartDate(s.startDate);
        if (s.endDate) setEndDate(s.endDate);
        if (s.censusDate) setCensusDate(s.censusDate);
        if (s.withdrawalDeadline) setWithdrawalDeadline(s.withdrawalDeadline);
        if (s.readingStart) setReadingStart(s.readingStart);
        if (s.readingEnd) setReadingEnd(s.readingEnd);
        if (s.finalsStart) setFinalsStart(s.finalsStart);
        if (s.finalsEnd) setFinalsEnd(s.finalsEnd);
        if (s.defaultDailyStudyCap) setDefaultDailyStudyCap(String(s.defaultDailyStudyCap));
        if (s.defaultSessionMinutes) setDefaultSessionMinutes(String(s.defaultSessionMinutes));
        if (s.overloadThreshold) setOverloadThreshold(String(s.overloadThreshold));
      }
    } catch (e) {
      console.warn('Failed to fetch audits on settings page:', e);
    } finally {
      setIsLoadingAudits(false);
    }
  };

  useEffect(() => {
    fetchLiveAudits();
  }, []);

  const handleRefreshData = async () => {
    await Promise.all([refreshData(), fetchLiveAudits()]);
    showToast('Live administrative data refreshed', 'info');
  };

  const handleSaveTermBoundaries = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTerms(true);
    try {
      const payload = {
        termName,
        academicYear,
        startDate,
        endDate,
        censusDate,
        withdrawalDeadline,
        readingStart,
        readingEnd,
        finalsStart,
        finalsEnd,
      };
      await adminService.updateSettings(payload);
      showToast('Institutional calendar boundaries saved & audit log recorded', 'success');
      await fetchLiveAudits();
    } catch (err: any) {
      showToast(err.message || 'Failed to save calendar boundaries', 'error');
    } finally {
      setIsSavingTerms(false);
    }
  };

  const handleSaveFatiguePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPolicies(true);
    try {
      const payload = {
        defaultDailyStudyCap: parseFloat(defaultDailyStudyCap) || 6.0,
        defaultSessionMinutes: parseInt(defaultSessionMinutes, 10) || 50,
        overloadThreshold: parseFloat(overloadThreshold) || 8.0,
      };
      await adminService.updateSettings(payload);
      showToast('Student fatigue safeguard policies saved & audit log recorded', 'success');
      await fetchLiveAudits();
    } catch (err: any) {
      showToast(err.message || 'Failed to save fatigue safeguard policies', 'error');
    } finally {
      setIsSavingPolicies(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] w-full pb-16 font-sans">
      {/* 1. Header */}
      <div className="border-b border-slate-200/90 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
              Institutional Governance
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Campus Configuration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-slate-700" />
            <span>Institutional Settings & Policies</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium leading-relaxed">
            Global administrative configurations: academic term boundaries, default fatigue thresholds, database health telemetry, and tamper-evident audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/admin/audit">
            <Button variant="secondary" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}>
              Open Audit Console
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefreshData}
            icon={<RefreshCw className="w-3.5 h-3.5 text-sky-600" />}
          >
            Refresh Live Data
          </Button>
        </div>
      </div>

      {/* 1.5 System & Database Health Banner */}
      <div className="p-4 rounded-2xl surface-base border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
            systemHealth?.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : systemHealth
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>PostgreSQL Production Database</span>
              <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold ${
                systemHealth?.ok
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : systemHealth
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                {systemHealth?.ok ? 'Operational' : systemHealth ? 'Unavailable' : 'Not checked'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Prisma ORM · Database latency: {systemHealth ? `${systemHealth.latencyMs}ms` : 'Unavailable'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Audit System:</span>
          <span className="font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Database-backed
          </span>
        </div>
      </div>

      {/* 2. Academic Term Calendar Boundaries */}
      <form onSubmit={handleSaveTermBoundaries} className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-extrabold text-slate-900">
              Academic Term Calendar Boundaries
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md font-bold border border-emerald-200/80">
            Active Term Policy
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          Define institutional semester milestones, add/drop census dates, and reading/finals intervals for automated schedule engines.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Input
            label="Term Description"
            value={termName}
            onChange={(e) => setTermName(e.target.value)}
            required
          />
          <Input
            label="Academic Year"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            required
          />
          <Input
            label="Semester Instruction Start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label="Semester Instruction End"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
          <Input
            label="Census Add/Drop Deadline"
            type="date"
            value={censusDate}
            onChange={(e) => setCensusDate(e.target.value)}
            required
          />
          <Input
            label="Withdrawal Deadline"
            type="date"
            value={withdrawalDeadline}
            onChange={(e) => setWithdrawalDeadline(e.target.value)}
            required
          />
          <Input
            label="Reading Period Start"
            type="date"
            value={readingStart}
            onChange={(e) => setReadingStart(e.target.value)}
            required
          />
          <Input
            label="Finals Examination End"
            type="date"
            value={finalsEnd}
            onChange={(e) => setFinalsEnd(e.target.value)}
            required
          />
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSavingTerms}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            {isSavingTerms ? 'Saving Boundaries...' : 'Save Term Boundaries'}
          </Button>
        </div>
      </form>

      {/* 3. Fatigue Safeguard Policies */}
      <form onSubmit={handleSaveFatiguePolicies} className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-slate-900">
              Institutional Student Fatigue Safeguards
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md font-bold border border-emerald-200/80">
            Active Fatigue Policy
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          These institutional thresholds govern default scheduler settings and warn students when automated schedules threaten fatigue boundaries or midnight overruns.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Default Daily Study Cap (Hours)"
            type="number"
            step="0.5"
            min="2"
            max="12"
            value={defaultDailyStudyCap}
            onChange={(e) => setDefaultDailyStudyCap(e.target.value)}
            helperText="Default safeguard cap for newly enrolled students"
            required
          />

          <Input
            label="Standard Pomodoro/Focus Block (Min)"
            type="number"
            min="25"
            max="120"
            value={defaultSessionMinutes}
            onChange={(e) => setDefaultSessionMinutes(e.target.value)}
            helperText="Recommended focus interval before mandatory break"
            required
          />

          <Input
            label="Cohort Overload Threshold (Hours/Day)"
            type="number"
            step="0.5"
            min="4"
            max="14"
            value={overloadThreshold}
            onChange={(e) => setOverloadThreshold(e.target.value)}
            helperText="Triggers advisor outreach flag when exceeded"
            required
          />
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSavingPolicies}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            {isSavingPolicies ? 'Saving Policies...' : 'Save Fatigue Policies'}
          </Button>
        </div>
      </form>

      {/* 4. Live Administrative Audit Trail (Linked to Full Console) */}
      <div className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-extrabold text-slate-900">
              Recent Administrative Audit Trail
            </h2>
          </div>
          <Link
            to="/admin/audit"
            className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1"
          >
            <span>Open Dedicated Audit Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoadingAudits ? (
            <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
              <span>Loading PostgreSQL audit logs...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No audit records recorded yet.
            </div>
          ) : (
            auditLogs.map((log) => {
              const formattedTime = new Date(log.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{log.action}</span>
                      <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200">
                        {log.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {log.details} — <span className="text-slate-700 font-semibold">{log.adminName}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                    {formattedTime}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
