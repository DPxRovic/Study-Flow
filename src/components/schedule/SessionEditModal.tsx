/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Calendar,
  Lock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { ScheduledSession, SessionStatus, Task } from '../../types';
import { usePlanner } from '../../context/PlannerContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { timeToMinutes, minutesToTime } from '../../utils/scheduleGenerator';
import { toLocalDateKey } from '../../utils/date';

export interface SessionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: ScheduledSession | null;
  session?: ScheduledSession | null;
  defaultDate?: string;
  initialDate?: string;
  defaultStartTime?: string;
  initialStartTime?: string;
  defaultTaskId?: string;
  initialTask?: Task;
}

export function SessionEditModal({
  isOpen,
  onClose,
  sessionToEdit,
  session,
  defaultDate,
  initialDate,
  defaultStartTime,
  initialStartTime,
  defaultTaskId,
  initialTask,
}: SessionEditModalProps) {
  const { tasks, subjects, addSession, updateSession, setSessionStatus } = usePlanner();

  const activeSession = sessionToEdit || session;
  const effectiveDate = initialDate || defaultDate || toLocalDateKey();
  const effectiveStartTime = initialStartTime || defaultStartTime || '14:00';
  const effectiveTaskId = initialTask?.id || defaultTaskId;

  const [subjectId, setSubjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [date, setDate] = useState(effectiveDate);
  const [startTime, setStartTime] = useState(effectiveStartTime);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [status, setStatus] = useState<SessionStatus>('scheduled');
  const [locked, setLocked] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeSession) {
      setSubjectId(activeSession.subjectId);
      setTaskId(activeSession.taskId);
      setDate(activeSession.date);
      setStartTime(activeSession.startTime);
      setDurationMinutes(activeSession.durationMinutes);
      setStatus(activeSession.status || (activeSession.completed ? 'completed' : 'scheduled'));
      setLocked(activeSession.locked || false);
      setNotes(activeSession.notes || '');
    } else {
      // New session defaults
      const targetTask = effectiveTaskId
        ? tasks.find((t) => t.id === effectiveTaskId)
        : tasks.find((t) => t.status !== 'completed');

      const initialSubId = targetTask ? targetTask.subjectId : subjects[0]?.id || '';
      setSubjectId(initialSubId);
      setTaskId(targetTask ? targetTask.id : '');
      setDate(effectiveDate);
      setStartTime(effectiveStartTime);
      setDurationMinutes(60);
      setStatus('scheduled');
      setLocked(false);
      setNotes('');
    }
    setErrors({});
  }, [activeSession, isOpen, effectiveDate, effectiveStartTime, effectiveTaskId, subjects, tasks]);

  if (!isOpen) return null;

  // Filter tasks for chosen subject
  const availableTasks = tasks.filter((t) =>
    subjectId ? t.subjectId === subjectId : true
  );

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSubId = e.target.value;
    setSubjectId(newSubId);
    const matchingTask = tasks.find((t) => t.subjectId === newSubId && t.status !== 'completed');
    if (matchingTask) {
      setTaskId(matchingTask.id);
    } else {
      setTaskId('');
    }
  };

  const calculateEndTime = () => {
    const startMins = timeToMinutes(startTime);
    const endMins = startMins + durationMinutes;
    return minutesToTime(endMins);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!subjectId) newErrors.subjectId = 'Please select a course.';
    if (!taskId) newErrors.taskId = 'Please select an assignment.';
    if (!date) newErrors.date = 'Date is required.';
    if (!startTime) newErrors.startTime = 'Start time is required.';
    if (durationMinutes < 15 || durationMinutes > 360) {
      newErrors.duration = 'Duration must be between 15 and 360 minutes.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const endTime = calculateEndTime();

    if (activeSession) {
      const updated = await updateSession(activeSession.id, {
        subjectId,
        taskId,
        date,
        startTime,
        endTime,
        durationMinutes,
        locked,
        notes: notes.trim(),
      });
      if (updated && updated.status !== status) {
        await setSessionStatus(activeSession.id, status);
      }
    } else {
      const created = await addSession({
        subjectId,
        taskId,
        date,
        startTime,
        endTime,
        durationMinutes,
        status,
        completed: status === 'completed',
        locked,
        notes: notes.trim(),
      });
      if (created && status !== 'scheduled') {
        await setSessionStatus(created.id, status);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="surface-base rounded-2xl border border-slate-200/90 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {activeSession ? 'Edit Scheduled Study Block' : 'Schedule New Study Block'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Allocate dedicated study hours for coursework.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        {subjects.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-700 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900">Create a course first</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Study sessions need an enrolled course and a task. Add your first course, then create an assignment or exam before scheduling a block.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={() => {
                  onClose();
                  window.location.assign('/subjects');
                }}
              >
                Add a Course
              </Button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Subject & Task */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Course / Subject <span className="text-rose-500">*</span>
              </label>
              <select
                value={subjectId}
                onChange={handleSubjectChange}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              >
                <option value="">Select course...</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} — {sub.name}
                  </option>
                ))}
              </select>
              {errors.subjectId && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.subjectId}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Target Task <span className="text-rose-500">*</span>
              </label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              >
                <option value="">Select assignment...</option>
                {availableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.remainingHours.toFixed(1)}h left)
                  </option>
                ))}
              </select>
              {errors.taskId && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.taskId}
                </p>
              )}
            </div>
          </div>

          {/* Date & Start Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              {errors.date && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.date}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              {errors.startTime && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.startTime}
                </p>
              )}
            </div>
          </div>

          {/* Duration Selector & Calculated End Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Session Duration
              </label>
              <span className="text-xs font-mono font-bold text-sky-700">
                Ends at {calculateEndTime()} ({durationMinutes}m)
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[30, 45, 60, 75, 90, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-2 px-1 rounded-xl border text-xs font-bold font-mono transition-all cursor-pointer ${
                    durationMinutes === mins
                      ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {mins === 45 ? '45m 🍅' : `${mins}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Locked Checkbox */}
          <div className="p-3.5 rounded-xl border border-amber-200/90 bg-amber-50/70 flex items-start gap-3">
            <input
              type="checkbox"
              id="lock-session"
              checked={locked}
              onChange={(e) => setLocked(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="lock-session" className="text-xs cursor-pointer select-none">
              <div className="font-extrabold text-amber-950 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Lock this session (Shield from Auto-Regeneration)</span>
              </div>
              <p className="text-[11px] text-amber-800 font-medium mt-0.5 leading-relaxed">
                When locked, auto-scheduling runs will strictly keep this study block untouched and will not overwrite or move it.
              </p>
            </label>
          </div>

          {/* Session Objectives & Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Objectives or Specific Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Complete problems 14 to 22, verify test cases..."
              rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none font-medium"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {activeSession ? 'Save Changes' : 'Schedule Study Block'}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
