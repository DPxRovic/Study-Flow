/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, CheckCircle2, Calendar, AlertCircle } from 'lucide-react';

interface WorkloadBalanceBarProps {
  totalEstimatedHours: number;
  completedHours: number;
  scheduledHours: number;
  unscheduledHours: number;
}

export function WorkloadBalanceBar({
  totalEstimatedHours,
  completedHours,
  scheduledHours,
  unscheduledHours,
}: WorkloadBalanceBarProps) {
  const total = Math.max(0.1, totalEstimatedHours);
  const completedPct = Math.min(100, Math.round((completedHours / total) * 100));
  const scheduledPct = Math.min(100 - completedPct, Math.round((scheduledHours / total) * 100));
  const unscheduledPct = Math.max(0, 100 - completedPct - scheduledPct);

  return (
    <div className="surface-base rounded-2xl p-5 sm:p-6 shadow-2xs border border-slate-200/90 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <span>Total Workload Allocation State</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Answers how much total coursework is completed, how much is anchored to calendar slots, and what remains unscheduled.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-400">Total Workload Horizon:</span>
          <span className="ml-1.5 text-base font-extrabold font-mono tabular-nums text-slate-900">
            {totalEstimatedHours.toFixed(1)}h
          </span>
        </div>
      </div>

      {/* Segmented Workload Bar */}
      <div className="space-y-2">
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner p-0.5 border border-slate-200/60">
          {completedPct > 0 && (
            <div
              className="h-full bg-emerald-500 rounded-l-full transition-all duration-500 relative group"
              style={{ width: `${completedPct}%` }}
              title={`Completed: ${completedHours.toFixed(1)}h (${completedPct}%)`}
            />
          )}
          {scheduledPct > 0 && (
            <div
              className={`h-full bg-sky-500 transition-all duration-500 relative group ${
                completedPct === 0 ? 'rounded-l-full' : ''
              }`}
              style={{ width: `${scheduledPct}%` }}
              title={`Scheduled: ${scheduledHours.toFixed(1)}h (${scheduledPct}%)`}
            />
          )}
          {unscheduledPct > 0 && (
            <div
              className="h-full bg-amber-400 rounded-r-full transition-all duration-500 relative group"
              style={{ width: `${unscheduledPct}%` }}
              title={`Unscheduled: ${unscheduledHours.toFixed(1)}h (${unscheduledPct}%)`}
            />
          )}
        </div>

        {/* Legend with exact academic figures */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-slate-500 text-[11px] font-semibold">Completed Logged</div>
              <div className="font-mono tabular-nums font-bold text-slate-900">
                {completedHours.toFixed(1)}h ({completedPct}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="w-3 h-3 rounded-md bg-sky-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-slate-500 text-[11px] font-semibold">Scheduled on Calendar</div>
              <div className="font-mono tabular-nums font-bold text-slate-900">
                {scheduledHours.toFixed(1)}h ({scheduledPct}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="w-3 h-3 rounded-md bg-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-slate-500 text-[11px] font-semibold">Unscheduled Backlog</div>
              <div className="font-mono tabular-nums font-bold text-slate-900">
                {unscheduledHours.toFixed(1)}h ({unscheduledPct}%)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
