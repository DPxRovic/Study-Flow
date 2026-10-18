/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Subject, Task } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge, PriorityBadge } from '../ui/Badge';
import {
  BookOpen,
  User,
  MapPin,
  Clock,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  ExternalLink,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { SUBJECT_CATEGORY_STYLES } from '../../theme/tokens';

interface SubjectDetailModalProps {
  subject: Subject | null;
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (subject: Subject) => void;
  onDelete: (subjectId: string) => void;
  onAddTaskForSubject: (subjectId: string) => void;
  onSelectTask: (task: Task) => void;
}

export function SubjectDetailModal({
  subject,
  tasks,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onAddTaskForSubject,
  onSelectTask,
}: SubjectDetailModalProps) {
  if (!subject) return null;

  const style = SUBJECT_CATEGORY_STYLES[subject.colorKey];
  const subjectTasks = tasks.filter((t) => t.subjectId === subject.id);
  const activeTasks = subjectTasks.filter((t) => t.status !== 'completed');
  const completedTasks = subjectTasks.filter((t) => t.status === 'completed');

  const totalEstimated = subjectTasks.reduce((acc, t) => acc + t.estimatedHours, 0);
  const totalRemaining = activeTasks.reduce((acc, t) => acc + t.remainingHours, 0);
  const totalCompleted = totalEstimated - totalRemaining;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${subject.code}: ${subject.name}`}
      description="Course syllabus overview, active assignments, and weekly study target."
      maxWidth="lg"
      icon={<BookOpen className="w-4 h-4" />}
    >
      <div className="space-y-5 pt-1">
        {/* Banner with Course Category */}
        <div
          className="p-4 rounded-xl surface-binder border flex flex-wrap items-center justify-between gap-3 border-l-4"
          style={{ borderLeftColor: style.dot }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="subject" category={subject.colorKey}>
                {subject.code}
              </Badge>
              <span className="text-xs font-mono font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-slate-200/60">
                {subject.credits} Credit Hours
              </span>
            </div>
            <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 pt-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Instructor: {subject.instructor}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Weekly Target
            </div>
            <div className="text-lg font-extrabold font-mono tabular-nums text-slate-900">
              {subject.weeklyTargetHours}h / wk
            </div>
          </div>
        </div>

        {/* Course Logistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 surface-inset rounded-xl border border-slate-200/80 flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Classroom Location
              </div>
              <div className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                {subject.classroom || 'Main Quad Lecture Hall'}
              </div>
            </div>
          </div>

          <div className="p-3 surface-inset rounded-xl border border-slate-200/80 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-cyan-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Office Hours
              </div>
              <div className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                {subject.officeHours || 'By appointment with Professor'}
              </div>
            </div>
          </div>
        </div>

        {/* External Syllabus Link (if provided) */}
        {subject.syllabusUrl && (
          <div className="p-3 surface-base rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <ExternalLink className="w-4 h-4 text-sky-600" />
              <span>Course Portal / Syllabus URL:</span>
            </div>
            <a
              href={subject.syllabusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline truncate max-w-xs"
            >
              {subject.syllabusUrl}
            </a>
          </div>
        )}

        {/* Deliverables Summary Stat Row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2.5 surface-inset rounded-xl border border-slate-200/80">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Active Tasks
            </div>
            <div className="text-base font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
              {activeTasks.length}
            </div>
          </div>

          <div className="p-2.5 surface-inset rounded-xl border border-slate-200/80">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Hours Remaining
            </div>
            <div className="text-base font-extrabold font-mono tabular-nums text-sky-850 mt-0.5">
              {totalRemaining.toFixed(1)}h
            </div>
          </div>

          <div className="p-2.5 surface-inset rounded-xl border border-slate-200/80">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Finished Tasks
            </div>
            <div className="text-base font-extrabold font-mono tabular-nums text-emerald-700 mt-0.5">
              {completedTasks.length}
            </div>
          </div>
        </div>

        {/* Course Deliverables Work Queue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Course Work Queue ({subjectTasks.length})
            </h4>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onAddTaskForSubject(subject.id);
                onClose();
              }}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Assignment
            </Button>
          </div>

          {subjectTasks.length === 0 ? (
            <div className="p-6 text-center surface-inset rounded-xl border border-slate-200/80 text-xs text-slate-500">
              No assignments or milestones recorded for this course yet.
            </div>
          ) : (
            <div className="surface-inset rounded-xl border border-slate-200/80 divide-y divide-slate-100 max-h-52 overflow-y-auto">
              {subjectTasks.map((t) => {
                const isDone = t.status === 'completed';
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTask(t);
                      onClose();
                    }}
                    className="w-full text-left p-3 hover:bg-white transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div
                        className={`text-xs font-bold truncate ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {t.title}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Due {new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        <PriorityBadge priority={t.priority} size="xs" />
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs tabular-nums font-bold text-sky-850">
                        {isDone ? 'Done' : `${t.remainingHours.toFixed(1)}h left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onDelete(subject.id);
              onClose();
            }}
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Drop Course
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onEdit(subject);
                onClose();
              }}
              icon={<Edit2 className="w-3.5 h-3.5" />}
            >
              Edit Course Details
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
