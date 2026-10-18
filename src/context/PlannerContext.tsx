/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
import {
  detectScheduleConflicts,
  generateMockSchedule,
} from '../utils/scheduleGenerator';

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
  
  // Task actions
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskCompleted: (id: string) => void;
  
  // Subject actions
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  
  // Session actions
  addSession: (session: Omit<ScheduledSession, 'id'>) => ScheduledSession;
  updateSession: (id: string, updates: Partial<ScheduledSession>) => void;
  deleteSession: (id: string) => void;
  toggleSessionComplete: (id: string) => void;
  toggleSessionLock: (id: string) => void;
  setSessionStatus: (id: string, status: SessionStatus) => void;
  
  // Availability actions
  addAvailabilitySlot: (slot: Omit<AvailabilitySlot, 'id'>) => AvailabilitySlot;
  updateAvailabilitySlot: (id: string, updates: Partial<AvailabilitySlot>) => void;
  deleteAvailabilitySlot: (id: string) => void;
  updateAvailabilitySlots: (slots: AvailabilitySlot[]) => void;
  
  // Schedule generator
  generateSchedule: (options: Partial<ScheduleGenerationOptions>) => { generatedCount: number; warnings: string[] };
  
  // Admin actions
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'publishedAt'>) => void;
  updateAnnouncement: (id: string, updates: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;
  
  // Notifications actions
  markNotificationRead: (id: string) => void;
  markNotificationUnread: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  addNotification: (notification: Omit<AcademicNotification, 'id' | 'timestamp' | 'read'>) => void;

  // Reflection Journal actions
  addJournalEntry: (entry: { content: string; weekLabel?: string; rating?: 'balanced' | 'challenging' | 'overloaded' }) => void;
  
  // Reset
  resetDemoData: () => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [sessions, setSessions] = useState<ScheduledSession[]>(() => {
    const saved = localStorage.getItem('studyflow_sessions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_ALL_SESSIONS;
      }
    }
    return INITIAL_ALL_SESSIONS;
  });

  const [availability, setAvailability] = useState<AvailabilitySlot[]>(() => {
    const saved = localStorage.getItem('studyflow_availability');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_AVAILABILITY;
      }
    }
    return INITIAL_AVAILABILITY;
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);

  const [notifications, setNotifications] = useState<AcademicNotification[]>(() => {
    const saved = localStorage.getItem('studyflow_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_NOTIFICATIONS;
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

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
    localStorage.setItem('studyflow_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('studyflow_availability', JSON.stringify(availability));
  }, [availability]);

  useEffect(() => {
    localStorage.setItem('studyflow_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('studyflow_journal', JSON.stringify(journalEntries));
  }, [journalEntries]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Derived today sessions (default to term anchor 2026-10-06 or current system date)
  const todaySessions = sessions.filter(
    (s) => s.date === '2026-10-06' || s.date === new Date().toISOString().split('T')[0]
  );

  // Compute live conflicts
  const conflicts = detectScheduleConflicts(sessions, tasks, availability);

  const addTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: `tsk_${Date.now()}`,
    };
    setTasks((prev) => [newTask, ...prev]);
    showToast(`Added assignment: "${newTask.title}"`, 'success');
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    showToast('Task updated', 'info');
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSessions((prev) => prev.filter((s) => s.taskId !== id));
    showToast('Assignment and associated study blocks removed', 'info');
  };

  const toggleTaskCompleted = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const isNowCompleted = t.status !== 'completed';
          if (isNowCompleted) {
            addNotification({
              category: 'task_completed',
              priority: 'normal',
              title: `Task Completed: ${t.title}`,
              description: `Marked completed. Remaining assignment workload decremented by ${t.estimatedHours}h.`,
              actionUrl: '/tasks',
              actionLabel: 'View Deliverables',
              relatedId: t.id,
            });
          }
          return {
            ...t,
            status: isNowCompleted ? 'completed' : 'in_progress',
            remainingHours: isNowCompleted ? 0 : t.estimatedHours,
          };
        }
        return t;
      })
    );
  };

  const addSubject = (subjectData: Omit<Subject, 'id'>) => {
    const newSubject: Subject = {
      ...subjectData,
      id: `sub_${Date.now()}`,
    };
    setSubjects((prev) => [...prev, newSubject]);
    showToast(`Enrolled in ${newSubject.code}`, 'success');
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    showToast('Course information updated', 'info');
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTasks((prev) => prev.filter((t) => t.subjectId !== id));
    setSessions((prev) => prev.filter((s) => s.subjectId !== id));
    showToast('Subject and related deliverables removed from term catalog', 'info');
  };

  // Session Actions
  const addSession = (sessionData: Omit<ScheduledSession, 'id'>) => {
    const newSession: ScheduledSession = {
      ...sessionData,
      id: `ses_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: sessionData.status || (sessionData.completed ? 'completed' : 'scheduled'),
    };
    setSessions((prev) => [...prev, newSession]);
    showToast(`Added study block for ${newSession.startTime}–${newSession.endTime}`, 'success');
    return newSession;
  };

  const updateSession = (id: string, updates: Partial<ScheduledSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    showToast('Study session updated', 'info');
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    showToast('Study session removed', 'info');
  };

  const toggleSessionComplete = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const isDone = !s.completed;
          // Decrement remaining hours on associated task if completing
          if (isDone) {
            setTasks((taskPrev) =>
              taskPrev.map((t) =>
                t.id === s.taskId
                  ? {
                      ...t,
                      remainingHours: Math.max(0, t.remainingHours - s.durationMinutes / 60),
                    }
                  : t
              )
            );
          }
          return {
            ...s,
            completed: isDone,
            status: isDone ? 'completed' : 'scheduled',
            actualMinutesLogged: isDone ? s.durationMinutes : undefined,
          };
        }
        return s;
      })
    );
  };

  const toggleSessionLock = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s))
    );
    showToast('Session lock status updated', 'info');
  };

  const setSessionStatus = (id: string, status: SessionStatus) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status,
              completed: status === 'completed',
            }
          : s
      )
    );
    showToast(`Session marked as ${status}`, 'info');
  };

  const addAvailabilitySlot = (slotData: Omit<AvailabilitySlot, 'id'>) => {
    const newSlot: AvailabilitySlot = {
      ...slotData,
      id: `av_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setAvailability((prev) => [...prev, newSlot]);
    showToast(
      slotData.type === 'preferred_study'
        ? 'Added open study window'
        : `Added ${slotData.label || 'scheduled commitment'}`,
      'success'
    );
    return newSlot;
  };

  const updateAvailabilitySlot = (id: string, updates: Partial<AvailabilitySlot>) => {
    setAvailability((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    showToast('Schedule window updated', 'info');
  };

  const deleteAvailabilitySlot = (id: string) => {
    setAvailability((prev) => prev.filter((s) => s.id !== id));
    showToast('Time window removed', 'info');
  };

  const updateAvailabilitySlots = (slots: AvailabilitySlot[]) => {
    setAvailability(slots);
    showToast('Weekly study windows saved', 'success');
  };

  const generateSchedule = (options: Partial<ScheduleGenerationOptions>) => {
    const result = generateMockSchedule(sessions, tasks, availability, options);

    setSessions(result.newSessions);

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

  const addAnnouncement = (data: Omit<Announcement, 'id' | 'publishedAt'>) => {
    const newAnn: Announcement = {
      ...data,
      id: `ann_${Date.now()}`,
      publishedAt: new Date().toISOString().split('T')[0],
      status: data.status || 'published',
    };
    setAnnouncements((prev) => [newAnn, ...prev]);

    // Also add to notifications feed for student visibility
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
  };

  const updateAnnouncement = (id: string, updates: Partial<Announcement>) => {
    setAnnouncements((prev) =>
      prev.map((ann) => (ann.id === id ? { ...ann, ...updates } : ann))
    );
    showToast('Announcement updated', 'info');
  };

  const deleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((ann) => ann.id !== id));
    showToast('Announcement removed', 'info');
  };

  // Notification actions
  const addNotification = (
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

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markNotificationUnread = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: false } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'info');
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    showToast('Notification removed', 'info');
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    showToast('All notifications cleared', 'info');
  };

  // Reflection Journal actions
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

  const resetDemoData = () => {
    localStorage.removeItem('studyflow_availability');
    localStorage.removeItem('studyflow_sessions');
    localStorage.removeItem('studyflow_notifications');
    localStorage.removeItem('studyflow_journal');
    setSubjects(INITIAL_SUBJECTS);
    setTasks(INITIAL_TASKS);
    setSessions(INITIAL_ALL_SESSIONS);
    setAvailability(INITIAL_AVAILABILITY);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setJournalEntries(INITIAL_JOURNAL_ENTRIES);
    showToast('Demo data restored to initial semester state', 'info');
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
