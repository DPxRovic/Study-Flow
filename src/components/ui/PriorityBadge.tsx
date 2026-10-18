/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TaskPriority } from '../../types';
import { TASK_PRIORITY_STYLES } from '../../theme/tokens';

export interface PriorityBadgeProps {
  priority: TaskPriority;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  showLabel?: boolean;
  showCode?: boolean;
  className?: string;
}

const PRIORITY_CODES: Record<TaskPriority, string> = {
  urgent: 'P1',
  high: 'P2',
  medium: 'P3',
  low: 'P4',
};

/**
 * Visual priority indicator component using the StudyFlow color system:
 * - Urgent & High: Rose (high alert)
 * - Medium: Amber (moderate focus)
 * - Low: Emerald (steady / low pressure)
 *
 * Designed for immediate visual scanning in assignment lists, deliverable queues, and detail panels.
 */
export function PriorityBadge({
  priority,
  size = 'sm',
  showDot = true,
  showLabel = true,
  showCode = false,
  className = '',
}: PriorityBadgeProps) {
  const style = TASK_PRIORITY_STYLES[priority] || TASK_PRIORITY_STYLES.medium;
  const code = PRIORITY_CODES[priority] || 'P3';

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[10px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  }[size];

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md font-mono font-extrabold uppercase tracking-wider border shadow-2xs whitespace-nowrap transition-colors ${sizeClasses} ${style.bgWash} ${style.text} ${style.border} ${className}`}
      title={`Priority level: ${code} - ${style.label}`}
      aria-label={`${code} ${style.label} Priority`}
    >
      {showDot && (
        <span
          className={`${dotSizes} rounded-full shrink-0 ${style.dot}`}
          aria-hidden="true"
        />
      )}
      {showCode && (
        <span className="font-mono font-black tabular-nums">{code}</span>
      )}
      {showCode && showLabel && (
        <span className="opacity-60 text-[9px]" aria-hidden="true">·</span>
      )}
      {showLabel && <span>{style.label}</span>}
    </span>
  );
}
