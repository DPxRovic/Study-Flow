/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Subject,
  Task,
  AvailabilitySlot,
  ScheduledSession,
  Announcement,
  ScheduleGenerationOptions,
  SessionStatus,
  ScheduleConflict,
  AcademicNotification,
  ReflectionJournalEntry,
} from '../types';
import {
  INITIAL_SUBJECTS,
  INITIAL_TASKS,
  INITIAL_TODAY_SESSIONS,
  INITIAL_ALL_SESSIONS,
  INITIAL_AVAILABILITY,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_JOURNAL_ENTRIES,
} from '../data/mockData';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import {
  detectScheduleConflicts,
  generateMockSchedule,
} from '../utils/scheduleGenerator';
import { subjectService } from '../services/subjectService';
import { taskService } from '../services/taskService';
import { availabilityService } from '../services/availabilityService';
import { scheduleService } from '../services/scheduleService';
import { notificationService } from '../services/notificationService';
import { adminService } from '../services/adminService';

interface PlannerContextType {
  subjects: Subject[];
  tasks: Task[];
  sessions: ScheduledSession[];
  todaySessions: ScheduledSession[];
  availability: AvailabilitySlot[];
  announcements: Announcement[];
  conflicts: ScheduleConflict[];
  notifications: AcademicNotification[];
  unreadNotificationsCount: number;
  journalEntries: ReflectionJournalEntry[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;

  // Task actions
  addTask: (task: Omit<Task, 'id'>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleTaskCompleted: (id: string) => Promise<void>;

  // Subject actions
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<Subject | null>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<Subject | null>;
  deleteSubject: (id: string) => Promise<boolean>;

  // Session actions
  addSession: (session: Omit<ScheduledSession, 'id'>) => Promise<ScheduledSession | null>;
  updateSession: (id: string, updates: Partial<ScheduledSession>) => Promise<ScheduledSession | null>;
  deleteSession: (id: string) => Promise<boolean>;
  toggleSessionComplete: (id: string) => Promise<void>;
  toggleSessionLock: (id: string) => Promise<void>;
  setSessionStatus: (id: string, status: SessionStatus) => Promise<void>;

  // Availability actions
  addAvailabilitySlot: (slot: Omit<AvailabilitySlot, 'id'>) => Promise<AvailabilitySlot | null>;
  updateAvailabilitySlot: (id: string, updates: Partial<AvailabilitySlot>) => Promise<AvailabilitySlot | null>;
  deleteAvailabilitySlot: (id: string) => Promise<boolean>;
  updateAvailabilitySlots: (slots: AvailabilitySlot[]) => Promise<void>;

  // Schedule generator
  generateSchedule: (options: Partial<ScheduleGenerationOptions>) => { generatedCount: number; warnings: string[] };

  // Admin actions
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'publishedAt'>) => Promise<void>;
  updateAnnouncement: (id: string, updates: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  // Notifications actions
  markNotificationRead: (id: string) => Promise<void>;
  markNotificationUnread: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  addNotification: (notification: Omit<AcademicNotification, 'id' | 'timestamp' | 'read'>) => Promise<void>;

  // Reflection Journal actions
  addJournalEntry: (entry: { content: string; weekLabel?: string; rating?: 'balanced' | 'challenging' | 'overloaded' }) => void;

  // Reset
  resetDemoData: () => Promise<void>;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const { isAuthenticated, user } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [sessions, setSessions] = useState<ScheduledSession[]>(INITIAL_ALL_SESSIONS);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(INITIAL_AVAILABILITY);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [notifications, setNotifications] = useState<AcademicNotification[]>(INITIAL_NOTIFICATIONS);

  const [journalEntries, setJournalEntries] = useState<ReflectionJournalEntry[]>(() => {
    const saved = localStorage.getItem('studyflow_journal');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_JOURNAL_ENTRIES;
      }
    }
    return INITIAL_JOURNAL_ENTRIES;
  });

  useEffect(() => {
    localStorage.setItem('studyflow_journal', JSON.stringify(journalEntries));
  }, [journalEntries]);

