/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AcademicNotification, NotificationCategory } from '../../types';

export type NotificationFilterTab = 'all' | 'deadlines' | 'schedule' | 'announcements' | 'completed';

interface NotificationFilterTabsProps {
  activeTab: NotificationFilterTab;
  onTabChange: (tab: NotificationFilterTab) => void;
  unreadOnly: boolean;
  onToggleUnreadOnly: () => void;
  notifications: AcademicNotification[];
}

export function NotificationFilterTabs({
  activeTab,
  onTabChange,
  unreadOnly,
  onToggleUnreadOnly,
  notifications,
}: NotificationFilterTabsProps) {
  const allCount = notifications.length;
  const deadlineCount = notifications.filter(
    (n) => n.category === 'deadline' || n.category === 'overdue'
  ).length;
  const scheduleCount = notifications.filter(
    (n) => n.category === 'schedule' || n.category === 'conflict'
  ).length;
  const announcementCount = notifications.filter(
    (n) => n.category === 'announcement'
  ).length;
  const completedCount = notifications.filter(
    (n) => n.category === 'task_completed'
  ).length;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
      {/* Segmented Category Filter Buttons */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
        <button
          onClick={() => onTabChange('all')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All ({allCount})
        </button>

        <button
          onClick={() => onTabChange('deadlines')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'deadlines'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Deadlines ({deadlineCount})
        </button>

        <button
          onClick={() => onTabChange('schedule')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Schedule ({scheduleCount})
        </button>

        <button
          onClick={() => onTabChange('announcements')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'announcements'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Notices ({announcementCount})
        </button>

        <button
          onClick={() => onTabChange('completed')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Unread Only Filter Toggle */}
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          onClick={onToggleUnreadOnly}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
            unreadOnly
              ? 'bg-sky-50 text-sky-850 border-sky-300 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          {unreadOnly ? `Unread Only (${unreadCount})` : 'Show All'}
        </button>
      </div>
    </div>
  );
}
