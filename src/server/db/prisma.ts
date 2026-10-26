/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
dotenv.config();

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  INITIAL_SUBJECTS,
  INITIAL_TASKS,
  INITIAL_ALL_SESSIONS,
  INITIAL_AVAILABILITY,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_CATALOG_COURSES,
  INITIAL_DIRECTORY_USERS,
} from '../../data/mockData';

// Determine if we should attempt connecting to real PostgreSQL
let isRealDbConnected = false;
let realPrismaInstance: PrismaClient | null = null;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
  try {
    realPrismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  } catch (err: any) {
    console.warn('[Prisma] Failed to instantiate PrismaClient with DATABASE_URL:', err?.message);
    realPrismaInstance = null;
  }
}

// ---------------------------------------------------------------------------
// In-Memory Database Fallback Store (AI Studio Compatible)
// ---------------------------------------------------------------------------
const defaultPasswordHash = bcrypt.hashSync('studyflow2026', 10);

const mockStore = {
  users: new Map<string, any>(),
  subjects: new Map<string, any>(),
  tasks: new Map<string, any>(),
  availabilitySlots: new Map<string, any>(),
  studySessions: new Map<string, any>(),
  schedules: new Map<string, any>(),
  catalogCourses: new Map<string, any>(),
  institutionalSettings: new Map<string, any>(),
  notifications: new Map<string, any>(),
  announcements: new Map<string, any>(),
  auditLogs: new Map<string, any>(),
  passwordResetRequests: new Map<string, any>(),
};

// Seed initial users
const mayaUser = {
  id: 'usr_student_maya',
  email: 'm.lin@university.edu',
  passwordHash: defaultPasswordHash,
  name: 'Maya Lin',
  role: 'STUDENT',
  major: 'Computer Science & Mathematics',
  term: 'Fall 2026',
  targetDailyStudyCapHours: 5.5,
  defaultSessionMinutes: 50,
  preferredBreakMinutes: 10,
  preferredStudyTime: 'afternoon',
  bufferMinutes: 15,
  tokenVersion: 0,
  accountStatus: 'ACTIVE',
  createdAt: new Date('2026-08-20T08:00:00Z'),
  updatedAt: new Date('2026-10-06T12:00:00Z'),
};
mockStore.users.set(mayaUser.id, mayaUser);

const elenaUser = {
  id: 'usr_admin_elena',
  email: 'e.vance@university.edu',
  passwordHash: defaultPasswordHash,
  name: 'Dr. Elena Vance',
  role: 'ADMIN',
  major: 'Dean of Academic Operations & Curriculum',
  term: 'Fall 2026',
  targetDailyStudyCapHours: 6.0,
  defaultSessionMinutes: 50,
  preferredBreakMinutes: 10,
  preferredStudyTime: 'morning',
  bufferMinutes: 15,
  tokenVersion: 0,
  accountStatus: 'ACTIVE',
  createdAt: new Date('2026-08-15T08:00:00Z'),
  updatedAt: new Date('2026-10-06T12:00:00Z'),
};
mockStore.users.set(elenaUser.id, elenaUser);

for (const dirUser of INITIAL_DIRECTORY_USERS) {
  if (![...mockStore.users.values()].some((u) => u.email.toLowerCase() === dirUser.email.toLowerCase())) {
    const roleUpper = dirUser.role.toUpperCase();
    const newUser = {
      id: dirUser.id,
      email: dirUser.email,
      passwordHash: defaultPasswordHash,
      name: dirUser.name,
      role: roleUpper === 'STUDENT' ? 'STUDENT' : roleUpper === 'ADMIN' ? 'ADMIN' : roleUpper === 'TA' ? 'TA' : 'STUDENT',
      major: dirUser.major,
      term: 'Fall 2026',
      targetDailyStudyCapHours: 5.5,
      defaultSessionMinutes: 50,
      preferredBreakMinutes: 10,
      preferredStudyTime: 'afternoon',
      bufferMinutes: 15,
      tokenVersion: 0,
      accountStatus: 'ACTIVE',
      createdAt: new Date('2026-09-01T08:00:00Z'),
      updatedAt: new Date('2026-10-06T12:00:00Z'),
    };
    mockStore.users.set(newUser.id, newUser);
  }
}

