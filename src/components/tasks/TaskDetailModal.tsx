/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Task, Subject } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge, PriorityBadge } from '../ui/Badge';
import {
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Edit2,
  Trash2,
  Play,
  Check,
} from 'lucide-react';
import { SUBJECT_CATEGORY_STYLES } from '../../theme/tokens';

interface TaskDetailModalProps {
  task: Task | null;
  subject?: Subject;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onStartFocus?: (task: Task) => void;
}

export function TaskDetailModal({
  task,
  subject,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleComplete,
  onToggleSubtask,
  onStartFocus,
}: TaskDetailModalProps) {
  if (!task) return null;

  const isCompleted = task.status === 'completed';
  const category = subject?.colorKey || 'cs';
  const style = SUBJECT_CATEGORY_STYLES[category];

  const dueDateObj = new Date(task.dueDate);
  const formattedDueDate = !isNaN(dueDateObj.getTime())
    ? dueDateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : task.dueDate;

  const formattedDueTime = !isNaN(dueDateObj.getTime())
    ? dueDateObj.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const daysLeft = Math.ceil((dueDateObj.getTime() - Date.now()) / (1000 * 3600 * 24));
  const isUrgent = daysLeft <= 2 && daysLeft >= 0 && !isCompleted;
  const isOverdue = daysLeft < 0 && !isCompleted;

  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(((task.estimatedHours - task.remainingHours) / (task.estimatedHours || 1)) * 100)
    )
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      description={`${subject?.code || 'Course'} · Deliverable Detail & Timeline`}
      maxWidth="lg"
      icon={<BookOpen className="w-4 h-4" />}
    >
      <div className="space-y-5 pt-1">
        {/* Banner with Subject Category & Urgency */}
        <div
          className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 surface-binder border-l-4"
          style={{ borderLeftColor: style.dot }}
        >
          <div className="flex items-center gap-2">
            <Badge variant="subject" category={category}>
              {subject?.code} · {subject?.name}
            </Badge>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-slate-600 capitalize">
              {task.type.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isOverdue && (
              <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Overdue
              </span>
            )}
            {isUrgent && (
              <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {daysLeft === 0 ? 'Due Today' : `Due in ${daysLeft} days`}
              </span>
            )}
            <PriorityBadge priority={task.priority} size="md" />
          </div>
        </div>

        {/* Deliverable Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 surface-inset rounded-xl border border-slate-200/80">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Est. Total
            </div>
            <div className="text-base font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
              {task.estimatedHours.toFixed(1)}h
            </div>
          </div>

          <div className="p-3 surface-inset rounded-xl border border-slate-200/80">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Remaining
            </div>
            <div className="text-base font-extrabold font-mono tabular-nums text-sky-850 mt-0.5">
              {task.remainingHours.toFixed(1)}h
            </div>
          </div>

          <div className="p-3 surface-inset rounded-xl border border-slate-200/80">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Work Completed
            </div>
            <div className="text-base font-extrabold font-mono tabular-nums text-emerald-700 mt-0.5">
              {progressPercent}%
            </div>
          </div>

          <div className="p-3 surface-inset rounded-xl border border-slate-200/80">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Status
            </div>
            <div className="text-xs font-extrabold text-slate-800 mt-1 capitalize">
              {task.status.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-600 font-medium">
            <span>Study Time Completion</span>
            <span className="font-mono tabular-nums font-bold">
              {(task.estimatedHours - task.remainingHours).toFixed(1)}h / {task.estimatedHours.toFixed(1)}h
            </span>
          </div>
          <div className="w-full h-2 rounded-full surface-inset overflow-hidden border border-slate-200/70">
            <div
              className={`h-full transition-all duration-300 ${
                isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-sky-500 to-cyan-500'
              }`}
              style={{ width: `${isCompleted ? 100 : progressPercent}%` }}
            />
          </div>
        </div>

        {/* Due Date Details */}
        <div className="p-3.5 surface-base rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Target Deadline:</span>
            <span className="font-bold text-slate-900">{formattedDueDate}</span>
            {formattedDueTime && (
              <span className="font-mono text-slate-500">at {formattedDueTime}</span>
            )}
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            {isCompleted ? 'Finished' : `${daysLeft} days remaining`}
          </span>
        </div>

        {/* Syllabus Notes */}
        {task.notes && (
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Syllabus Directives & Notes</span>
            </div>
            <div className="p-3 surface-inset rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-200/80 whitespace-pre-wrap">
              {task.notes}
            </div>
          </div>
        )}

        {/* Subtask Checkpoints */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">
              Checkpoints ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} Completed)
            </div>
            <div className="surface-inset p-3 rounded-xl border border-slate-200/80 space-y-1.5 max-h-48 overflow-y-auto">
              {task.subtasks.map((st) => (
                <button
                  key={st.id}
                  onClick={() => onToggleSubtask(task.id, st.id)}
                  className="w-full text-left text-xs flex items-center gap-2.5 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer bg-white/70 border border-slate-200/60"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      st.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {st.completed && <Check className="w-3 h-3" />}
                  </span>
                  <span
                    className={`font-medium ${
                      st.completed ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}
                  >
                    {st.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Button
              variant={isCompleted ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => onToggleComplete(task.id)}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              {isCompleted ? 'Mark Incomplete' : 'Complete Assignment'}
            </Button>

            {onStartFocus && !isCompleted && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onStartFocus(task);
                  onClose();
                }}
                icon={<Play className="w-3.5 h-3.5 text-sky-600" />}
              >
                Focus Now
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onEdit(task);
                onClose();
              }}
              icon={<Edit2 className="w-3.5 h-3.5" />}
            >
              Edit
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(task.id);
                onClose();
              }}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
