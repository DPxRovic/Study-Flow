/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SubjectCategory, TaskPriority } from '../types';

export const THEME_COLORS = {
  canvas: '#f8fafc',
  surface: '#ffffff',
  surfaceSubtle: '#f1f5f9',
  surfaceHover: '#e2e8f0',
  borderSubtle: '#e2e8f0',
  borderStrong: '#cbd5e1',
  
  inkPrimary: '#0f172a',
  inkSecondary: '#475569',
  inkTertiary: '#94a3b8',
  
  bluePrimary: '#0284c7', // Sky 600
  blueHover: '#0369a1',   // Sky 700
  blueWash: '#e0f2fe',    // Sky 100
  cyanAccent: '#06b6d4',  // Cyan 500
  
  emeraldSuccess: '#10b981', // Emerald 500
  emeraldWash: '#ecfdf5',
  
  amberAlert: '#f59e0b',  // Amber 500
  amberWash: '#fffbeb',
  
  roseAlert: '#f43f5e',   // Rose 500
  roseWash: '#fff1f2',
} as const;

/**
 * Subject category color tokens: vibrant, friendly, high-contrast academic colors
 * Inspired by student planners where each course has an energetic, distinct color identity.
 */
export const SUBJECT_CATEGORY_STYLES: Record<
  SubjectCategory,
  {
    label: string;
    bgWash: string;
    text: string;
    border: string;
    dot: string;
    accentBar: string;
    badgeBg: string;
  }
> = {
  cs: {
    label: 'Computer Science',
    bgWash: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500',
    accentBar: 'bg-cyan-500',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  stem: {
    label: 'Mathematics & Engineering',
    bgWash: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-600',
    accentBar: 'bg-blue-600',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  science: {
    label: 'Natural Sciences',
    bgWash: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    accentBar: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  humanities: {
    label: 'Humanities & Literature',
    bgWash: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    accentBar: 'bg-amber-500',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  social: {
    label: 'Social Sciences',
    bgWash: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    accentBar: 'bg-orange-500',
    badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  arts: {
    label: 'Arts & Electives',
    bgWash: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    accentBar: 'bg-purple-500',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
  },
};

/**
 * Task priority color tokens using the StudyFlow color system:
 * - Urgent & High: Rose (high alert / urgent focus)
 * - Medium: Amber (moderate pacing / upcoming deliverable)
 * - Low: Emerald (calm / steady progress)
 */
export const TASK_PRIORITY_STYLES: Record<
  TaskPriority,
  {
    label: string;
    bgWash: string;
    text: string;
    border: string;
    dot: string;
    badgeBg: string;
    ringColor: string;
  }
> = {
  urgent: {
    label: 'Urgent',
    bgWash: 'bg-rose-100',
    text: 'text-rose-900',
    border: 'border-rose-300',
    dot: 'bg-rose-600',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    ringColor: 'focus:ring-rose-400',
  },
  high: {
    label: 'High',
    bgWash: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    ringColor: 'focus:ring-rose-400',
  },
  medium: {
    label: 'Medium',
    bgWash: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    ringColor: 'focus:ring-amber-400',
  },
  low: {
    label: 'Low',
    bgWash: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    ringColor: 'focus:ring-emerald-400',
  },
};

/**
 * Button styles: polished, confident, friendly with subtle active depth.
 */
export const BUTTON_STYLES = {
  primary:
    'inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg transition-all shadow-sm hover:shadow active:scale-[0.99] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 cursor-pointer',
  secondary:
    'inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg transition-all shadow-2xs whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20 cursor-pointer',
  ghost:
    'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none cursor-pointer',
  destructive:
    'inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none cursor-pointer',
} as const;

/**
 * Input and form control styles.
 */
export const INPUT_STYLES = {
  base: 'w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-colors',
  compact:
    'w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-colors',
  label: 'block text-xs font-semibold text-slate-800 mb-1.5',
  helper: 'text-xs text-slate-500 mt-1',
  error: 'text-xs text-rose-600 mt-1 flex items-center gap-1',
} as const;
