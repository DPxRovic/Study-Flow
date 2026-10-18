/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Clock,
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  Edit2,
  Trash2,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { ScheduledSession, SessionStatus } from '../../types';
import { usePlanner } from '../../context/PlannerContext';
import { Badge, PriorityBadge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface SessionDetailModalProps {
  session: ScheduledSession | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (session: ScheduledSession) => void;
}

export function SessionDetailModal({
  session,
  isOpen,
  onClose,
  onEdit,
}: SessionDetailModalProps) {
  const {
    tasks,
    subjects,
    toggleSessionComplete,
    toggleSessionLock,
    setSessionStatus,
    deleteSession,
  } = usePlanner();

  if (!isOpen || !session) return null;

  const task = tasks.find((t) => t.id === session.taskId);
  const subject = subjects.find((s) => s.id === session.subjectId);
  const category = subject?.colorKey || 'cs';

  const status = session.status || (session.completed ? 'completed' : 'scheduled');

  const handleDelete = () => {
    if (confirm('Are you sure you want to remove this scheduled study block?')) {
      deleteSession(session.id);
      onClose();
    }
  };

  const handleStatusChange = (newStatus: SessionStatus) => {
    setSessionStatus(session.id, newStatus);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="surface-base rounded-2xl border border-slate-200/90 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <Badge variant="subject" category={category}>
              {subject?.code || 'COURSE'}
            </Badge>
            <span className="text-xs font-semibold text-slate-500">Study Session Detail</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Title & Subject */}
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
              {task?.title || 'Course Study Block'}
            </h2>
            <div className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>{subject?.name || 'Academic Subject'}</span>
              {task && (
                <>
                  <span className="text-slate-300">·</span>
                  <PriorityBadge priority={task.priority} size="xs" />
                </>
              )}
            </div>
          </div>

          {/* Time & Date Metric Tiles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>Date</span>
              </div>
              <div className="text-sm font-extrabold text-slate-900 font-mono">
                {session.date}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {new Date(`${session.date}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>Time Window</span>
              </div>
              <div className="text-sm font-extrabold text-slate-900 font-mono tabular-nums">
                {session.startTime} – {session.endTime}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {session.durationMinutes} minutes duration
              </div>
            </div>
          </div>

          {/* Status Segmented Controller */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Session Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('scheduled')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  status === 'scheduled'
                    ? 'bg-sky-50 border-sky-300 text-sky-900 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>Scheduled</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('completed')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  status === 'completed'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Done</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('missed')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  status === 'missed'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Missed</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('cancelled')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  status === 'cancelled'
                    ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Cancelled</span>
              </button>
            </div>
          </div>

          {/* Locked State Explanation Card */}
          <div
            className={`p-4 rounded-xl border transition-colors flex items-start gap-3.5 ${
              session.locked
                ? 'bg-amber-50/80 border-amber-200/90 text-amber-950'
                : 'bg-slate-50/80 border-slate-200/80 text-slate-700'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                session.locked
                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              {session.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900">
                  {session.locked ? 'Protected from Auto-Regeneration' : 'Flexible Auto-Schedule Block'}
                </span>
                <button
                  type="button"
                  onClick={() => toggleSessionLock(session.id)}
                  className={`text-xs font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition-colors ${
                    session.locked
                      ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {session.locked ? 'Unlock' : 'Lock Slot'}
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                {session.locked
                  ? 'This study slot is locked. The scheduling algorithm will strictly preserve it and will never move or overwrite it.'
                  : 'This slot can be adjusted or repacked during auto-generation. Lock it if you want to fix this exact time window.'}
              </p>
            </div>
          </div>

          {/* Notes / Plan */}
          {session.notes && (
            <div className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/40 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Session Objectives & Notes</span>
              </div>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                {session.notes}
              </p>
            </div>
          )}

          {/* Associated Deliverable info */}
          {task && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Target Deliverable Details
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Due Date:</span>
                <span className="font-mono font-bold text-slate-900">
                  {new Date(task.dueDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Remaining Hours:</span>
                <span className="font-mono font-bold text-slate-900">
                  {task.remainingHours.toFixed(1)}h of {task.estimatedHours.toFixed(1)}h
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(session);
              }}
              icon={<Edit2 className="w-3.5 h-3.5" />}
            >
              Edit Session
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                toggleSessionComplete(session.id);
                onClose();
              }}
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              {session.completed ? 'Mark Incomplete' : 'Complete Block'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
