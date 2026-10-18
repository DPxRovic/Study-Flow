/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCw,
  ArrowRight,
} from 'lucide-react';
import { ScheduleConflict } from '../../types';
import { Button } from '../ui/Button';

export interface ScheduleConflictsBannerProps {
  conflicts: ScheduleConflict[];
  onAutoFix?: () => void;
  onResolveConflict?: () => void;
  onSelectConflict?: (conflict: ScheduleConflict) => void;
  onSelectSession?: (session: any) => void;
}

export function ScheduleConflictsBanner({
  conflicts,
  onAutoFix,
  onResolveConflict,
  onSelectConflict,
  onSelectSession,
}: ScheduleConflictsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const handleFix = onResolveConflict || onAutoFix;

  if (!conflicts || conflicts.length === 0) return null;

  const dangerCount = conflicts.filter((c) => c.severity === 'danger').length;
  const warningCount = conflicts.filter((c) => c.severity === 'warning').length;

  return (
    <div
      className={`rounded-2xl border transition-all overflow-hidden shadow-2xs ${
        dangerCount > 0
          ? 'border-rose-300 bg-gradient-to-r from-rose-50/95 via-rose-50/70 to-white'
          : 'border-amber-300 bg-gradient-to-r from-amber-50/95 via-amber-50/70 to-white'
      }`}
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
              dangerCount > 0
                ? 'bg-rose-100 text-rose-700 border-rose-200'
                : 'bg-amber-100 text-amber-700 border-amber-200'
            }`}
          >
            {dangerCount > 0 ? (
              <AlertOctagon className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3
                className={`text-sm font-extrabold ${
                  dangerCount > 0 ? 'text-rose-950' : 'text-amber-950'
                }`}
              >
                Schedule Diagnostics & Conflicts Detected
              </h3>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md font-mono ${
                  dangerCount > 0
                    ? 'bg-rose-200/80 text-rose-900'
                    : 'bg-amber-200/80 text-amber-900'
                }`}
              >
                {conflicts.length} {conflicts.length === 1 ? 'Issue' : 'Issues'}
              </span>
            </div>
            <p
              className={`text-xs mt-0.5 font-medium ${
                dangerCount > 0 ? 'text-rose-800' : 'text-amber-800'
              }`}
            >
              {dangerCount > 0
                ? `${dangerCount} critical collisions (time overlap or post-deadline) require attention.`
                : `${warningCount} workload or unallocated pacing warnings detected.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {handleFix && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFix}
              icon={<RotateCw className="w-3.5 h-3.5 text-sky-600" />}
            >
              Auto-Resolve
            </Button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 transition-colors cursor-pointer"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Conflict Items */}
      {isExpanded && (
        <div className="border-t border-slate-200/60 divide-y divide-slate-200/40 px-4 sm:px-5 py-2">
          {conflicts.map((conflict) => {
            const isDanger = conflict.severity === 'danger';
            return (
              <div
                key={conflict.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isDanger ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="font-extrabold text-slate-900">
                      {conflict.title}
                    </span>
                    {conflict.date && (
                      <span className="font-mono text-[11px] text-slate-500 font-semibold">
                        ({conflict.date})
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 font-medium pl-4 leading-relaxed text-[11px] sm:text-xs">
                    {conflict.description}
                  </p>
                </div>

                {onSelectConflict && (
                  <button
                    onClick={() => onSelectConflict(conflict)}
                    className="self-start sm:self-auto text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer pl-4 sm:pl-0"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
