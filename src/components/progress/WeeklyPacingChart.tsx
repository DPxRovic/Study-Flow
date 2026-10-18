/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, TrendingUp, ShieldCheck } from 'lucide-react';
import { ScheduledSession } from '../../types';

interface WeeklyPacingChartProps {
  sessions: ScheduledSession[];
  dailyCapHours?: number;
}

interface DayPacingData {
  dayName: string;
  dayShort: string;
  dateStr: string;
  completedHours: number;
  plannedHours: number;
}

export function WeeklyPacingChart({
  sessions,
  dailyCapHours = 5.5,
}: WeeklyPacingChartProps) {
  // Build days for current week: 2026-10-05 (Monday) to 2026-10-11 (Sunday)
  const weekDays = [
    { dayName: 'Monday', dayShort: 'Mon', dateStr: '2026-10-05' },
    { dayName: 'Tuesday', dayShort: 'Tue', dateStr: '2026-10-06' },
    { dayName: 'Wednesday', dayShort: 'Wed', dateStr: '2026-10-07' },
    { dayName: 'Thursday', dayShort: 'Thu', dateStr: '2026-10-08' },
    { dayName: 'Friday', dayShort: 'Fri', dateStr: '2026-10-09' },
    { dayName: 'Saturday', dayShort: 'Sat', dateStr: '2026-10-10' },
    { dayName: 'Sunday', dayShort: 'Sun', dateStr: '2026-10-11' },
  ];

  const pacingData: DayPacingData[] = weekDays.map((d) => {
    const daySessions = sessions.filter((s) => s.date === d.dateStr);
    const completedMinutes = daySessions
      .filter((s) => s.completed)
      .reduce((acc, s) => acc + s.durationMinutes, 0);
    const plannedMinutes = daySessions
      .filter((s) => !s.completed && s.status !== 'cancelled')
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    return {
      dayName: d.dayName,
      dayShort: d.dayShort,
      dateStr: d.dateStr,
      completedHours: completedMinutes / 60,
      plannedHours: plannedMinutes / 60,
    };
  });

  const maxHoursScale = Math.max(
    6.0,
    dailyCapHours + 1.0,
    ...pacingData.map((d) => d.completedHours + d.plannedHours)
  );

  return (
    <div className="surface-base rounded-2xl p-5 sm:p-6 shadow-2xs border border-slate-200/90 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-600" />
            <span>Daily Study Pacing & Fatigue Cap Horizon</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Daily study hours invested vs. remaining planned blocks, bounded by your {dailyCapHours}h fatigue threshold.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
            <span className="text-slate-600">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-sky-500" />
            <span className="text-slate-600">Planned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed border-rose-400" />
            <span className="text-slate-500 font-mono text-[11px]">{dailyCapHours}h Cap</span>
          </div>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="relative pt-6 pb-2">
        {/* Fatigue Cap Threshold Line */}
        <div
          className="absolute left-8 right-0 border-t-2 border-dashed border-rose-300 z-10 pointer-events-none flex items-center justify-end pr-2"
          style={{
            bottom: `${(dailyCapHours / maxHoursScale) * 160 + 32}px`,
          }}
        >
          <span className="bg-rose-50 text-rose-700 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-rose-200/60 shadow-2xs">
            Fatigue Cap ({dailyCapHours}h)
          </span>
        </div>

        {/* Chart Grid */}
        <div className="h-44 flex items-end gap-2 sm:gap-4 pl-8 pr-2 relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 w-6 flex flex-col justify-between text-[10px] font-mono text-slate-400 tabular-nums">
            <span>{maxHoursScale.toFixed(0)}h</span>
            <span>{(maxHoursScale / 2).toFixed(0)}h</span>
            <span>0h</span>
          </div>

          {/* Grid lines */}
          <div className="absolute left-8 right-0 top-0 border-b border-slate-100" />
          <div className="absolute left-8 right-0 top-1/2 border-b border-slate-100" />
          <div className="absolute left-8 right-0 bottom-8 border-b border-slate-200" />

          {/* Day Columns */}
          {pacingData.map((day) => {
            const completedHeight = (day.completedHours / maxHoursScale) * 140;
            const plannedHeight = (day.plannedHours / maxHoursScale) * 140;
            const totalHours = day.completedHours + day.plannedHours;

            return (
              <div
                key={day.dateStr}
                className="flex-1 flex flex-col items-center h-full justify-end group relative"
              >
                {/* Total label above bar */}
                {totalHours > 0 && (
                  <span className="text-[10px] font-mono font-bold text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {totalHours.toFixed(1)}h
                  </span>
                )}

                {/* Stacked Bar */}
                <div className="w-full max-w-[36px] flex flex-col justify-end rounded-t-md overflow-hidden bg-slate-100/60">
                  {day.plannedHours > 0 && (
                    <div
                      className="w-full bg-sky-500 hover:bg-sky-600 transition-all cursor-pointer"
                      style={{ height: `${plannedHeight}px` }}
                      title={`Planned: ${day.plannedHours.toFixed(1)}h`}
                    />
                  )}
                  {day.completedHours > 0 && (
                    <div
                      className="w-full bg-emerald-500 hover:bg-emerald-600 transition-all cursor-pointer"
                      style={{ height: `${completedHeight}px` }}
                      title={`Completed: ${day.completedHours.toFixed(1)}h`}
                    />
                  )}
                </div>

                {/* Day Label */}
                <div className="mt-2 text-center">
                  <div className="text-xs font-bold text-slate-700">
                    {day.dayShort}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                    {totalHours > 0 ? `${totalHours.toFixed(1)}h` : '—'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
