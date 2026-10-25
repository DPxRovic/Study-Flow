/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, Calendar, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Task, Subject } from '../../types';
import { SUBJECT_CATEGORY_STYLES } from '../../theme/tokens';
import { Link } from 'react-router-dom';

interface DeadlineWorkloadHorizonProps {
  tasks: Task[];
  subjects: Subject[];
}

export function DeadlineWorkloadHorizon({
  tasks,
  subjects,
}: DeadlineWorkloadHorizonProps) {
  // Sort incomplete tasks by dueDate ascending
  const horizonEnd = Date.now() + 10 * 24 * 60 * 60 * 1000;
  const upcomingTasks = tasks
    .filter((t) => {
      const dueAt = new Date(t.dueDate).getTime();
      return t.status !== 'completed' && Number.isFinite(dueAt) && dueAt <= horizonEnd;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const subjectsMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="surface-base rounded-2xl p-5 sm:p-6 shadow-2xs border border-slate-200/90 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600" />
            <span>Approaching Deadlines & Required Workload Horizon</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Chronological breakdown of remaining coursework hours due over the next 10 days.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {upcomingTasks.length} Pending Deliverable{upcomingTasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {upcomingTasks.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <div className="text-sm font-bold text-slate-800">
            All Current Deliverables Completed!
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No impending deadlines or unallocated problem sets remaining in your active syllabus.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {upcomingTasks.map((task) => {
            const subject = subjectsMap.get(task.subjectId);
            const style = subject ? SUBJECT_CATEGORY_STYLES[subject.colorKey] : null;

            const dueDate = new Date(task.dueDate);
            const now = new Date();
            const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            const diffDays = Math.ceil(diffHours / 24);

            let urgencyText = '';
            let urgencyClass = '';

            if (diffHours < 0) {
              urgencyText = 'Overdue';
              urgencyClass = 'text-rose-700 font-bold';
            } else if (diffHours <= 24) {
              urgencyText = 'Due in <24 hours';
              urgencyClass = 'text-rose-600 font-bold';
            } else if (diffHours <= 48) {
              urgencyText = 'Due in 2 days';
              urgencyClass = 'text-amber-600 font-bold';
            } else {
              urgencyText = `Due in ${diffDays} days`;
              urgencyClass = 'text-slate-600 font-medium';
            }

            return (
              <div
                key={task.id}
                className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 -mx-2 px-2 rounded-xl transition-colors"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {style && <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0`} />}
                    <span className="font-bold text-xs text-slate-500">
                      {subject?.code || 'Course'}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-extrabold text-sm text-slate-900 truncate">
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={urgencyClass}>{urgencyText}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {dueDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    {task.subtasks && task.subtasks.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Remaining Workload:</div>
                    <div className="font-mono tabular-nums font-extrabold text-sm text-slate-900">
                      {task.remainingHours.toFixed(1)}h / {task.estimatedHours.toFixed(1)}h
                    </div>
                  </div>

                  <Link
                    to="/tasks"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                    title="View task details"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