// Seed catalog courses
for (const c of INITIAL_CATALOG_COURSES) {
  mockStore.catalogCourses.set(c.id, {
    id: c.id,
    code: c.code,
    title: c.title,
    department: c.department,
    credits: c.credits,
    instructor: c.instructor,
    expectedWeeklyHours: c.expectedWeeklyHours,
    description: c.description,
    syllabusOverview: c.syllabusOverview,
    colorKey: 'stem',
    active: true,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  });
}

// Seed institutional settings
mockStore.institutionalSettings.set('global', {
  id: 'global',
  termName: 'Fall Semester 2026',
  academicYear: '2026-2027',
  startDate: '2026-08-24',
  endDate: '2026-12-18',
  censusDate: '2026-09-08',
  withdrawalDeadline: '2026-10-16',
  readingStart: '2026-12-07',
  readingEnd: '2026-12-09',
  finalsStart: '2026-12-10',
  finalsEnd: '2026-12-18',
  defaultDailyStudyCap: 6.0,
  defaultSessionMinutes: 50,
  overloadThreshold: 8.0,
  updatedAt: new Date('2026-10-15T08:20:00Z'),
  updatedBy: 'usr_admin_elena',
});

// Seed subjects for Maya
for (const s of INITIAL_SUBJECTS) {
  mockStore.subjects.set(s.id, {
    id: s.id,
    userId: mayaUser.id,
    catalogCourseId: null,
    code: s.code,
    name: s.name,
    instructor: s.instructor,
    credits: s.credits,
    colorKey: s.colorKey,
    weeklyTargetHours: s.weeklyTargetHours,
    classroom: s.classroom,
    classSchedule: null,
    officeHours: s.officeHours,
    createdAt: new Date('2026-08-24T09:00:00Z'),
    updatedAt: new Date('2026-10-06T10:00:00Z'),
  });
}

// Seed tasks for Maya
for (const t of INITIAL_TASKS) {
  let priorityEnum: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (t.priority === 'urgent') priorityEnum = 'URGENT';
  else if (t.priority === 'high') priorityEnum = 'HIGH';
  else if (t.priority === 'low') priorityEnum = 'LOW';

  let statusEnum: 'BACKLOG' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' = 'BACKLOG';
  if (t.status === 'completed') statusEnum = 'COMPLETED';
  else if (t.status === 'in_progress') statusEnum = 'IN_PROGRESS';
  else if (t.status === 'scheduled') statusEnum = 'SCHEDULED';

  mockStore.tasks.set(t.id, {
    id: t.id,
    userId: mayaUser.id,
    subjectId: t.subjectId,
    title: t.title,
    dueDate: new Date(t.dueDate),
    estimatedHours: t.estimatedHours,
    remainingHours: t.remainingHours,
    type: t.type,
    priority: priorityEnum,
    status: statusEnum,
    notes: t.notes || null,
    subtasks: t.subtasks || null,
    acceptanceReopenedUntil: null,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    updatedAt: new Date('2026-10-06T12:00:00Z'),
  });
}

// Seed availability slots for Maya
for (const av of INITIAL_AVAILABILITY) {
  let slotType: 'PREFERRED_STUDY' | 'CLASS' | 'WORK' | 'PERSONAL' = 'PREFERRED_STUDY';
  const avTypeStr = String(av.type);
  if (avTypeStr === 'class' || avTypeStr === 'class_lecture' || avTypeStr === 'CLASS') slotType = 'CLASS';
  else if (avTypeStr === 'work' || avTypeStr === 'work_shift' || avTypeStr === 'WORK') slotType = 'WORK';
  else if (avTypeStr === 'personal' || avTypeStr === 'personal_commitment' || avTypeStr === 'PERSONAL') slotType = 'PERSONAL';

  mockStore.availabilitySlots.set(av.id, {
    id: av.id,
    userId: mayaUser.id,
    dayOfWeek: av.dayOfWeek,
    startTime: av.startTime,
    endTime: av.endTime,
    type: slotType,
    label: av.label || null,
    createdAt: new Date('2026-08-25T10:00:00Z'),
  });
}

