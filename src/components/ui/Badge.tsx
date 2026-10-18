/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SubjectCategory, TaskPriority } from '../../types';
import { SUBJECT_CATEGORY_STYLES, TASK_PRIORITY_STYLES } from '../../theme/tokens';

export { PriorityBadge } from './PriorityBadge';

export interface BadgeProps {
  variant?: 'neutral' | 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'subject' | 'priority';
  category?: SubjectCategory;
  priority?: TaskPriority;
  children?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  variant = 'neutral',
  category = 'stem',
  priority = 'medium',
  children,
  size = 'sm',
  className = '',
}: BadgeProps) {
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  if (variant === 'priority') {
    const pStyle = TASK_PRIORITY_STYLES[priority] || TASK_PRIORITY_STYLES.medium;
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md font-bold tracking-tight border shadow-2xs ${sizeStyles} ${pStyle.bgWash} ${pStyle.text} ${pStyle.border} ${className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pStyle.dot}`} />
        <span>{children || pStyle.label}</span>
      </span>
    );
  }

  if (variant === 'subject') {
    const style = SUBJECT_CATEGORY_STYLES[category] || SUBJECT_CATEGORY_STYLES.stem;
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md font-semibold border ${sizeStyles} ${style.bgWash} ${style.text} ${style.border} ${className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span>{children}</span>
      </span>
    );
  }

  const variantStyles = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-semibold border ${sizeStyles} ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
}
