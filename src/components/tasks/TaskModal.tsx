/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskType, Subject } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CheckSquare, Plus, Trash2, Clock, Calendar, AlertTriangle } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  taskToEdit?: Task | null;
  onSave: (taskData: Omit<Task, 'id'>, id?: string) => void;
}

export function TaskModal({
  isOpen,
  onClose,
  subjects,
  taskToEdit,
  onSave,
}: TaskModalProps) {
  const isEditing = !!taskToEdit;

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [estimatedHours, setEstimatedHours] = useState('2.5');
  const [remainingHours, setRemainingHours] = useState('2.5');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [type, setType] = useState<TaskType>('assignment');
  const [status, setStatus] = useState<Task['status']>('scheduled');
  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setSubjectId(taskToEdit.subjectId);
      
      const parsedDate = new Date(taskToEdit.dueDate);
      if (!isNaN(parsedDate.getTime())) {
        setDueDate(taskToEdit.dueDate.slice(0, 10));
        setDueTime(taskToEdit.dueDate.slice(11, 16) || '23:59');
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        setDueDate(d.toISOString().slice(0, 10));
        setDueTime('23:59');
      }

      setEstimatedHours(taskToEdit.estimatedHours.toString());
      setRemainingHours(taskToEdit.remainingHours.toString());
      setPriority(taskToEdit.priority);
      setType(taskToEdit.type);
      setStatus(taskToEdit.status);
      setNotes(taskToEdit.notes || '');
      setSubtasks(taskToEdit.subtasks ? [...taskToEdit.subtasks] : []);
    } else {
      // Default state for new task
      setTitle('');
      setSubjectId(subjects[0]?.id || '');
      const d = new Date();
      d.setDate(d.getDate() + 4);
      setDueDate(d.toISOString().slice(0, 10));
      setDueTime('23:59');
      setEstimatedHours('3.0');
      setRemainingHours('3.0');
      setPriority('medium');
      setType('assignment');
      setStatus('scheduled');
      setNotes('');
      setSubtasks([]);
    }
    setErrors({});
  }, [taskToEdit, isOpen, subjects]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = 'Assignment title is required.';
    }
    if (!subjectId) {
      errs.subjectId = 'Please select an enrolled subject.';
    }
    if (!dueDate) {
      errs.dueDate = 'Due date is required.';
    }
    const est = parseFloat(estimatedHours);
    if (isNaN(est) || est <= 0) {
      errs.estimatedHours = 'Estimated hours must be greater than 0.';
    } else if (est > 80) {
      errs.estimatedHours = 'Estimated hours cannot exceed 80h.';
    }
    const rem = parseFloat(remainingHours);
    if (isNaN(rem) || rem < 0) {
      errs.remainingHours = 'Remaining hours must be positive or 0.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const est = parseFloat(estimatedHours);
    const rem = parseFloat(remainingHours);
    const fullDueDate = `${dueDate}T${dueTime || '23:59'}:00`;

    const taskData: Omit<Task, 'id'> = {
      title: title.trim(),
      subjectId,
      dueDate: fullDueDate,
      estimatedHours: est,
      remainingHours: Math.min(rem, est),
      type,
      priority,
      status: rem === 0 ? 'completed' : status,
      notes: notes.trim() || undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    };

    onSave(taskData, taskToEdit ? taskToEdit.id : undefined);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Assignment / Task' : 'Add New Assignment'}
      description="Record syllabus deliverable requirements and estimated focus hours."
      maxWidth="lg"
      icon={<CheckSquare className="w-4 h-4" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Title */}
        <Input
          label="Assignment or Milestone Title"
          placeholder="e.g. Midterm 1 Problem Set Proofs"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
          }}
          error={errors.title}
          required
          autoFocus
        />

        {/* Subject & Task Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Associated Course"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              if (errors.subjectId) setErrors((prev) => ({ ...prev, subjectId: '' }));
            }}
            options={subjects.map((s) => ({
              label: `${s.code} · ${s.name}`,
              value: s.id,
            }))}
            error={errors.subjectId}
            required
          />

          <Select
            label="Deliverable Type"
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            options={[
              { label: 'Homework Assignment', value: 'assignment' },
              { label: 'Problem Set', value: 'problem_set' },
              { label: 'Paper / Essay', value: 'paper' },
              { label: 'Required Reading', value: 'reading' },
              { label: 'Exam Preparation', value: 'exam_prep' },
              { label: 'Project Milestone', value: 'project_milestone' },
            ]}
          />
        </div>

        {/* Due Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: '' }));
            }}
            error={errors.dueDate}
            required
          />

          <Input
            label="Deadline Time (Optional)"
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
        </div>

        {/* Estimated Hours, Remaining Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Est. Study Hours"
            type="number"
            step="0.5"
            min="0.5"
            max="80"
            value={estimatedHours}
            onChange={(e) => {
              setEstimatedHours(e.target.value);
              if (!isEditing) setRemainingHours(e.target.value);
              if (errors.estimatedHours) setErrors((prev) => ({ ...prev, estimatedHours: '' }));
            }}
            error={errors.estimatedHours}
            required
          />

          <Input
            label="Remaining Hours"
            type="number"
            step="0.5"
            min="0"
            max="80"
            value={remainingHours}
            onChange={(e) => {
              setRemainingHours(e.target.value);
              if (errors.remainingHours) setErrors((prev) => ({ ...prev, remainingHours: '' }));
            }}
            error={errors.remainingHours}
            required
          />
        </div>

        {/* Priority Selector with Visual Indicators */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-800">
            Priority Level (StudyFlow Color System)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                id: 'urgent' as const,
                label: 'Urgent',
                hint: 'Exam & Heavy',
                style: 'bg-rose-100 text-rose-900 border-rose-300',
                dot: 'bg-rose-600',
              },
              {
                id: 'high' as const,
                label: 'High Priority',
                hint: 'Rose indicator',
                style: 'bg-rose-50 text-rose-700 border-rose-200',
                dot: 'bg-rose-500',
              },
              {
                id: 'medium' as const,
                label: 'Medium Priority',
                hint: 'Amber indicator',
                style: 'bg-amber-50 text-amber-800 border-amber-200',
                dot: 'bg-amber-500',
              },
              {
                id: 'low' as const,
                label: 'Low Priority',
                hint: 'Emerald indicator',
                style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                dot: 'bg-emerald-500',
              },
            ].map((p) => {
              const isSelected = priority === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? `${p.style} ring-2 ring-sky-500/30 shadow-xs font-extrabold`
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`} />
                    <span>{p.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate pl-3">
                    {p.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status (if editing) */}
        {isEditing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Current Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Task['status'])}
              options={[
                { label: 'Scheduled / In Queue', value: 'scheduled' },
                { label: 'In Progress', value: 'in_progress' },
                { label: 'Backlog', value: 'backlog' },
                { label: 'Completed', value: 'completed' },
              ]}
            />
          </div>
        )}

        {/* Subtasks Checklist Builder */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-800">
            Subtask Checkpoints ({subtasks.length})
          </label>
          
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Read chapter 4, Outline intro..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
              className="flex-1 surface-inset px-3 py-1.5 text-xs rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddSubtask}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Subtask
            </Button>
          </div>

          {subtasks.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto surface-inset p-2.5 rounded-xl border border-slate-200/80">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/60"
                >
                  <span className={st.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                    {st.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-800">
            Syllabus Notes & Directives (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Submit on Gradescope by 11:59pm. Must show all calculus steps."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full surface-inset rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {isEditing ? 'Save Changes' : 'Create Assignment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