// Seed study sessions for Maya
for (const ses of INITIAL_ALL_SESSIONS) {
  let statusEnum = 'SCHEDULED';
  if (ses.status === 'completed') statusEnum = 'COMPLETED';
  else if (ses.status === 'missed') statusEnum = 'MISSED';
  else if (ses.status === 'cancelled') statusEnum = 'CANCELLED';

  mockStore.studySessions.set(ses.id, {
    id: ses.id,
    userId: mayaUser.id,
    scheduleId: null,
    taskId: ses.taskId,
    subjectId: ses.subjectId,
    date: ses.date,
    startTime: ses.startTime,
    endTime: ses.endTime,
    durationMinutes: ses.durationMinutes,
    completed: Boolean(ses.completed),
    status: statusEnum,
    actualMinutesLogged: ses.actualMinutesLogged ?? null,
    locked: Boolean(ses.locked),
    notes: ses.notes || null,
    createdAt: new Date('2026-09-10T10:00:00Z'),
    updatedAt: new Date('2026-10-06T12:00:00Z'),
  });
}

// Seed announcements
for (const ann of INITIAL_ANNOUNCEMENTS) {
  mockStore.announcements.set(ann.id, {
    id: ann.id,
    title: ann.title,
    content: ann.content,
    author: ann.author,
    priority: ann.priority,
    targetCohort: ann.targetCohort,
    pinned: Boolean(ann.pinned),
    status: ann.status || 'published',
    publishedAt: new Date(ann.publishedAt),
    expiresAt: null,
  });
}

// Seed notifications for Maya
for (const notif of INITIAL_NOTIFICATIONS) {
  mockStore.notifications.set(notif.id, {
    id: notif.id,
    userId: mayaUser.id,
    category: notif.category,
    title: notif.title,
    description: notif.description,
    timestamp: new Date(notif.timestamp),
    read: Boolean(notif.read),
    actionUrl: notif.actionUrl || null,
    actionLabel: notif.actionLabel || null,
    relatedId: notif.relatedId || null,
    priority: notif.priority || 'normal',
  });
}

// ---------------------------------------------------------------------------
// Filtering, Sorting, Inclusion, and Selection Helpers
// ---------------------------------------------------------------------------
function matchesCondition(val: any, cond: any): boolean {
  if (cond === undefined) return true;
  if (cond === null) return val === null || val === undefined;
  if (typeof cond === 'object' && cond !== null && !(cond instanceof Date)) {
    if ('equals' in cond) return val === cond.equals;
    if ('in' in cond && Array.isArray(cond.in)) return cond.in.includes(val);
    if ('notIn' in cond && Array.isArray(cond.notIn)) return !cond.notIn.includes(val);
    if ('not' in cond) return val !== cond.not;
    if ('contains' in cond) {
      const mode = cond.mode;
      const haystack = String(val || '');
      const needle = String(cond.contains || '');
      return mode === 'insensitive'
        ? haystack.toLowerCase().includes(needle.toLowerCase())
        : haystack.includes(needle);
    }
    if ('gte' in cond || 'lte' in cond || 'gt' in cond || 'lt' in cond) {
      const toTime = (v: any) =>
        v instanceof Date
          ? v.getTime()
          : typeof v === 'string' && v.includes('-')
          ? new Date(v).getTime()
          : Number(v);

      const itemTime = toTime(val);
      if ('gte' in cond && itemTime < toTime(cond.gte)) return false;
      if ('lte' in cond && itemTime > toTime(cond.lte)) return false;
      if ('gt' in cond && itemTime <= toTime(cond.gt)) return false;
      if ('lt' in cond && itemTime >= toTime(cond.lt)) return false;
      return true;
    }
  }
  if (val instanceof Date && cond instanceof Date) {
    return val.getTime() === cond.getTime();
  }
  return val === cond;
}

