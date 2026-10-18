/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Clock,
  Plus,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  X,
  Layers,
} from 'lucide-react';
import { Task } from '../../types';
import { usePlanner } from '../../context/PlannerContext';
import { Badge, PriorityBadge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface UnscheduledTasksDrawerProps {
  onScheduleTask: (task: Task) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function UnscheduledTasksDrawer({
  onScheduleTask,
  isOpen,
  onClose,
}: UnscheduledTasksDrawerProps) {
  const { tasks, subjects, sessions } = usePlanner();

  // If used as modal/drawer and isOpen is explicitly false, don't render
  if (isOpen === false) return null;

  // Find tasks with unallocated hours
  const unallocatedTasks = tasks
    .filter((t) => t.status !== 'completed' && t.remainingHours > 0)
    .map((task) => {
      const scheduledMinutes = sessions
        .filter((s) => s.taskId === task.id && !s.completed && s.status !== 'cancelled')
        .reduce((sum, s) => sum + s.durationMinutes, 0);
      const scheduledHours = scheduledMinutes / 60;
      const unallocatedHours = Math.max(0, task.remainingHours - scheduledHours);

      return {
        task,
        scheduledHours,
        unallocatedHours,
      };
    })
    .filter((item) => item.unallocatedHours > 0.1)
    .sort((a, b) => {
      // Sort by priority and due date
      const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const diffP = pOrder[a.task.priority] - pOrder[b.task.priority];
      if (diffP !== 0) return diffP;
      return new Date(a.task.dueDate).getTime() - new Date(b.task.dueDate).getTime();
    });

  const content = (
    <div className="space-y-4">
      {unallocatedTasks.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-sm font-extrabold text-slate-900">
            All Deliverable Hours Allocated
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
            Every active coursework assignment has enough scheduled study blocks mapped on your timeline.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {unallocatedTasks.map(({ task, scheduledHours, unallocatedHours }) => {
            const subject = subjects.find((s) => s.id === task.subjectId);
            const category = subject?.colorKey || 'cs';
            const dueDateFormatted = new Date(task.dueDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={task.id}
                className={`py-3.5 px-2.5 rounded-xl transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-2 last:pb-2 border-l-3 border-l-transparent ${
                  task.priority === 'urgent'
                    ? 'hover:bg-rose-50/30 hover:border-l-rose-500'
                    : task.priority === 'high'
                    ? 'hover:bg-rose-50/20 hover:border-l-rose-400'
                    : task.priority === 'medium'
                    ? 'hover:bg-amber-50/20 hover:border-l-amber-400'
                    : 'hover:bg-emerald-50/15 hover:border-l-emerald-400'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="subject" category={category} className="font-mono text-[10px]">
                      {subject?.code || 'COURSE'}
                    </Badge>
                    <PriorityBadge priority={task.priority} size="xs" showCode />
                    <span className="text-[11px] text-slate-400 font-medium font-mono">
                      Due {dueDateFormatted}
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {task.title}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600">
                    <span>
                      Required: <strong>{task.remainingHours.toFixed(1)}h</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>
                      Scheduled: <strong>{scheduledHours.toFixed(1)}h</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-amber-700 font-bold">
                      Need: {unallocatedHours.toFixed(1)}h
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onScheduleTask(task)}
                  icon={<Plus className="w-3.5 h-3.5" />}
                  className="self-start sm:self-auto shrink-0"
                >
                  Schedule Block
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // If rendered as drawer modal (isOpen !== undefined)
  if (isOpen !== undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="surface-base rounded-2xl border border-slate-200/90 shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200/60 shadow-2xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Unallocated Workload Queue
                </h3>
                <span className="text-[11px] text-slate-500 block">
                  Assignments requiring study blocks to be scheduled
                </span>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto">{content}</div>
        </div>
      </div>
    );
  }

  // Inline view
  return (
    <div className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-900">
              Unallocated Workload Queue
            </h3>
            {unallocatedTasks.length > 0 && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono">
                {unallocatedTasks.length} {unallocatedTasks.length === 1 ? 'Task' : 'Tasks'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Assignments with remaining study hours not yet placed on your schedule.
          </p>
        </div>
      </div>

      {content}
    </div>
  );
}
