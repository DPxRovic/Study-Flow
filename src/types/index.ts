/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'admin' | 'advisor' | 'ta';

export type StudentView =
  | 'dashboard'
  | 'tasks'
  | 'subjects'
  | 'availability'
  | 'schedule'
  | 'calendar'
  | 'progress'
  | 'notifications'
  | 'settings';

export type AdminView =
  | 'dashboard'
  | 'users'
  | 'subjects'
  | 'announcements'
  | 'analytics'
  | 'audit'
  | 'audit-logs'
  | 'settings';

export type SubjectCategory =
  | 'stem'
  | 'cs'
  | 'humanities'
  | 'science'
  | 'social'
  | 'arts';

export interface Subject {
  id: string;
  code: string;               // e.g. "MATH 241"
  name: string;               // e.g. "Calculus III"
  instructor: string;         // e.g. "Dr. Elena Vance"
  credits: number;            // e.g. 4
  colorKey: SubjectCategory;  // Category palette key
  weeklyTargetHours: number;  // Recommended weekly study hours
  classroom?: string;
  officeHours?: string;
  syllabusUrl?: string;
}

export type TaskType =
  | 'assignment'
  | 'problem_set'
  | 'paper'
  | 'reading'
  | 'exam_prep'
  | 'project_milestone';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TaskStatus = 'backlog' | 'scheduled' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  subjectId: string;
  title: string;
  dueDate: string;            // ISO String e.g. "2026-10-12T17:00:00"
  estimatedHours: number;     // Total hours estimated for the work
  remainingHours: number;     // Remaining hours needed
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
  subtasks?: Array<{ id: string; title: string; completed: boolean }>;
}

export type SlotType = 'preferred_study' | 'class' | 'work' | 'personal';

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  startTime: string;                    // "09:00"
  endTime: string;                      // "11:30"
  type: SlotType;
  label?: string;
}

export type SessionStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled';

export interface ScheduledSession {
  id: string;
  taskId: string;
  subjectId: string;
  date: string;                         // "YYYY-MM-DD"
  startTime: string;                    // "10:00"
  endTime: string;                      // "11:30"
  durationMinutes: number;              // 90
  completed: boolean;
  status?: SessionStatus;
  actualMinutesLogged?: number;
  locked?: boolean;
  notes?: string;
}

export type ConflictType =
  | 'overlap'
  | 'insufficient_availability'
  | 'deadline_approaching'
  | 'deadline_passed'
  | 'unscheduled_workload';

export interface ScheduleConflict {
  id: string;
  type: ConflictType;
  title: string;
  description: string;
  severity: 'warning' | 'danger';
  sessionIds?: string[];
  taskId?: string;
  date?: string;
}

export interface DayStudyPlan {
  date: string;                         // "YYYY-MM-DD"
  dayName: string;                      // "Monday"
  totalMinutesPlanned: number;
  totalMinutesCompleted: number;
  sessions: ScheduledSession[];
}

export interface StudyPreferences {
  targetDailyStudyCapHours: number;
  defaultSessionMinutes: number;
  preferredBreakMinutes: number;
  preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'flexible';
  bufferMinutes: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  major?: string;
  term?: string;
  targetDailyStudyCapHours?: number;
  defaultSessionMinutes?: number;
  preferredBreakMinutes?: number;
  preferredStudyTime?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  bufferMinutes?: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  major: string;
  term: string;                         // "Fall 2026"
  targetDailyStudyCapHours: number;     // Default 6.0
  defaultSessionMinutes: number;        // Default 50
  preferredStudyTime: 'morning' | 'afternoon' | 'evening';
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  publishedAt: string;
  priority: 'normal' | 'important' | 'critical';
  targetCohort: 'all' | 'stem' | 'humanities' | 'undergrad';
  pinned?: boolean;
  status?: 'published' | 'draft' | 'archived';
}

export interface CatalogCourse {
  id: string;
  code: string;
  title: string;
  department: string;
  credits: number;
  instructor: string;
  expectedWeeklyHours: number;
  description?: string;
  syllabusOverview?: string;
  activeEnrolledCount?: number;
}

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  major: string;
  enrolledCourses: number;
  status: 'Active' | 'Review' | 'Suspended';
  lastActive?: string;
  joinedDate?: string;
}

export type AuditCategory =
  | 'user_management'
  | 'security'
  | 'broadcast'
  | 'curriculum'
  | 'system';

export interface AuditLogRecord {
  id: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  action: string;
  category: AuditCategory;
  targetId?: string | null;
  targetType?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  timestamp: string;
}

export interface TermCalendarConfig {
  termName: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  readingPeriodStart: string;
  readingPeriodEnd: string;
  finalsStart: string;
  finalsEnd: string;
  censusDate: string;
  withdrawalDeadline: string;
}

export interface ScheduleGenerationOptions {
  startDate: string;                    // "YYYY-MM-DD"
  endDate: string;                      // "YYYY-MM-DD"
  mode: 'balanced' | 'front_loaded' | 'pomodoro';
  maxDailyHours: number;
  breakDurationMinutes: number;
}

export type NotificationCategory =
  | 'deadline'
  | 'overdue'
  | 'conflict'
  | 'schedule'
  | 'task_completed'
  | 'announcement';

export type NotificationPriority = 'normal' | 'important' | 'urgent';

export interface AcademicNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timestamp: string;                   // ISO string e.g. "2026-10-08T09:30:00"
  read: boolean;
  actionUrl?: string;                  // e.g. "/tasks", "/schedule", "/dashboard"
  actionLabel?: string;                // e.g. "View Task", "Inspect Schedule"
  relatedId?: string;                  // e.g. taskId, conflictId, sessionId
  priority?: NotificationPriority;
}

export interface SubjectWorkloadStatus {
  subject: Subject;
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  estimatedHours: number;
  completedHours: number;
  remainingHours: number;
  targetWeeklyHours: number;
  scheduledWeeklyHours: number;
  loggedWeeklyHours: number;
  attentionLevel: 'healthy' | 'on_track' | 'needs_attention';
  attentionReason?: string;
}

export interface ReflectionJournalEntry {
  id: string;
  date: string;
  weekLabel: string;
  content: string;
  rating?: 'balanced' | 'challenging' | 'overloaded';
}
