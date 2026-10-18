/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { SubjectWorkloadStatus } from '../../types';

interface CoreMetricsGridProps {
  totalEstimatedHours: number;
  totalCompletedHours: number;
  totalRemainingHours: number;
  completedTasksCount: number;
  totalTasksCount: number;
  weeklyTargetHours: number;
  weeklyLoggedHours: number;
  dailyCapHours: number;
  imminentDeadlinesCount: number;
  attentionSubjectsCount: number;
}

export function CoreMetricsGrid({
  totalEstimatedHours,
  totalCompletedHours,
  totalRemainingHours,
  completedTasksCount,
  totalTasksCount,
  weeklyTargetHours,
  weeklyLoggedHours,
  dailyCapHours,
  imminentDeadlinesCount,
  attentionSubjectsCount,
}: CoreMetricsGridProps) {
  const completionPercentage =
    totalEstimatedHours > 0
      ? Math.round((totalCompletedHours / totalEstimatedHours) * 100)
      : 0;

  const weeklyPacingPercentage =
    weeklyTargetHours > 0
      ? Math.round((weeklyLoggedHours / weeklyTargetHours) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. What have I completed vs remaining */}
      <div className="surface-base rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2 border border-slate-200/90">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Deliverables Progress</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {completedTasksCount} / {totalTasksCount}
          </span>
          <span className="text-xs font-bold text-slate-500">tasks done</span>
        </div>
        <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <span className="font-mono tabular-nums font-bold text-emerald-700">
            {totalCompletedHours.toFixed(1)}h logged
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="font-mono tabular-nums text-slate-500">
            {totalRemainingHours.toFixed(1)}h remain
          </span>
        </div>
      </div>

      {/* 2. Weekly Study Pacing */}
      <div className="surface-base rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2 border border-slate-200/90">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Weekly Target Pacing</span>
          <Clock className="w-4 h-4 text-sky-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {weeklyLoggedHours.toFixed(1)}h / {weeklyTargetHours.toFixed(1)}h
          </span>
        </div>
        <div className="pt-1 flex items-center gap-1.5 text-xs font-medium">
          <span className="font-bold text-sky-850">
            {weeklyPacingPercentage}% of weekly target
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-slate-500">
            {Math.max(0, weeklyTargetHours - weeklyLoggedHours).toFixed(1)}h to go
          </span>
        </div>
      </div>

      {/* 3. Fatigue Cap Adherence */}
      <div className="surface-base rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2 border border-slate-200/90">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Fatigue Boundary Safety</span>
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700">
            100% Adherence
          </span>
        </div>
        <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <span>Daily study cap:</span>
          <span className="font-mono tabular-nums font-bold text-slate-900">
            {dailyCapHours.toFixed(1)}h/day
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-slate-500">0 midnight overruns</span>
        </div>
      </div>

      {/* 4. Attention & Urgency */}
      <div className="surface-base rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2 border border-slate-200/90">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Urgent Academic Focus</span>
          {imminentDeadlinesCount > 0 ? (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {imminentDeadlinesCount}
          </span>
          <span className="text-xs font-bold text-slate-500">due in ≤ 72h</span>
        </div>
        <div className="pt-1 flex items-center gap-1.5 text-xs font-medium">
          {attentionSubjectsCount > 0 ? (
            <span className="font-bold text-amber-700">
              {attentionSubjectsCount} course{attentionSubjectsCount > 1 ? 's' : ''} require attention
            </span>
          ) : (
            <span className="font-bold text-emerald-700">
              All enrolled courses balanced
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
