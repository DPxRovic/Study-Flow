/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  RotateCw,
  AlertTriangle,
  Plus,
  SlidersHorizontal,
  Clock,
  Inbox,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { usePlanner } from '../../context/PlannerContext';
import { useToast } from '../../context/ToastContext';
import { NotificationItem } from '../../components/notifications/NotificationItem';
import {
  NotificationFilterTabs,
  NotificationFilterTab,
} from '../../components/notifications/NotificationFilterTabs';
import { AcademicNotification } from '../../types';

export function NotificationsPage() {
  const {
    notifications,
    markNotificationRead,
    markNotificationUnread,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    addNotification,
    tasks,
    subjects,
    refreshData,
  } = usePlanner();

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<NotificationFilterTab>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [simulatedError, setSimulatedError] = useState<string | null>(null);

  // Filter notifications by category and unread state
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Category check
      if (activeTab === 'deadlines' && notif.category !== 'deadline' && notif.category !== 'overdue') {
        return false;
      }
      if (activeTab === 'schedule' && notif.category !== 'schedule' && notif.category !== 'conflict') {
        return false;
      }
      if (activeTab === 'announcements' && notif.category !== 'announcement') {
        return false;
      }
      if (activeTab === 'completed' && notif.category !== 'task_completed') {
        return false;
      }

      // Unread only check
      if (unreadOnly && notif.read) {
        return false;
      }

      return true;
    });
  }, [notifications, activeTab, unreadOnly]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggleRead = (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    if (!notif) return;
    if (notif.read) {
      markNotificationUnread(id);
      showToast('Notification marked as unread', 'info');
    } else {
      markNotificationRead(id);
      showToast('Notification marked as read', 'success');
    }
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
  };

  const handleRefreshFeed = async () => {
    setIsLoading(true);
    setSimulatedError(null);
    try {
      await refreshData();
      showToast('Notification feed synchronized with server', 'info');
    } catch {
      setSimulatedError('Failed to synchronize notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to generate a realistic academic alert for verification
  const handleGenerateSampleAlert = () => {
    const sampleTypes = [
      {
        category: 'deadline' as const,
        priority: 'urgent' as const,
        title: 'Upcoming Deliverable: CS 201 Problem Set 4 Due Soon',
        description: 'Remaining study workload: 2.5 hours. Recommended study block available this evening.',
        actionUrl: '/tasks',
        actionLabel: 'View Assignment',
      },
      {
        category: 'schedule' as const,
        priority: 'important' as const,
        title: 'New Study Block Scheduled for Calculus III',
        description: 'Auto-allocated 90 minutes tomorrow from 10:30–12:00 in your preferred quiet window.',
        actionUrl: '/schedule',
        actionLabel: 'Open Calendar Grid',
      },
      {
        category: 'conflict' as const,
        priority: 'urgent' as const,
        title: 'Schedule Conflict Warning: Overlapping Lecture Window',
        description: 'BIO 110 laboratory commitment overlaps with an unsaved personal study session.',
        actionUrl: '/schedule',
        actionLabel: 'Resolve Conflict',
      },
    ];

    const pick = sampleTypes[Math.floor(Math.random() * sampleTypes.length)];
    addNotification(pick);
    showToast(`Generated new academic notice: "${pick.title}"`, 'info');
  };

  // Error State View
  if (simulatedError) {
    return (
      <div className="max-w-4xl space-y-6 pb-12">
        <div className="surface-base rounded-2xl p-8 border border-rose-200 text-center space-y-4 shadow-2xs">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Notification Feed Error</h2>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              {simulatedError}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleRefreshFeed}
            icon={<RotateCw className="w-4 h-4" />}
          >
            Retry Loading Notifications
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Editorial Header */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-2">
            <span>Academic Activity Feed</span>
            <span aria-hidden="true">·</span>
            <span>Fall 2026</span>
            {unreadCount > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-bold text-sky-850">{unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-bold text-emerald-700">All caught up</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Academic Notifications
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl font-medium leading-relaxed">
            Calm, high-utility notices for approaching deadlines, schedule adjustments, and campus advisories.
          </p>
        </div>

        {/* Global Feed Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={markAllNotificationsRead}
              icon={<CheckCheck className="w-3.5 h-3.5" />}
            >
              Mark All Read
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateSampleAlert}
            icon={<Plus className="w-3.5 h-3.5" />}
            title="Generate a realistic academic notification"
          >
            Test Alert
          </Button>

          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              icon={<Trash2 className="w-3.5 h-3.5 text-slate-400" />}
              title="Clear all notifications"
            >
              Clear
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshFeed}
            disabled={isLoading}
            icon={<RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            title="Refresh feed"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Segmented Controls */}
      <NotificationFilterTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadOnly={unreadOnly}
        onToggleUnreadOnly={() => setUnreadOnly(!unreadOnly)}
        notifications={notifications}
      />

      {/* Feed Content */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="surface-base rounded-2xl p-10 border border-slate-200/90 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">
              {unreadOnly
                ? 'No Unread Academic Alerts'
                : activeTab !== 'all'
                ? `No ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Notices Found`
                : 'Your Academic Notification Inbox Is Empty'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              {unreadOnly
                ? 'You have reviewed all current deadlines, schedule blocks, and institutional notices.'
                : 'StudyFlow will quietly notify you here when deadlines approach within 48h, when study blocks are auto-scheduled, or if schedule collisions occur.'}
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateSampleAlert}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Generate Sample Academic Notice
            </Button>
          </div>
        </div>
      ) : (
        /* Populated Feed Container */
        <div className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {filteredNotifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onToggleRead={handleToggleRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
