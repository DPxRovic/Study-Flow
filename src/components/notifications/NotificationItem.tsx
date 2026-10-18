/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Megaphone,
  Check,
  Eye,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AcademicNotification } from '../../types';

interface NotificationItemProps {
  notification: AcademicNotification;
  onToggleRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({
  notification,
  onToggleRead,
  onDelete,
}: NotificationItemProps) {
  // Category icon & styles
  const getCategoryMeta = () => {
    switch (notification.category) {
      case 'deadline':
        return {
          icon: <Clock className="w-4 h-4 text-amber-600" />,
          bg: 'bg-amber-50',
          border: 'border-amber-200/80',
          label: 'Academic Deadline',
        };
      case 'overdue':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
          bg: 'bg-rose-50',
          border: 'border-rose-200/80',
          label: 'Overdue Task',
        };
      case 'conflict':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
          bg: 'bg-rose-50',
          border: 'border-rose-200/80',
          label: 'Schedule Conflict',
        };
      case 'schedule':
        return {
          icon: <Calendar className="w-4 h-4 text-sky-600" />,
          bg: 'bg-sky-50',
          border: 'border-sky-200/80',
          label: 'Schedule Engine',
        };
      case 'task_completed':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          bg: 'bg-emerald-50',
          border: 'border-emerald-200/80',
          label: 'Workload Logged',
        };
      case 'announcement':
      default:
        return {
          icon: <Megaphone className="w-4 h-4 text-cyan-600" />,
          bg: 'bg-cyan-50',
          border: 'border-cyan-200/80',
          label: 'Campus Notice',
        };
    }
  };

  const meta = getCategoryMeta();

  // Format timestamp
  const formatTime = (ts: string) => {
    try {
      const date = new Date(ts);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 5) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      className={`p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
        notification.read
          ? 'bg-white opacity-85 hover:bg-slate-50/60'
          : 'bg-sky-50/25 border-l-3 border-l-sky-600 hover:bg-sky-50/40'
      }`}
    >
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        {/* Category Icon */}
        <div
          className={`p-2 rounded-xl shrink-0 mt-0.5 border ${meta.bg} ${meta.border}`}
          title={meta.label}
        >
          {meta.icon}
        </div>

        {/* Content Prose & Metadata */}
        <div className="space-y-1 min-w-0 flex-1">
          {/* Header row with unboxed metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-700">{meta.label}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{formatTime(notification.timestamp)}</span>
            {notification.priority === 'urgent' && (
              <>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-rose-700 font-bold">Urgent</span>
              </>
            )}
            {!notification.read && (
              <>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-sky-700 font-bold">New</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3
            className={`text-sm leading-snug ${
              notification.read
                ? 'font-bold text-slate-800'
                : 'font-extrabold text-slate-900'
            }`}
          >
            {notification.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {notification.description}
          </p>

          {/* Direct Action Link if present */}
          {notification.actionUrl && (
            <div className="pt-1.5">
              <Link
                to={notification.actionUrl}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline transition-colors"
              >
                <span>{notification.actionLabel || 'View Details'}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Row Actions */}
      <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-1 sm:pt-0">
        <button
          onClick={() => onToggleRead(notification.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-xs flex items-center gap-1 font-medium"
          title={notification.read ? 'Mark as unread' : 'Mark as read'}
          aria-label={notification.read ? 'Mark as unread' : 'Mark as read'}
        >
          {notification.read ? (
            <Eye className="w-4 h-4" />
          ) : (
            <Check className="w-4 h-4 text-emerald-600" />
          )}
        </button>

        <button
          onClick={() => onDelete(notification.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-xs"
          title="Delete notification"
          aria-label="Delete notification"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