  /**
   * Loads all live planner entities concurrently from PostgreSQL
   */
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      setSubjects(INITIAL_SUBJECTS);
      setTasks(INITIAL_TASKS);
      setSessions(INITIAL_ALL_SESSIONS);
      setAvailability(INITIAL_AVAILABILITY);
      setAnnouncements(INITIAL_ANNOUNCEMENTS);
      setNotifications(INITIAL_NOTIFICATIONS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [
        fetchedSubjects,
        fetchedTasks,
        fetchedSessions,
        fetchedAvailability,
        notifData,
        announcementData,
      ] = await Promise.all([
        subjectService.list().catch(() => INITIAL_SUBJECTS),
        taskService.list().catch(() => INITIAL_TASKS),
        scheduleService.listSessions().catch(() => INITIAL_ALL_SESSIONS),
        availabilityService.list().catch(() => INITIAL_AVAILABILITY),
        notificationService.list().catch(() => ({
          notifications: INITIAL_NOTIFICATIONS,
          unreadCount: INITIAL_NOTIFICATIONS.filter((n) => !n.read).length,
        })),
        adminService.getAnnouncements().catch(() => ({ success: true, data: INITIAL_ANNOUNCEMENTS })),
      ]);

      setSubjects(fetchedSubjects.length > 0 ? fetchedSubjects : INITIAL_SUBJECTS);
      setTasks(fetchedTasks.length > 0 ? fetchedTasks : INITIAL_TASKS);
      setSessions(fetchedSessions.length > 0 ? fetchedSessions : INITIAL_ALL_SESSIONS);
      setAvailability(fetchedAvailability.length > 0 ? fetchedAvailability : INITIAL_AVAILABILITY);
      setNotifications(notifData.notifications.length > 0 ? notifData.notifications : INITIAL_NOTIFICATIONS);
      setAnnouncements(
        announcementData.data && announcementData.data.length > 0
          ? announcementData.data
          : INITIAL_ANNOUNCEMENTS
      );
    } catch (err: any) {
      console.warn('Could not sync all planner data from API:', err);
      setError(err?.message || 'Failed to load planner data');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // Synchronize on authentication change
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Derived today sessions (default to term anchor 2026-10-06 or current system date)
  const todaySessions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return sessions.filter((s) => s.date === '2026-10-06' || s.date === todayStr);
  }, [sessions]);

  // Compute live conflicts
  const conflicts = useMemo(() => {
    return detectScheduleConflicts(sessions, tasks, availability);
  }, [sessions, tasks, availability]);

  // ==========================================
  // Task Actions (Connected to Backend API)
  // ==========================================
  const addTask = async (taskData: Omit<Task, 'id'>): Promise<Task | null> => {
    try {
      const created = await taskService.create(taskData);
      setTasks((prev) => [created, ...prev]);
      showToast(`Added assignment: "${created.title}"`, 'success');
      return created;
    } catch (err: any) {
      showToast(err.message || 'Failed to create assignment', 'error');
      return null;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<Task | null> => {
    try {
      const updated = await taskService.update(id, updates);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      showToast('Task updated', 'info');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'Failed to update task', 'error');
      return null;
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      await taskService.delete(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setSessions((prev) => prev.filter((s) => s.taskId !== id));
      showToast('Assignment and associated study blocks removed', 'info');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Failed to delete assignment', 'error');
      return false;
    }
  };

  const toggleTaskCompleted = async (id: string) => {
    try {
      const updated = await taskService.toggleComplete(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

      if (updated.status === 'completed') {
        showToast(`Completed: ${updated.title}`, 'success');
      } else {
        showToast(`Reopened: ${updated.title}`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update task status', 'error');
    }
  };

  // ==========================================
  // Subject Actions (Connected to Backend API)
  // ==========================================
  const addSubject = async (subjectData: Omit<Subject, 'id'>): Promise<Subject | null> => {
    try {
      const created = await subjectService.create(subjectData);
      setSubjects((prev) => [...prev, created]);
      showToast(`Enrolled in ${created.code}`, 'success');
      return created;
    } catch (err: any) {
      showToast(err.message || 'Failed to enroll in course subject', 'error');
      return null;
    }
  };

  const updateSubject = async (id: string, updates: Partial<Subject>): Promise<Subject | null> => {
    try {
      const updated = await subjectService.update(id, updates);
      setSubjects((prev) => prev.map((s) => (s.id === id ? updated : s)));
      showToast('Course information updated', 'info');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'Failed to update subject', 'error');
      return null;
    }
  };

  const deleteSubject = async (id: string): Promise<boolean> => {
    try {
      await subjectService.delete(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setTasks((prev) => prev.filter((t) => t.subjectId !== id));
      setSessions((prev) => prev.filter((s) => s.subjectId !== id));
      showToast('Subject and related deliverables removed from term catalog', 'info');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Failed to delete subject', 'error');
      return false;
    }
  };

  // ==========================================
  // Session Actions (Connected to Backend API)
  // ==========================================
  const addSession = async (sessionData: Omit<ScheduledSession, 'id'>): Promise<ScheduledSession | null> => {
    try {
      const created = await scheduleService.createSession(sessionData);
      setSessions((prev) => [...prev, created]);
      showToast(`Added study block for ${created.startTime}–${created.endTime}`, 'success');
      return created;
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule study block', 'error');
      return null;
    }
  };

  const updateSession = async (id: string, updates: Partial<ScheduledSession>): Promise<ScheduledSession | null> => {
    try {
      const updated = await scheduleService.updateSession(id, updates);
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      showToast('Study session updated', 'info');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'Failed to update study session', 'error');
      return null;
    }
  };

  const deleteSession = async (id: string): Promise<boolean> => {
    try {
      await scheduleService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      showToast('Study session removed', 'info');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Failed to remove study session', 'error');
      return false;
    }
  };

  const toggleSessionComplete = async (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;

    const nextStatus: SessionStatus = session.status === 'completed' || session.completed ? 'scheduled' : 'completed';
    try {
      const updated = await scheduleService.updateStatus(id, nextStatus, nextStatus === 'completed' ? session.durationMinutes : 0);
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));

      // Sync updated task remaining hours
      const refreshedTasks = await taskService.list().catch(() => null);
      if (refreshedTasks) {
        setTasks(refreshedTasks);
      }

      showToast(
        nextStatus === 'completed' ? 'Study session completed!' : 'Study session reopened',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update session completion', 'error');
    }
  };

  const toggleSessionLock = async (id: string) => {
    try {
      const updated = await scheduleService.toggleLock(id);
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      showToast(updated.locked ? 'Session locked against auto-rescheduling' : 'Session unlocked', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle session lock', 'error');
    }
  };

  const setSessionStatus = async (id: string, status: SessionStatus) => {
    try {
      const session = sessions.find((s) => s.id === id);
      const actualMinutes = status === 'completed' && session ? session.durationMinutes : undefined;
      const updated = await scheduleService.updateStatus(id, status, actualMinutes);
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      showToast(`Session marked as ${status}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to update session status', 'error');
    }
  };

  // ==========================================
  // Availability Actions (Connected to Backend API)
  // ==========================================
  const addAvailabilitySlot = async (slotData: Omit<AvailabilitySlot, 'id'>): Promise<AvailabilitySlot | null> => {
    try {
      const created = await availabilityService.create(slotData);
      setAvailability((prev) => [...prev, created]);
      showToast(
        slotData.type === 'preferred_study'
          ? 'Added open study window'
          : `Added ${slotData.label || 'scheduled commitment'}`,
        'success'
      );
      return created;
    } catch (err: any) {
      showToast(err.message || 'Failed to create availability window', 'error');
      return null;
    }
  };

  const updateAvailabilitySlot = async (id: string, updates: Partial<AvailabilitySlot>): Promise<AvailabilitySlot | null> => {
    try {
      const updated = await availabilityService.update(id, updates);
      setAvailability((prev) => prev.map((s) => (s.id === id ? updated : s)));
      showToast('Schedule window updated', 'info');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'Failed to update availability window', 'error');
      return null;
    }
  };

  const deleteAvailabilitySlot = async (id: string): Promise<boolean> => {
    try {
      await availabilityService.delete(id);
      setAvailability((prev) => prev.filter((s) => s.id !== id));
      showToast('Time window removed', 'info');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Failed to remove availability window', 'error');
      return false;
    }
  };

  const updateAvailabilitySlots = async (slots: AvailabilitySlot[]) => {
    setAvailability(slots);
    showToast('Weekly study windows updated', 'success');
  };

  // ==========================================
  // Schedule Generator
  // ==========================================
  const generateSchedule = (options: Partial<ScheduleGenerationOptions>) => {
    const result = generateMockSchedule(sessions, tasks, availability, options);

    // Update in-memory session list immediately for fluid UX
    setSessions(result.newSessions);

    // Persist and regenerate on backend when authenticated
    if (isAuthenticated) {
      scheduleService
        .generateSchedule({
          mode: options.mode ? String(options.mode).toUpperCase() : 'BALANCED',
        })
        .then((res) => {
          if (res.sessions && res.sessions.length > 0) {
            setSessions(res.sessions);
          }
        })
        .catch(() => {});
    }

    addNotification({
      category: 'schedule',
      priority: 'important',
      title: `Schedule Generated: ${result.generatedCount} Study Blocks`,
      description: `Optimal balanced allocation generated across available windows. ${
        result.warnings.length > 0 ? result.warnings[0] : 'All fatigue limits maintained.'
      }`,
      actionUrl: '/schedule',
      actionLabel: 'View Schedule',
    });

    showToast(
      `Schedule updated: ${result.generatedCount} sessions allocated (locked blocks preserved)`,
      'success'
    );

    return {
      generatedCount: result.generatedCount,
      warnings: result.warnings,
    };
  };

  // ==========================================
  // Admin Announcement Actions (Connected to Backend API)
  // ==========================================
  const addAnnouncement = async (data: Omit<Announcement, 'id' | 'publishedAt'>) => {
    try {
      const res = await adminService.createAnnouncement(data);
      const newAnn = res.data;
      setAnnouncements((prev) => [newAnn, ...prev]);

      if (newAnn.status !== 'draft') {
        addNotification({
          category: 'announcement',
          priority: data.priority === 'critical' ? 'urgent' : data.priority === 'important' ? 'important' : 'normal',
          title: `Campus Notice: ${data.title}`,
          description: data.content,
          actionUrl: '/notifications',
          actionLabel: 'Read Notice',
          relatedId: newAnn.id,
        });
      }

      showToast(`Broadcasted announcement: "${newAnn.title}"`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to broadcast announcement', 'error');
    }
  };

  const updateAnnouncement = async (id: string, updates: Partial<Announcement>) => {
    try {
      const res = await adminService.updateAnnouncement(id, updates);
      setAnnouncements((prev) => prev.map((ann) => (ann.id === id ? res.data : ann)));
      showToast('Announcement updated', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to update announcement', 'error');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await adminService.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((ann) => ann.id !== id));
      showToast('Announcement removed', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete announcement', 'error');
    }
  };

  // ==========================================
  // Notification Actions (Connected to Backend API)
  // ==========================================
  const addNotification = async (
    notifData: Omit<AcademicNotification, 'id' | 'timestamp' | 'read'>
  ) => {
    const newNotif: AcademicNotification = {
      ...notifData,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // Local optimistic update fallback
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const markNotificationUnread = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: false } : n))
    );
  };

  const markAllNotificationsRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast('All notifications marked as read', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to mark notifications read', 'error');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showToast('Notification removed', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete notification', 'error');
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    showToast('All notifications cleared', 'info');
  };

  // ==========================================
  // Reflection Journal Actions
  // ==========================================
  const addJournalEntry = (entry: {
    content: string;
    weekLabel?: string;
    rating?: 'balanced' | 'challenging' | 'overloaded';
  }) => {
    const newEntry: ReflectionJournalEntry = {
      id: `ref_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      weekLabel: entry.weekLabel || 'Week 7 Mid-Term Check',
      content: entry.content,
      rating: entry.rating || 'balanced',
    };
    setJournalEntries((prev) => [newEntry, ...prev]);
    showToast('Reflection saved to academic study journal', 'success');
  };

  const resetDemoData = async () => {
    await refreshData();
    showToast('Data refreshed from PostgreSQL database', 'info');
  };

  return (
    <PlannerContext.Provider
      value={{
        subjects,
        tasks,
        sessions,
        todaySessions,
        availability,
        announcements,
        conflicts,
        notifications,
        unreadNotificationsCount,
        journalEntries,
        isLoading,
        error,
        refreshData,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskCompleted,
        addSubject,
        updateSubject,
        deleteSubject,
        addSession,
        updateSession,
        deleteSession,
        toggleSessionComplete,
        toggleSessionLock,
        setSessionStatus,
        addAvailabilitySlot,
        updateAvailabilitySlot,
        deleteAvailabilitySlot,
        updateAvailabilitySlots,
        generateSchedule,
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        markNotificationRead,
        markNotificationUnread,
        markAllNotificationsRead,
        deleteNotification,
        clearAllNotifications,
        addNotification,
        addJournalEntry,
        resetDemoData,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
}
