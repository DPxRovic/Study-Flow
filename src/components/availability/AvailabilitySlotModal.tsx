/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  AlertTriangle,
  Trash2,
  BookOpen,
  GraduationCap,
  Briefcase,
  User as UserIcon,
  Check,
} from 'lucide-react';
import { AvailabilitySlot, SlotType } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  DAYS_OF_WEEK,
  validateSlot,
  formatDuration,
  parseTimeToMinutes,
  minutesToTimeString,
} from '../../utils/timeValidation';

interface AvailabilitySlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlot?: AvailabilitySlot | null;
  defaultDayOfWeek?: number;
  existingSlots: AvailabilitySlot[];
  onSave: (slotData: Omit<AvailabilitySlot, 'id'>, id?: string) => void;
  onDelete?: (id: string) => void;
}

const CATEGORIES: Array<{
  type: SlotType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClasses: string;
}> = [
  {
    type: 'preferred_study',
    label: 'Open Study Window',
    description: 'Reserved blocks for homework, reading, and problem sets',
    icon: BookOpen,
    colorClasses: 'border-sky-300 bg-sky-50/80 text-sky-950 peer-checked:border-sky-600 peer-checked:ring-sky-500',
  },
  {
    type: 'class',
    label: 'Class / Lecture',
    description: 'Fixed academic lectures, labs, or recitations',
    icon: GraduationCap,
    colorClasses: 'border-blue-300 bg-blue-50/80 text-blue-950 peer-checked:border-blue-600 peer-checked:ring-blue-500',
  },
  {
    type: 'work',
    label: 'Work / Campus Job',
    description: 'Student employment or lab assistant shifts',
    icon: Briefcase,
    colorClasses: 'border-amber-300 bg-amber-50/80 text-amber-950 peer-checked:border-amber-600 peer-checked:ring-amber-500',
  },
  {
    type: 'personal',
    label: 'Personal / Athletic',
    description: 'Extracurriculars, club sports, dining, or gym',
    icon: UserIcon,
    colorClasses: 'border-purple-300 bg-purple-50/80 text-purple-950 peer-checked:border-purple-600 peer-checked:ring-purple-500',
  },
];

const QUICK_DURATIONS = [
  { label: '+30m', mins: 30 },
  { label: '+45m', mins: 45 },
  { label: '+1 hr', mins: 60 },
  { label: '+1.5 hrs', mins: 90 },
  { label: '+2 hrs', mins: 120 },
  { label: '+3 hrs', mins: 180 },
];

export function AvailabilitySlotModal({
  isOpen,
  onClose,
  initialSlot,
  defaultDayOfWeek = 1,
  existingSlots,
  onSave,
  onDelete,
}: AvailabilitySlotModalProps) {
  const isEditing = !!initialSlot;

  const [dayOfWeek, setDayOfWeek] = useState<number>(defaultDayOfWeek);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [slotType, setSlotType] = useState<SlotType>('preferred_study');
  const [label, setLabel] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync state when opening or slot changes
  useEffect(() => {
    if (initialSlot) {
      setDayOfWeek(initialSlot.dayOfWeek);
      setStartTime(initialSlot.startTime);
      setEndTime(initialSlot.endTime);
      setSlotType(initialSlot.type);
      setLabel(initialSlot.label || '');
    } else {
      setDayOfWeek(defaultDayOfWeek);
      setStartTime('14:00');
      setEndTime('16:00');
      setSlotType('preferred_study');
      setLabel('');
    }
    setShowDeleteConfirm(false);
  }, [initialSlot, defaultDayOfWeek, isOpen]);

  // Live validation calculation
  const validation = useMemo(() => {
    return validateSlot(
      {
        dayOfWeek,
        startTime,
        endTime,
        id: initialSlot?.id,
        label,
      },
      existingSlots
    );
  }, [dayOfWeek, startTime, endTime, initialSlot?.id, label, existingSlots]);

  // Handle setting quick duration
  const applyQuickDuration = (minutesToAdd: number) => {
    const startMin = parseTimeToMinutes(startTime);
    if (startMin >= 0) {
      const newEndMin = Math.min(23 * 60 + 59, startMin + minutesToAdd);
      setEndTime(minutesToTimeString(newEndMin));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) return;

    onSave(
      {
        dayOfWeek: dayOfWeek as any,
        startTime,
        endTime,
        type: slotType,
        label: label.trim() || undefined,
      },
      initialSlot?.id
    );
    onClose();
  };

  const handleDelete = () => {
    if (initialSlot && onDelete) {
      onDelete(initialSlot.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Recurring Time Window' : 'Add Weekly Time Window'}
      description={
        isEditing
          ? 'Modify time bounds or category for this weekly commitment block.'
          : 'Define a recurring commitment or open study block to feed automated scheduling.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Day of Week Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Day of the Week
          </label>
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = dayOfWeek === day.id;
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setDayOfWeek(day.id)}
                  className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-xs scale-102 ring-2 ring-sky-300'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  <div className="hidden sm:block text-[11px] font-semibold">{day.short}</div>
                  <div className="sm:hidden text-xs">{day.short.slice(0, 2)}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Picker */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Block Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CATEGORIES.map((cat) => {
              const isSelected = slotType === cat.type;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.type}
                  type="button"
                  onClick={() => setSlotType(cat.type)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50/70 ring-2 ring-sky-500/20 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      isSelected
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{cat.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                      {cat.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Inputs & Quick Duration Adjusters */}
        <div className="p-4 rounded-xl surface-inset border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>Time Bounds</span>
            </span>

            {/* Live Duration readout */}
            {validation.durationMinutes > 0 && (
              <span className="text-xs font-mono font-bold text-sky-850 bg-sky-100/80 px-2 py-0.5 rounded-md">
                {formatDuration(validation.durationMinutes)} window
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          {/* Quick presets */}
          <div>
            <div className="text-[11px] text-slate-500 font-medium mb-1.5">
              Quick duration presets from start time:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DURATIONS.map((dur) => (
                <button
                  key={dur.label}
                  type="button"
                  onClick={() => applyQuickDuration(dur.mins)}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-200 hover:border-sky-400 hover:text-sky-600 text-slate-700 transition-colors cursor-pointer"
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Label / Description */}
        <Input
          label="Label / Activity Title"
          placeholder={
            slotType === 'preferred_study'
              ? 'e.g. Library 3rd Floor Quiet Focus'
              : slotType === 'class'
              ? 'e.g. CS 201 Algorithms Lecture'
              : slotType === 'work'
              ? 'e.g. Student Center Tutoring Shift'
              : 'e.g. Cross-Country Team Practice'
          }
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          helperText="Optional descriptive title for schedule calendar views"
        />

        {/* Validation Error / Warning Callout */}
        {!validation.isValid && validation.error && (
          <div className="p-3.5 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-900 flex items-start gap-3 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-rose-950">Invalid Time Window</div>
              <div className="text-rose-800 leading-relaxed font-medium">
                {validation.error}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Alert (if editing) */}
        {showDeleteConfirm && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start justify-between gap-3 animate-in fade-in">
            <div className="text-xs space-y-1">
              <div className="font-bold">Delete this time block?</div>
              <div className="text-amber-800">
                This recurring window will be permanently removed from your weekly schedule.
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Keep
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            {isEditing && !showDeleteConfirm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                className="text-rose-600 hover:bg-rose-50"
              >
                Remove Block
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!validation.isValid}
            >
              {isEditing ? 'Save Changes' : 'Add Time Window'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
