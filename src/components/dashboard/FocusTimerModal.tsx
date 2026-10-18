/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  BookOpen,
  Check,
  Coffee,
  X,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ScheduledSession, Task, Subject } from '../../types';
import { SUBJECT_CATEGORY_STYLES } from '../../theme/tokens';
import { useToast } from '../../context/ToastContext';

interface FocusTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ScheduledSession | null;
  task: Task | null;
  subject: Subject | null;
  onCompleteSession: (sessionId: string) => void;
}

export function FocusTimerModal({
  isOpen,
  onClose,
  session,
  task,
  subject,
  onCompleteSession,
}: FocusTimerModalProps) {
  const { showToast } = useToast();

  const initialDurationMinutes = session?.durationMinutes || 45;
  const [selectedMinutes, setSelectedMinutes] = useState(initialDurationMinutes);
  const [secondsRemaining, setSecondsRemaining] = useState(initialDurationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [subtasks, setSubtasks] = useState<Array<{ id: string; title: string; completed: boolean }>>(
    task?.subtasks || []
  );

  // Sync when session changes
  useEffect(() => {
    if (session) {
      const mins = session.durationMinutes || 45;
      setSelectedMinutes(mins);
      setSecondsRemaining(mins * 60);
      setIsRunning(false);
      setSubtasks(task?.subtasks || []);
    }
  }, [session, task]);

  // Timer countdown interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isRunning) {
      setIsRunning(false);
      showToast('Study session completed! Great focus session.', 'success');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsRemaining, showToast]);

  const handleSelectMinutes = (mins: number) => {
    setSelectedMinutes(mins);
    setSecondsRemaining(mins * 60);
    setIsRunning(false);
  };

  const toggleSubtask = (subId: string) => {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === subId ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleCompleteAndLog = () => {
    if (session) {
      onCompleteSession(session.id);
      showToast(
        `Logged ${Math.round((selectedMinutes * 60 - secondsRemaining) / 60) || selectedMinutes} minutes for ${subject?.code || 'course'}`,
        'success'
      );
    }
    onClose();
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const totalSeconds = selectedMinutes * 60;
  const progressPercent = Math.min(100, Math.round(((totalSeconds - secondsRemaining) / totalSeconds) * 100));

  const category = subject?.colorKey || 'cs';
  const style = SUBJECT_CATEGORY_STYLES[category] || SUBJECT_CATEGORY_STYLES.cs;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Active Focus Session"
      description="Calm, single-task study block with anti-fatigue tracking."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Deliverable Header Ribbon */}
        <div className="p-4 rounded-2xl surface-inset border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
              <span className="font-extrabold text-xs text-slate-900">{subject?.code}</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-600 font-medium truncate">{subject?.name}</span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
              {task?.title || 'Focused study block'}
            </h3>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 self-start sm:self-auto">
            {[25, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleSelectMinutes(mins)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                  selectedMinutes === mins
                    ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Central Tactical Countdown Display */}
        <div className="p-6 sm:p-8 rounded-3xl surface-focal border border-slate-800 text-center space-y-5">
          <div className="space-y-1">
            <span className="text-[11px] font-mono tracking-widest text-sky-300 uppercase font-bold">
              {isRunning ? 'Session in Progress' : secondsRemaining === 0 ? 'Session Complete' : 'Ready to Focus'}
            </span>
            <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white tabular-nums">
              {formattedTime}
            </div>
          </div>

          {/* Progress gauge track */}
          <div className="max-w-xs mx-auto w-full h-2 rounded-full bg-slate-800/80 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Timer Action Controls */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-3 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  : 'bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-slate-950 font-black'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Timer</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{secondsRemaining < totalSeconds ? 'Resume Focus' : 'Start Focus Session'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setSecondsRemaining(selectedMinutes * 60);
              }}
              className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reset timer"
              aria-label="Reset timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Deliverable Subtask Checklist */}
        {subtasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Session Milestones ({subtasks.filter((s) => s.completed).length}/{subtasks.length})</span>
              <span className="text-[11px] text-slate-400 font-medium">Check off as you finish</span>
            </div>
            <div className="divide-y divide-slate-100 rounded-xl surface-base overflow-hidden">
              {subtasks.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => toggleSubtask(st.id)}
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      st.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 group-hover:border-sky-500 bg-white'
                    }`}
                  >
                    {st.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
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

        {/* Notes Reminder */}
        {task?.notes && (
          <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/70 text-xs text-sky-900 space-y-1">
            <span className="font-bold text-sky-950 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-600" />
              <span>Session Notes:</span>
            </span>
            <p className="text-slate-700 font-medium leading-relaxed">{task.notes}</p>
          </div>
        )}

        {/* Footer CTAs */}
        <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Minimize / Close
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleCompleteAndLog}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            Complete & Log Session
          </Button>
        </div>
      </div>
    </Modal>
  );
}
