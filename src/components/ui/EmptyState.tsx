/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`p-8 bg-white surface-base rounded-2xl border border-slate-200/90 text-center max-w-lg mx-auto my-6 space-y-3 shadow-xs ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 mx-auto shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto font-medium">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button onClick={onAction} variant="primary">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
