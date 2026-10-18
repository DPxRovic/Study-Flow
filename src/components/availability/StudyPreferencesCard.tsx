/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  Coffee,
  Sun,
  Moon,
  Sunset,
  Compass,
  Save,
  Check,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui/Button';

const SESSION_LENGTHS = [
  { value: 25, label: '25 min', note: 'Pomodoro' },
  { value: 45, label: '45 min', note: 'Focused' },
  { value: 50, label: '50 min', note: 'College Std' },
  { value: 60, label: '60 min', note: 'Deep Work' },
  { value: 90, label: '90 min', note: 'Intensive' },
];

const BREAK_LENGTHS = [
  { value: 5, label: '5 min', note: 'Quick Reset' },
  { value: 10, label: '10 min', note: 'Standard' },
  { value: 15, label: '15 min', note: 'Restorative' },
  { value: 20, label: '20 min', note: 'Extended' },
];

const TIME_OF_DAY_OPTIONS = [
  {
    id: 'morning',
    label: 'Morning',
    timeSpan: '8:00 AM – 12:00 PM',
    icon: Sun,
    description: 'High cognitive energy before noon lectures',
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    timeSpan: '12:00 PM – 5:00 PM',
    icon: Sunset,
    description: 'Between campus classes and labs',
  },
  {
    id: 'evening',
    label: 'Evening',
    timeSpan: '5:00 PM – 10:00 PM',
    icon: Moon,
    description: 'Post-dinner quiet study and problem sets',
  },
  {
    id: 'flexible',
    label: 'Flexible',
    timeSpan: 'Any open window',
    icon: Compass,
    description: 'Even distribution across available time slots',
  },
];

export function StudyPreferencesCard() {
  const { user, updateUserPreferences } = useAuth();
  const { showToast } = useToast();

  const [dailyCap, setDailyCap] = useState(user?.targetDailyStudyCapHours || 5.5);
  const [sessionMinutes, setSessionMinutes] = useState(user?.defaultSessionMinutes || 50);
  const [breakMinutes, setBreakMinutes] = useState(user?.preferredBreakMinutes || 10);
  const [studyTime, setStudyTime] = useState<'morning' | 'afternoon' | 'evening' | 'flexible'>(
    user?.preferredStudyTime || 'afternoon'
  );
  const [bufferMinutes, setBufferMinutes] = useState(user?.bufferMinutes || 15);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Sync if user updates externally
  useEffect(() => {
    if (user) {
      if (user.targetDailyStudyCapHours) setDailyCap(user.targetDailyStudyCapHours);
      if (user.defaultSessionMinutes) setSessionMinutes(user.defaultSessionMinutes);
      if (user.preferredBreakMinutes) setBreakMinutes(user.preferredBreakMinutes);
      if (user.preferredStudyTime) setStudyTime(user.preferredStudyTime);
      if (user.bufferMinutes !== undefined) setBufferMinutes(user.bufferMinutes);
    }
  }, [user]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateUserPreferences({
      targetDailyStudyCapHours: dailyCap,
      defaultSessionMinutes: sessionMinutes,
      preferredBreakMinutes: breakMinutes,
      preferredStudyTime: studyTime,
      bufferMinutes,
    });
    showToast('Study & scheduling preferences saved', 'success');
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2500);
  };

  return (
    <div className="surface-base rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-sky-600" />
            <h2 className="text-base font-extrabold text-slate-900">
              Study Rhythm & Scheduling Preferences
            </h2>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            These parameters guide how the automated scheduler sizes study sessions, inserts pauses, and avoids burnout.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSave}
          icon={isSavedRecently ? <Check className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}
        >
          {isSavedRecently ? 'Preferences Saved' : 'Save Preferences'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Burnout Cap & Preferred Time of Day */}
        <div className="space-y-5">
          {/* Burnout Cap Slider */}
          <div className="surface-inset p-4 rounded-xl border border-slate-200/90 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Max Daily Study Cap (Safeguard)</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  The scheduler will strictly cap study sessions below this threshold in any 24-hour cycle.
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-base font-mono font-extrabold tabular-nums text-sky-850">
                  {dailyCap.toFixed(1)} hrs/day
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">Recommended: 4.5h–6.0h</div>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <input
                type="range"
                min="2.0"
                max="10.0"
                step="0.5"
                value={dailyCap}
                onChange={(e) => setDailyCap(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono font-semibold">
                <span>2.0 hrs (Light)</span>
                <span>5.5 hrs (Balanced)</span>
                <span>10.0 hrs (Exam Crunch)</span>
              </div>
            </div>
          </div>

          {/* Preferred Time of Day */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Preferred Study Time Window
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OF_DAY_OPTIONS.map((tod) => {
                const isSelected = studyTime === tod.id;
                const Icon = tod.icon;
                return (
                  <button
                    key={tod.id}
                    type="button"
                    onClick={() => setStudyTime(tod.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/80 ring-2 ring-sky-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-sky-600' : 'text-slate-500'}`} />
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                    </div>
                    <div className="text-xs font-bold text-slate-900">{tod.label}</div>
                    <div className="text-[10px] font-mono font-semibold text-slate-500">{tod.timeSpan}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Session Length, Break Duration, & Buffer */}
        <div className="space-y-5">
          {/* Preferred Session Length */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>Preferred Session Length</span>
              </label>
              <span className="text-xs font-mono font-bold text-sky-850">
                {sessionMinutes} mins
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {SESSION_LENGTHS.map((s) => {
                const isSelected = sessionMinutes === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSessionMinutes(s.value)}
                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/90 text-sky-950 ring-2 ring-sky-500/20 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="text-xs font-mono font-extrabold">{s.value}m</div>
                    <div className="text-[9px] text-slate-500 truncate">{s.note}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Break Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-amber-600" />
                <span>Break Duration Between Blocks</span>
              </label>
              <span className="text-xs font-mono font-bold text-amber-850">
                {breakMinutes} mins
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {BREAK_LENGTHS.map((b) => {
                const isSelected = breakMinutes === b.value;
                return (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setBreakMinutes(b.value)}
                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/90 text-amber-950 ring-2 ring-amber-500/20 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="text-xs font-mono font-extrabold">{b.value}m</div>
                    <div className="text-[9px] text-slate-500 truncate">{b.note}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class-to-Study Transition Buffer */}
          <div className="surface-inset p-3.5 rounded-xl border border-slate-200/90 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Post-Lecture Transition Buffer
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Buffer period after classes before scheduling a study session
              </div>
            </div>

            <div className="flex items-center gap-1">
              {[0, 10, 15, 30].map((buf) => (
                <button
                  key={buf}
                  type="button"
                  onClick={() => setBufferMinutes(buf)}
                  className={`px-2 py-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                    bufferMinutes === buf
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {buf}m
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