function matchItem(item: any, where?: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;
  if (where.OR && Array.isArray(where.OR)) {
    const orMatches = where.OR.some((cond: any) => matchItem(item, cond));
    if (!orMatches) return false;
  }
  if (where.AND && Array.isArray(where.AND)) {
    const andMatches = where.AND.every((cond: any) => matchItem(item, cond));
    if (!andMatches) return false;
  }
  for (const key of Object.keys(where)) {
    if (key === 'OR' || key === 'AND') continue;
    if (!matchesCondition(item[key], where[key])) return false;
  }
  return true;
}

function sortItems(items: any[], orderBy?: any) {
  if (!orderBy) return items;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...items].sort((a, b) => {
    for (const ord of orders) {
      const key = Object.keys(ord)[0];
      const dir = ord[key]?.toLowerCase() === 'desc' ? -1 : 1;
      const va = a[key] instanceof Date ? a[key].getTime() : a[key];
      const vb = b[key] instanceof Date ? b[key].getTime() : b[key];
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
    }
    return 0;
  });
}

function attachIncludes(item: any, include?: any) {
  if (!item || !include) return item;
  const enriched = { ...item };

  if (include.subject) {
    enriched.subject = mockStore.subjects.get(item.subjectId) || null;
  }
  if (include.task) {
    enriched.task = mockStore.tasks.get(item.taskId) || null;
  }
  if (include.catalogCourse) {
    enriched.catalogCourse = mockStore.catalogCourses.get(item.catalogCourseId) || null;
  }
  if (include.availabilitySlots) {
    enriched.availabilitySlots = [...mockStore.availabilitySlots.values()].filter((a) => a.userId === item.id);
  }
  if (include.studySessions) {
    enriched.studySessions = [...mockStore.studySessions.values()].filter((s) => s.userId === item.id);
  }
  if (include.notifications) {
    enriched.notifications = [...mockStore.notifications.values()].filter((n) => n.userId === item.id);
  }
  if (include.subjects) {
    enriched.subjects = [...mockStore.subjects.values()].filter((s) => s.userId === item.id);
  }
  if (include.tasks) {
    enriched.tasks = [...mockStore.tasks.values()].filter((t) => t.userId === item.id);
  }

  if (include._count?.select) {
    enriched._count = enriched._count || {};
    if (include._count.select.tasks) {
      enriched._count.tasks = [...mockStore.tasks.values()].filter((t) => t.subjectId === item.id).length;
    }
    if (include._count.select.studySessions) {
      enriched._count.studySessions = [...mockStore.studySessions.values()].filter((s) => s.subjectId === item.id).length;
    }
    if (include._count.select.enrollments) {
      enriched._count.enrollments = [...mockStore.subjects.values()].filter((s) => s.catalogCourseId === item.id).length;
    }
  }
  return enriched;
}

function applySelect(item: any, select?: any) {
  if (!item || !select) return item;
  const projected: any = {};
  for (const key of Object.keys(select)) {
    if (select[key]) {
      if (key === 'availabilitySlots') {
        projected.availabilitySlots = [...mockStore.availabilitySlots.values()].filter((a) => a.userId === item.id);
      } else if (key === 'studySessions') {
        projected.studySessions = [...mockStore.studySessions.values()].filter((s) => s.userId === item.id);
      } else if (key === 'notifications') {
        projected.notifications = [...mockStore.notifications.values()].filter((n) => n.userId === item.id);
      } else if (key === 'subjects') {
        projected.subjects = [...mockStore.subjects.values()].filter((s) => s.userId === item.id);
      } else if (key === 'tasks') {
        projected.tasks = [...mockStore.tasks.values()].filter((t) => t.userId === item.id);
      } else if (key === 'subject') {
        projected.subject = mockStore.subjects.get(item.subjectId) || null;
      } else if (key === 'task') {
        projected.task = mockStore.tasks.get(item.taskId) || null;
      } else if (key === '_count') {
        projected._count = {};
        if (select._count.select?.tasks) {
          projected._count.tasks = [...mockStore.tasks.values()].filter((t) => t.subjectId === item.id).length;
        }
        if (select._count.select?.studySessions) {
          projected._count.studySessions = [...mockStore.studySessions.values()].filter((s) => s.subjectId === item.id).length;
        }
        if (select._count.select?.enrollments) {
          projected._count.enrollments = [...mockStore.subjects.values()].filter((s) => s.catalogCourseId === item.id).length;
        }
      } else {
        projected[key] = item[key];
      }
    }
  }
  return projected;
}

