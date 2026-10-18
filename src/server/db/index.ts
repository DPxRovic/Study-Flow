/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Subject,
  Task,
  AvailabilitySlot,
  ScheduledSession,
  Announcement,
  AcademicNotification,
} from '../../types';
import {
  INITIAL_SUBJECTS,
  INITIAL_TASKS,
  INITIAL_ALL_SESSIONS,
  INITIAL_AVAILABILITY,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
} from '../../data/mockData';
import bcrypt from 'bcryptjs';

export interface DbUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'student' | 'admin' | 'advisor' | 'ta';
  major: string;
  term: string;
  targetDailyStudyCapHours: number;
  defaultSessionMinutes: number;
  preferredBreakMinutes: number;
  preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'flexible';
  bufferMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbSubjectRecord extends Subject {
  userId: string;
}

export interface DbTaskRecord extends Task {
  userId: string;
}

export interface DbAvailabilityRecord extends AvailabilitySlot {
  userId: string;
}

export interface DbSessionRecord extends ScheduledSession {
  userId: string;
}

export interface DbNotificationRecord extends AcademicNotification {
  userId: string;
}

class InMemoryDatabase {
  public users: Map<string, DbUserRecord> = new Map();
  public subjects: Map<string, DbSubjectRecord> = new Map();
  public tasks: Map<string, DbTaskRecord> = new Map();
  public availability: Map<string, DbAvailabilityRecord> = new Map();
  public sessions: Map<string, DbSessionRecord> = new Map();
  public announcements: Map<string, Announcement> = new Map();
  public notifications: Map<string, DbNotificationRecord> = new Map();

  private initialized = false;

  constructor() {
    this.seed();
  }

  private seed() {
    if (this.initialized) return;

    // Default password hash for demo accounts: "studyflow2026"
    // Pre-computed bcrypt hash of "studyflow2026" with salt rounds 10
    const demoPasswordHash = bcrypt.hashSync('studyflow2026', 10);

    // 1. Primary Student: Maya Lin
    const maya: DbUserRecord = {
      id: 'usr_student_maya',
      email: 'm.lin@university.edu',
      passwordHash: demoPasswordHash,
      name: 'Maya Lin',
      role: 'student',
      major: 'Computer Science & Mathematics',
      term: 'Fall 2026',
      targetDailyStudyCapHours: 5.5,
      defaultSessionMinutes: 50,
      preferredBreakMinutes: 10,
      preferredStudyTime: 'afternoon',
      bufferMinutes: 15,
      createdAt: '2026-08-20T08:00:00.000Z',
      updatedAt: '2026-10-06T12:00:00.000Z',
    };
    this.users.set(maya.id, maya);

    // 2. Department Administrator: Dr. Elena Vance
    const elena: DbUserRecord = {
      id: 'usr_admin_elena',
      email: 'e.vance@university.edu',
      passwordHash: demoPasswordHash,
      name: 'Dr. Elena Vance',
      role: 'admin',
      major: 'Dean of Academic Operations & Curriculum',
      term: 'Fall 2026',
      targetDailyStudyCapHours: 6.0,
      defaultSessionMinutes: 50,
      preferredBreakMinutes: 10,
      preferredStudyTime: 'morning',
      bufferMinutes: 15,
      createdAt: '2026-07-15T08:00:00.000Z',
      updatedAt: '2026-10-06T12:00:00.000Z',
    };
    this.users.set(elena.id, elena);

    // 3. Populate Maya's subjects with ownership
    INITIAL_SUBJECTS.forEach((sub) => {
      this.subjects.set(sub.id, { ...sub, userId: maya.id });
    });

    // 4. Populate Maya's tasks with ownership
    INITIAL_TASKS.forEach((t) => {
      this.tasks.set(t.id, { ...t, userId: maya.id });
    });

    // 5. Populate Maya's availability slots with ownership
    INITIAL_AVAILABILITY.forEach((av) => {
      this.availability.set(av.id, { ...av, userId: maya.id });
    });

    // 6. Populate Maya's study sessions with ownership
    INITIAL_ALL_SESSIONS.forEach((ses) => {
      this.sessions.set(ses.id, { ...ses, userId: maya.id });
    });

    // 7. Populate Announcements (Global institutional resources)
    INITIAL_ANNOUNCEMENTS.forEach((ann) => {
      this.announcements.set(ann.id, { ...ann });
    });

    // 8. Populate Maya's notifications
    INITIAL_NOTIFICATIONS.forEach((notif) => {
      this.notifications.set(notif.id, { ...notif, userId: maya.id });
    });

    this.initialized = true;
  }
}

export const db = new InMemoryDatabase();
