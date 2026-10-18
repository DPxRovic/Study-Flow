/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, Send, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { ReflectionJournalEntry } from '../../types';

interface StudyReflectionSectionProps {
  journalEntries: ReflectionJournalEntry[];
  onAddEntry: (entry: {
    content: string;
    weekLabel?: string;
    rating?: 'balanced' | 'challenging' | 'overloaded';
  }) => void;
}

export function StudyReflectionSection({
  journalEntries,
  onAddEntry,
}: StudyReflectionSectionProps) {
  const [reflectionNote, setReflectionNote] = useState('');
  const [rating, setRating] = useState<'balanced' | 'challenging' | 'overloaded'>('balanced');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionNote.trim()) return;

    setIsSubmitting(true);
    onAddEntry({
      content: reflectionNote.trim(),
      weekLabel: 'Week 7 Mid-Term Check',
      rating,
    });
    setReflectionNote('');
    setIsSubmitting(false);
  };

  return (
    <div className="surface-base rounded-2xl p-5 sm:p-6 shadow-2xs border border-slate-200/90 space-y-5">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sky-600" />
          <span>Weekly Qualitative Reflection Journal</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Grounded self-assessment: What study environments and habits worked this week? Where did cognitive fatigue occur?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <textarea
          rows={3}
          value={reflectionNote}
          onChange={(e) => setReflectionNote(e.target.value)}
          placeholder="e.g. Afternoon focus blocks in the science library were free from distraction; CS AVL trees took 45 minutes longer than estimated, but early MATH problem set prep prevented late-night cramming..."
          className="w-full p-3.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium placeholder:text-slate-400"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Week Pacing Experience Rating */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">Week Experience:</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setRating('balanced')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  rating === 'balanced'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() => setRating('challenging')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  rating === 'challenging'
                    ? 'bg-white text-sky-850 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Challenging
              </button>
              <button
                type="button"
                onClick={() => setRating('overloaded')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  rating === 'overloaded'
                    ? 'bg-white text-rose-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Overloaded
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={!reflectionNote.trim() || isSubmitting}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Save Reflection Entry
          </Button>
        </div>
      </form>

      {/* Historical Entries */}
      {journalEntries.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Past Weekly Reflections
          </div>

          <div className="space-y-2.5">
            {journalEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800">
                      {entry.weekLabel}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-500 font-medium">{entry.date}</span>
                  </div>

                  {entry.rating && (
                    <span
                      className={`text-[11px] font-bold ${
                        entry.rating === 'balanced'
                          ? 'text-emerald-700'
                          : entry.rating === 'challenging'
                          ? 'text-sky-850'
                          : 'text-rose-700'
                      }`}
                    >
                      {entry.rating.charAt(0).toUpperCase() + entry.rating.slice(1)} Pacing
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
