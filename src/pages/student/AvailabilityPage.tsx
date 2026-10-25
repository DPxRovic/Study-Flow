/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  ShieldAlert,
  BookOpen,
  GraduationCap,
  Briefcase,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Coffee,
  RotateCcw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { usePlanner } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AvailabilitySlot, SlotType } from '../../types';
import { AvailabilitySlotModal } from '../../components/availability/AvailabilitySlotModal';
import { StudyPreferencesCard } from '../../components/availability/StudyPreferencesCard';
import {
  DAYS_OF_WEEK,
  formatDuration,
  parseTimeToMinutes,
  calculateHours,
} from '../../utils/timeValidation';

export function AvailabilityPage() {
  const {
    availability,
    addAvailabilitySlot,
    updateAvailabilitySlot,
    deleteAvailabilitySlot,
    updateAvailabilitySlots,
  } = usePlanner();

  const { user } = useAuth();
  const { showToast } = useToast();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [defaultDay, setDefaultDay] = useState<number>(1);

  // Mobile selected day (defaults to Monday = 1)
  const [mobileSelectedDay, setMobileSelectedDay] = useState<number>(1);

  // Preferences drawer toggle
  const [showPreferences, setShowPreferences] = useState(false);

  // Group slots by day of week sorted chronologically
  const slotsByDay = useMemo(() => {
    const map: Record<number, AvailabilitySlot[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    availability.forEach((slot) => {
      if (map[slot.dayOfWeek]) {
        map[slot.dayOfWeek].push(slot);
      }
    });

    // Sort each day chronologically
    Object.keys(map).forEach((dayKey) => {
      const day = Number(dayKey);
      map[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return map;
  }, [availability]);

  // Weekly aggregate metrics
  const metrics = useMemo(() => {
    let totalStudyMinutes = 0;
    let totalCommittedMinutes = 0;
    let studySlotsCount = 0;

    availability.forEach((slot) => {
      const startMin = parseTimeToMinutes(slot.startTime);
      const endMin = parseTimeToMinutes(slot.endTime);
      const duration = Math.max(0, endMin - startMin);

      if (slot.type === 'preferred_study') {
        totalStudyMinutes += duration;
        studySlotsCount += 1;
      } else {
        totalCommittedMinutes += duration;
      }
    });

    const studyHours = totalStudyMinutes / 60;
    const committedHours = totalCommittedMinutes / 60;
    const dailyStudyCap = user?.targetDailyStudyCapHours || 5.5;
    const weeklyCapMax = dailyStudyCap * 7;
    const isWithinHealthyLimits = studyHours <= weeklyCapMax;

    return {
      studyHours,
      committedHours,
      studySlotsCount,
      dailyStudyCap,
      weeklyCapMax,
      isWithinHealthyLimits,
      avgDailyStudyHours: studyHours / 7,
    };
  }, [availability, user]);

  const handleOpenAdd = (dayId = 1) => {
    setEditingSlot(null);
    setDefaultDay(dayId);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (slot: AvailabilitySlot) => {
    setEditingSlot(slot);
    setDefaultDay(slot.dayOfWeek);
    setIsModalOpen(true);
  };

  const handleSaveSlot = (slotData: Omit<AvailabilitySlot, 'id'>, id?: string) => {
    if (id) {
      updateAvailabilitySlot(id, slotData);
    } else {
      addAvailabilitySlot(slotData);
    }
  };

  const handleDeleteSlot = (id: string) => {
    if (!window.confirm('Delete this weekly time window? This cannot be undone.')) return;
    deleteAvailabilitySlot(id);
  };

  // Helper to get category visual tokens
  const getCategoryTheme = (type: SlotType) => {
    switch (type) {
      case 'preferred_study':
        return {
          label: 'Study Window',
          icon: BookOpen,
          badgeColor: 'bg-sky-100 text-sky-900 border-sky-300',
          cardStyle:
            'bg-sky-50/70 border-sky-200 text-sky-950 border-l-4 border-l-sky-600 hover:border-sky-300',
        };
      case 'class':
        return {
          label: 'Class Lecture',
          icon: GraduationCap,
          badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
          cardStyle:
            'bg-blue-50/60 border-blue-200 text-blue-950 border-l-4 border-l-blue-600 hover:border-blue-300',
        };
      case 'work':
        return {
          label: 'Job Shift',
          icon: Briefcase,
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
          cardStyle:
            'bg-amber-50/60 border-amber-200 text-amber-950 border-l-4 border-l-amber-500 hover:border-amber-300',
        };
      case 'personal':
      default:
        return {
          label: 'Personal Block',
          icon: UserIcon,
          badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
          cardStyle:
            'bg-purple-50/60 border-purple-200 text-purple-950 border-l-4 border-l-purple-500 hover:border-purple-300',
        };
    }
  };

  // Calculate gaps between consecutive slots in minutes
  const getGapsForDay = (slots: AvailabilitySlot[]) => {
    const gaps: Array<{
      afterSlotId: string;
      minutes: number;
      startTime: string;
      endTime: string;
    }> = [];

    for (let i = 0; i < slots.length - 1; i++) {
      const currentEnd = parseTimeToMinutes(slots[i].endTime);
      const nextStart = parseTimeToMinutes(slots[i + 1].startTime);
      if (nextStart > currentEnd) {
        gaps.push({
          afterSlotId: slots[i].id,
          minutes: nextStart - currentEnd,
          startTime: slots[i].endTime,
          endTime: slots[i + 1].startTime,
        });
      }
    }
    return gaps;
  };

  return (
    <div className="space-y-7 max-w-[1440px] w-full pb-14 font-sans">
      {/* =========================================================================
          1. HEADER & ACTIONS
         ========================================================================= */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-sky-850 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>Weekly Availability & Time Grid</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Availability & Study Rhythm
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium leading-relaxed">
            Map out class lecture hours, campus work commitments, and designated focus blocks across Monday through Sunday.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            onClick={() => setShowPreferences(!showPreferences)}
            icon={<Sliders className="w-4 h-4 text-slate-600" />}
          >
            {showPreferences ? 'Hide Preferences' : 'Study Preferences'}
          </Button>

          <Button
            variant="primary"
            onClick={() => handleOpenAdd(1)}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Time Window
          </Button>
        </div>
      </div>

      {/* =========================================================================
          2. WEEKLY SUMMARY STATS & BURNOUT SAFEGUARD BAR
         ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Open Study Capacity */}
        <div className="surface-base rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Weekly Study Windows</span>
            <BookOpen className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-sky-850 tabular-nums">
            {metrics.studyHours.toFixed(1)} hrs
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {metrics.studySlotsCount} designated focus {metrics.studySlotsCount === 1 ? 'block' : 'blocks'}
          </div>
        </div>

        {/* Fixed Commitments */}
        <div className="surface-base rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Class & Job Shifts</span>
            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900 tabular-nums">
            {metrics.committedHours.toFixed(1)} hrs
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Lectures, labs & campus work
          </div>
        </div>

        {/* Burnout Cap Safeguard */}
        <div className="surface-base rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Daily Cap Safeguard</span>
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-emerald-800 tabular-nums">
            {metrics.dailyStudyCap.toFixed(1)} hrs/day
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Strict threshold prevents fatigue
          </div>
        </div>

        {/* Capacity Balance Ratio */}
        <div className="surface-base rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Weekly Rhythm Balance</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900 tabular-nums">
            {metrics.avgDailyStudyHours.toFixed(1)} hrs/day
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {metrics.isWithinHealthyLimits ? 'Healthy Study Distribution' : 'Overload Warning'}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. STUDY PREFERENCES CARD (COLLAPSIBLE / TOGGLEABLE)
         ========================================================================= */}
      {showPreferences && (
        <div className="animate-in fade-in duration-200">
          <StudyPreferencesCard />
        </div>
      )}

      {availability.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-7 h-7 text-sky-600" />}
          title="Set your weekly availability"
          description="Add class times, work or personal commitments, and at least one preferred study window so StudyFlow can build a realistic schedule."
          actionLabel="Add Your First Time Window"
          onAction={() => handleOpenAdd(new Date().getDay())}
          className="max-w-2xl"
        />
      ) : (
      <>
      {/* =========================================================================
          4. INTENTIONAL MOBILE DAY-BY-DAY VIEW (< md screens)
         ========================================================================= */}
      <div className="block md:hidden space-y-4">
        {/* Mobile Day Selector Bar */}
        <div className="surface-base rounded-2xl p-3 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Day
            </span>
            <span className="text-xs text-sky-850 font-bold font-mono">
              {DAYS_OF_WEEK.find((d) => d.id === mobileSelectedDay)?.name}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = mobileSelectedDay === day.id;
              const daySlots = slotsByDay[day.id] || [];
              const studyHours = daySlots
                .filter((s) => s.type === 'preferred_study')
                .reduce((acc, s) => acc + calculateHours(s.startTime, s.endTime), 0);

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setMobileSelectedDay(day.id)}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-xs font-extrabold ring-2 ring-sky-300'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold'
                  }`}
                >
                  <div className="text-[11px]">{day.short.slice(0, 2)}</div>
                  <div
                    className={`text-[9px] font-mono tabular-nums mt-0.5 ${
                      isSelected ? 'text-sky-100 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {studyHours > 0 ? `${studyHours.toFixed(1)}h` : '—'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda View */}
        {(() => {
          const selectedDayObj = DAYS_OF_WEEK.find((d) => d.id === mobileSelectedDay)!;
          const daySlots = slotsByDay[mobileSelectedDay] || [];
          const dayGaps = getGapsForDay(daySlots);
          const totalStudy = daySlots
            .filter((s) => s.type === 'preferred_study')
            .reduce((acc, s) => acc + calculateHours(s.startTime, s.endTime), 0);

          return (
            <div className="surface-base rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedDayObj.name} Schedule
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    {totalStudy.toFixed(1)} hrs study open · {daySlots.length} commitments
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleOpenAdd(mobileSelectedDay)}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Block
                </Button>
              </div>

              {daySlots.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-700">No time windows scheduled</div>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Add lecture hours or open focus blocks for {selectedDayObj.name} to guide automated study planning.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenAdd(mobileSelectedDay)}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add {selectedDayObj.short} Window
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {daySlots.map((slot, idx) => {
                    const theme = getCategoryTheme(slot.type);
                    const Icon = theme.icon;
                    const durationMins =
                      parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime);
                    const matchingGap = dayGaps.find((g) => g.afterSlotId === slot.id);

                    return (
                      <React.Fragment key={slot.id}>
                        <div
                          className={`p-3.5 rounded-xl border transition-all ${theme.cardStyle}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${theme.badgeColor}`}
                              >
                                {theme.label}
                              </span>
                              <span className="font-mono text-xs font-extrabold tabular-nums">
                                {slot.startTime} – {slot.endTime}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(slot)}
                                className="p-1 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
                                aria-label="Edit window"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
                                aria-label="Delete window"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-1.5 flex items-center justify-between">
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {slot.label || theme.label}
                            </div>
                            <span className="text-[11px] font-mono font-semibold text-slate-500">
                              {formatDuration(durationMins)}
                            </span>
                          </div>
                        </div>

                        {/* Interstitial Free Gap Indicator */}
                        {matchingGap && matchingGap.minutes >= 30 && (
                          <div className="py-1 px-3 border border-dashed border-slate-200/90 rounded-lg bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Coffee className="w-3 h-3 text-amber-600" />
                              <span>Free Time Interval</span>
                            </span>
                            <span className="font-mono font-semibold text-slate-600">
                              {formatDuration(matchingGap.minutes)} open ({matchingGap.startTime} – {matchingGap.endTime})
                            </span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* =========================================================================
          5. DESKTOP 7-DAY WEEKLY TIME ARCHITECTURE GRID (md+ screens)
         ========================================================================= */}
      <div className="hidden md:block space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>Recurring 7-Day Weekly Grid</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
              <span>Study Focus</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Class Lecture</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Job Shift</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>Personal</span>
            </div>
          </div>
        </div>

        {/* 7-Column Visual Grid */}
        <div className="grid grid-cols-7 gap-3">
          {DAYS_OF_WEEK.map((day) => {
            const daySlots = slotsByDay[day.id] || [];
            const dayGaps = getGapsForDay(daySlots);
            const totalStudy = daySlots
              .filter((s) => s.type === 'preferred_study')
              .reduce((acc, s) => acc + calculateHours(s.startTime, s.endTime), 0);

            return (
              <div
                key={day.id}
                className="surface-base rounded-2xl p-3 flex flex-col justify-between min-h-[360px] border border-slate-200/90 shadow-2xs space-y-3"
              >
                {/* Column Day Header */}
                <div className="border-b border-slate-100 pb-2.5 flex items-start justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">{day.name}</div>
                    <div className="text-[11px] font-mono tabular-nums text-sky-850 font-bold">
                      {totalStudy > 0 ? `${totalStudy.toFixed(1)}h open` : '0h study'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAdd(day.id)}
                    className="p-1 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
                    title={`Add time block for ${day.name}`}
                    aria-label={`Add time block for ${day.name}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day Blocks List with Chronological Relationship */}
                <div className="space-y-2 flex-1">
                  {daySlots.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-12 text-center flex flex-col items-center gap-1.5">
                      <span>No blocks</span>
                      <button
                        type="button"
                        onClick={() => handleOpenAdd(day.id)}
                        className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer"
                      >
                        + Add Window
                      </button>
                    </div>
                  ) : (
                    daySlots.map((slot) => {
                      const theme = getCategoryTheme(slot.type);
                      const Icon = theme.icon;
                      const durationMins =
                        parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime);
                      const matchingGap = dayGaps.find((g) => g.afterSlotId === slot.id);

                      return (
                        <React.Fragment key={slot.id}>
                          <div
                            onClick={() => handleOpenEdit(slot)}
                            className={`p-2.5 rounded-xl border text-xs relative group transition-all cursor-pointer ${theme.cardStyle}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono tabular-nums font-extrabold text-[11px]">
                                {slot.startTime} – {slot.endTime}
                              </span>

                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEdit(slot);
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-sky-600 transition-colors cursor-pointer"
                                  title="Edit slot"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSlot(slot.id);
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Delete slot"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="font-bold text-[11px] truncate mt-1 text-slate-900">
                              {slot.label || theme.label}
                            </div>

                            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                              <span className="truncate">{theme.label}</span>
                              <span className="font-mono font-semibold">
                                {formatDuration(durationMins)}
                              </span>
                            </div>
                          </div>

                          {/* Free Gap Indicator between commitments */}
                          {matchingGap && matchingGap.minutes >= 30 && (
                            <div className="py-1 px-1.5 border border-dashed border-slate-200/90 rounded-lg text-center text-[9px] font-mono font-medium text-slate-400 bg-slate-50/50">
                              ☕ {formatDuration(matchingGap.minutes)} free
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </div>

                {/* Day Footer Metric */}
                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium">
                  {daySlots.length} {daySlots.length === 1 ? 'block' : 'blocks'} configured
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}

      {/* =========================================================================
          6. ADD / EDIT TIME WINDOW MODAL
         ========================================================================= */}
      <AvailabilitySlotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialSlot={editingSlot}
        defaultDayOfWeek={defaultDay}
        existingSlots={availability}
        onSave={handleSaveSlot}
        onDelete={handleDeleteSlot}
      />
    </div>
  );
}