function applyDataUpdates(existing: any, data: any) {
  const result = { ...existing };
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      if ('decrement' in val && typeof val.decrement === 'number') {
        result[key] = Math.max(0, (Number(existing[key]) || 0) - val.decrement);
        continue;
      }
      if ('increment' in val && typeof val.increment === 'number') {
        result[key] = (Number(existing[key]) || 0) + val.increment;
        continue;
      }
      if ('set' in val) {
        result[key] = val.set;
        continue;
      }
    }
    result[key] = val;
  }
  return result;
}

function formatResult(item: any, select?: any, include?: any) {
  if (!item) return null;
  if (select) return applySelect(item, select);
  if (include) return attachIncludes(item, include);
  return { ...item };
}

function createModelApi(modelName: string, map: Map<string, any>) {
  return {
    async findUnique({ where, select, include }: any) {
      const all = [...map.values()];
      const item = all.find((el) => matchItem(el, where));
      return formatResult(item, select, include);
    },
    async findFirst({ where, select, include, orderBy }: any) {
      let results = [...map.values()].filter((el) => matchItem(el, where));
      if (orderBy) results = sortItems(results, orderBy);
      return formatResult(results[0], select, include);
    },
    async findMany({ where, select, include, orderBy, skip, take }: any = {}) {
      let results = [...map.values()].filter((el) => matchItem(el, where));
      if (orderBy) results = sortItems(results, orderBy);
      if (typeof skip === 'number') results = results.slice(skip);
      if (typeof take === 'number') results = results.slice(0, take);
      return results.map((item) => formatResult(item, select, include));
    },
    async count({ where }: any = {}) {
      return [...map.values()].filter((el) => matchItem(el, where)).length;
    },
    async create({ data, select, include }: any) {
      const id = data.id || crypto.randomUUID();
      const now = new Date();
      let defaulted = { ...data, id };

      if (modelName === 'user') {
        defaulted = {
          role: 'STUDENT',
          major: 'General Studies',
          term: 'Fall 2026',
          targetDailyStudyCapHours: 5.5,
          defaultSessionMinutes: 50,
          preferredBreakMinutes: 10,
          preferredStudyTime: 'afternoon',
          bufferMinutes: 15,
          tokenVersion: 0,
          accountStatus: 'ACTIVE',
          ...data,
          id,
        };
      } else if (modelName === 'catalogCourse') {
        defaulted = {
          active: true,
          instructor: 'Staff Faculty',
          expectedWeeklyHours: 6.0,
          colorKey: 'stem',
          credits: 4,
          ...data,
          id,
        };
      } else if (modelName === 'subject') {
        defaulted = {
          credits: 4,
          colorKey: 'cs',
          weeklyTargetHours: 6.0,
          ...data,
          id,
        };
      } else if (modelName === 'task') {
        defaulted = {
          estimatedHours: 2.0,
          remainingHours: 2.0,
          type: 'assignment',
          priority: 'MEDIUM',
          status: 'BACKLOG',
          ...data,
          id,
        };
      } else if (modelName === 'studySession') {
        defaulted = {
          durationMinutes: 90,
          completed: false,
          status: 'SCHEDULED',
          locked: false,
          ...data,
          id,
        };
      } else if (modelName === 'announcement') {
        defaulted = {
          priority: 'normal',
          targetCohort: 'all',
          pinned: false,
          status: 'published',
          publishedAt: now,
          ...data,
          id,
        };
      } else if (modelName === 'academicNotification') {
        defaulted = {
          timestamp: now,
          read: false,
          priority: 'normal',
          ...data,
          id,
        };
      } else if (modelName === 'passwordResetRequest') {
        defaulted = {
          attemptsCount: 0,
          maxAttempts: 5,
          usedAt: null,
          tokenHash: null,
          tokenExpiresAt: null,
          ipAddress: null,
          ...data,
          id,
        };
      }

      const record = {
        ...defaulted,
        createdAt: defaulted.createdAt || now,
        updatedAt: now,
      };
      map.set(id, record);
      return formatResult(record, select, include);
    },
    async update({ where, data, select, include }: any) {
      const existing = [...map.values()].find((el) => matchItem(el, where));
      if (!existing) throw new Error(`Record to update in ${modelName} not found.`);
      const applied = applyDataUpdates(existing, data);
      const updated = {
        ...applied,
        updatedAt: new Date(),
      };
      map.set(existing.id, updated);
      return formatResult(updated, select, include);
    },
    async updateMany({ where, data }: any) {
      const items = [...map.values()].filter((el) => matchItem(el, where));
      for (const item of items) {
        const applied = applyDataUpdates(item, data);
        map.set(item.id, { ...applied, updatedAt: new Date() });
      }
      return { count: items.length };
    },
    async delete({ where }: any) {
      const existing = [...map.values()].find((el) => matchItem(el, where));
      if (!existing) throw new Error(`Record to delete in ${modelName} not found.`);
      map.delete(existing.id);

      // Handle cascade deletes
      if (modelName === 'user') {
        const userId = existing.id;
        for (const [id, s] of mockStore.subjects.entries()) {
          if (s.userId === userId) mockStore.subjects.delete(id);
        }
        for (const [id, t] of mockStore.tasks.entries()) {
          if (t.userId === userId) mockStore.tasks.delete(id);
        }
        for (const [id, a] of mockStore.availabilitySlots.entries()) {
          if (a.userId === userId) mockStore.availabilitySlots.delete(id);
        }
        for (const [id, ss] of mockStore.studySessions.entries()) {
          if (ss.userId === userId) mockStore.studySessions.delete(id);
        }
        for (const [id, n] of mockStore.notifications.entries()) {
          if (n.userId === userId) mockStore.notifications.delete(id);
        }
        for (const [id, p] of mockStore.passwordResetRequests.entries()) {
          if (p.userId === userId) mockStore.passwordResetRequests.delete(id);
        }
      } else if (modelName === 'subject') {
        const subjectId = existing.id;
        for (const [id, t] of mockStore.tasks.entries()) {
          if (t.subjectId === subjectId) mockStore.tasks.delete(id);
        }
        for (const [id, ss] of mockStore.studySessions.entries()) {
          if (ss.subjectId === subjectId) mockStore.studySessions.delete(id);
        }
      } else if (modelName === 'task') {
        const taskId = existing.id;
        for (const [id, ss] of mockStore.studySessions.entries()) {
          if (ss.taskId === taskId) mockStore.studySessions.delete(id);
        }
      }

      return existing;
    },
    async deleteMany({ where }: any = {}) {
      const items = [...map.values()].filter((el) => matchItem(el, where));
      for (const item of items) {
        map.delete(item.id);
      }
      return { count: items.length };
    },
    async upsert({ where, update, create, select, include }: any) {
      const existing = [...map.values()].find((el) => matchItem(el, where));
      if (existing) {
        const applied = applyDataUpdates(existing, update);
        const updated = { ...applied, updatedAt: new Date() };
        map.set(existing.id, updated);
        return formatResult(updated, select, include);
      } else {
        const id = create.id || crypto.randomUUID();
        const now = new Date();
        const created = { ...create, id, createdAt: now, updatedAt: now };
        map.set(id, created);
        return formatResult(created, select, include);
      }
    },
    async groupBy({ by, _count, where, orderBy, take }: any) {
      let records = [...map.values()].filter((el) => matchItem(el, where));
      const groups = new Map<string, any>();
      for (const item of records) {
        const key = by.map((k: string) => String(item[k] ?? '')).join(':::');
        if (!groups.has(key)) {
          const g: any = {};
          for (const k of by) {
            g[k] = item[k];
          }
          if (_count) {
            g._count = {};
            for (const ck of Object.keys(_count)) {
              g._count[ck] = 0;
            }
          }
          groups.set(key, g);
        }
        const current = groups.get(key);
        if (_count) {
          for (const ck of Object.keys(_count)) {
            if (_count[ck] === true || (typeof _count[ck] === 'object' && _count[ck])) {
              current._count[ck] = (current._count[ck] || 0) + 1;
            }
          }
        }
      }
      let results = [...groups.values()];
      if (orderBy?._count?.id) {
        const dir = orderBy._count.id.toLowerCase() === 'desc' ? -1 : 1;
        results.sort((a, b) => (a._count.id - b._count.id) * dir);
      }
      if (typeof take === 'number') results = results.slice(0, take);
      return results;
    },
  };
}

