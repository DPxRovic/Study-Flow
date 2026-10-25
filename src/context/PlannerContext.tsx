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
import { formatCurrentWeekLabel, toLocalDateKey } from '../utils/date';

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
  toggleSessionComplete: (id: string, actualMinutesLogged?: number) => Promise<void>;
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
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'publishedAt'>) => Promise<boolean>;
  updateAnnouncement: (id: string, updates: Partial<Announcement>) => Promise<boolean>;
  deleteAnnouncement: (id: string) => Promise<boolean>;

  // Notifications actions
  markNotificationRead: (id: string) => Promise<void>;
  markNotificationUnread: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  addNotification: (notification: Omit<AcademicNotification, 'id' | 'timestamp' | 'read'>) => Promise<void>;

  // Reflection Journal actions
  addJournalEntry: (entry: { content: string; weekLabel?: string; rating?: 'balanced' | 'challenging' | 'overloaded' }) => void;

}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const { isAuthenticated, user } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<AcademicNotification[]>([]);

  const [journalEntries, setJournalEntries] = useState<ReflectionJournalEntry[]>([]);
  const [journalOwnerId, setJournalOwnerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setJournalEntries([]);
      setJournalOwnerId(null);
      return;
    }

    const storageKey = `studyflow_journal_${user.id}`;
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      setJournalEntries([]);
      setJournalOwnerId(user.id);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      setJournalEntries(Array.isArray(parsed) ? parsed : []);
    } catch {
      setJournalEntries([]);
    }
    setJournalOwnerId(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || journalOwnerId !== user.id) return;
    localStorage.setItem(`studyflow_journal_${user.id}`, JSON.stringify(journalEntries));
  }, [journalEntries, journalOwnerId, user?.id]);

  /**
   * Loads all live planner entities concurrently from PostgreSQL
   */
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      setSubjects([]);
      setTasks([]);
      setSessions([]);
      setAvailability([]);
      setAnnouncements([]);
      setNotifications([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    // Never leave one account's planner entities visible while another account loads.
    setSubjects([]);
    setTasks([]);
    setSessions([]);
    setAvailability([]);
    setAnnouncements([]);
    setNotifications([]);

    try {
      const [
        fetchedSubjects,
        fetchedTasks,
        fetchedSessions,
        fetchedAvailability,
        notifData,
        announcementData,
      ] = await Promise.all([
        subjectService.list().catch((err) => {
          console.error('Failed to fetch subjects from server:', err);
          return [];
        }),
        taskService.list().catch((err) => {
          console.error('Failed to fetch tasks from server:', err);
          return [];
        }),
        scheduleService.listSessions().catch((err) => {
          console.error('Failed to fetch sessions from server:', err);
          return [];
        }),
        availabilityService.list().catch((err) => {
          console.error('Failed to fetch availability from server:', err);
          return [];
        }),
        notificationService.list().catch((err) => {
          console.error('Failed to fetch notifications from server:', err);
          return {
            notifications: [],
            unreadCount: 0,
          };
        }),
        adminService.getAnnouncements().catch((err) => {
          console.error('Failed to fetch announcements from server:', err);
          return { success: true, data: [] };
        }),
      ]);

      setSubjects(fetchedSubjects);
      setTasks(fetchedTasks);
      setSessions(fetchedSessions);
      setAvailability(fetchedAvailability);
      setNotifications(notifData.notifications || []);
      setAnnouncements(
        announcementData.data || []
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

  // Derived sessions for the user's real local calendar date.
  const todaySessions = useMemo(() => {
    const todayStr = toLocalDateKey();
    return sessions.filter((s) => s.date === todayStr && s.status !== 'cancelled');
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

  const toggleSessionComplete = async (id: string, actualMinutesLogged?: number) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;

    const nextStatus: SessionStatus = session.status === 'completed' || session.completed ? 'scheduled' : 'completed';
    try {
      const updated = await scheduleService.updateStatus(
        id,
        nextStatus,
        nextStatus === 'completed' ? actualMinutesLogged ?? session.durationMinutes : undefined
      );
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
      const refreshedTasks = await taskService.list().catch(() => null);
      if (refreshedTasks) setTasks(refreshedTasks);
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
        .catch((err) => {
          console.error('Failed to persist schedule to backend:', err);
          showToast(err.message || 'Failed to save generated schedule to database', 'error');
        });
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
      return true;
    } catch (err: any) {
      showToast(err.message || 'Failed to broadcast announcement', 'error');
      return false;
    }
  };

  const updateAnnouncement = async (id: string, updates: Partial<Announcement>) => {
    try {
      const res = await adminService.updateAnnouncement(id, updates);
      setAnnouncements((prev) => prev.map((ann) => (ann.id === id ? res.data : ann)));
      showToast('Announcement updated', 'info');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Failed to update announcement', 'error');
      return false;
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await adminService.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((ann) => ann.id !== id));
      showToast('Announcement removed', 'info');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Failed to delete announcement', 'error');
      return false;
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
      date: toLocalDateKey(),
      weekLabel: entry.weekLabel || `Week of ${formatCurrentWeekLabel()}`,
      content: entry.content,
      rating: entry.rating || 'balanced',
    };
    setJournalEntries((prev) => [newEntry, ...prev]);
    showToast('Reflection saved to academic study journal', 'success');
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