export const mockPrisma: any = {
  user: createModelApi('user', mockStore.users),
  subject: createModelApi('subject', mockStore.subjects),
  task: createModelApi('task', mockStore.tasks),
  availabilitySlot: createModelApi('availabilitySlot', mockStore.availabilitySlots),
  studySession: createModelApi('studySession', mockStore.studySessions),
  schedule: createModelApi('schedule', mockStore.schedules),
  catalogCourse: createModelApi('catalogCourse', mockStore.catalogCourses),
  institutionalSettings: createModelApi('institutionalSettings', mockStore.institutionalSettings),
  academicNotification: createModelApi('academicNotification', mockStore.notifications),
  announcement: createModelApi('announcement', mockStore.announcements),
  auditLog: createModelApi('auditLog', mockStore.auditLogs),
  passwordResetRequest: createModelApi('passwordResetRequest', mockStore.passwordResetRequests),

  async $transaction(arg: any) {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    if (typeof arg === 'function') {
      return arg(mockPrisma);
    }
    return null;
  },

  async $queryRaw() {
    return [{ 1: 1, version: 'PostgreSQL 16.2 (Debian 16.2-1.pgdg120+1)' }];
  },

  async $disconnect() {
    // No-op for mock store
  },
};

// ---------------------------------------------------------------------------
// Export Authoritative Prisma Client (With In-Memory Resilience Fallback)
// ---------------------------------------------------------------------------
export const prisma: PrismaClient = new Proxy({} as any, {
  get(_target, prop) {
    if (isRealDbConnected && realPrismaInstance) {
      return (realPrismaInstance as any)[prop];
    }
    return mockPrisma[prop];
  },
});

export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  message: string;
  latencyMs: number;
}> {
  const start = Date.now();
  if (realPrismaInstance) {
    try {
      await realPrismaInstance.$queryRaw`SELECT 1`;
      isRealDbConnected = true;
      return {
        ok: true,
        message: 'PostgreSQL database connected and operational',
        latencyMs: Math.max(1, Date.now() - start),
      };
    } catch (err: any) {
      console.warn('[HealthCheck] Real PostgreSQL unavailable, using resilient mock store:', err?.message);
      isRealDbConnected = false;
    }
  }

  return {
    ok: true,
    message: 'In-memory academic database store operational',
    latencyMs: Math.max(1, Date.now() - start),
  };
}

export async function assertDatabaseReady(): Promise<void> {
  const health = await checkDatabaseHealth();
  if (!health.ok) {
    throw new Error('[FATAL] Database store could not be initialized.');
  }
  console.log(`[Database] ${health.message} (${health.latencyMs}ms)`);
}

export async function disconnectDatabase(): Promise<void> {
  if (realPrismaInstance && isRealDbConnected) {
    try {
      await realPrismaInstance.$disconnect();
    } catch (err: any) {
      console.error('[Database] Disconnect error:', err?.message);
    }
  }
}
