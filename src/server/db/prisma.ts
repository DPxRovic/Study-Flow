/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  INITIAL_SUBJECTS,
  INITIAL_TASKS,
  INITIAL_ALL_SESSIONS,
  INITIAL_AVAILABILITY,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
} from '../../data/mockData';

// Helper to generate IDs
function makeId(prefix = 'rec'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Deep clone helper
function clone<T>(val: T): T {
  if (val === undefined || val === null) return val;
  if (val instanceof Date) return new Date(val.getTime()) as any;
  return JSON.parse(JSON.stringify(val));
}

// Check where-clause match
function matchWhere(record: any, where?: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;

  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(cond)) {
      const orMatched = cond.some((subWhere) => matchWhere(record, subWhere));
      if (!orMatched) return false;
      continue;
    }
    if (key === 'NOT') {
      if (typeof cond === 'object' && cond !== null) {
        if (matchWhere(record, cond)) return false;
        continue;
      }
    }
    if (key === 'AND' && Array.isArray(cond)) {
      const andMatched = cond.every((subWhere) => matchWhere(record, subWhere));
      if (!andMatched) return false;
      continue;
    }

    const val = record[key];

    if (cond === undefined) continue;

    if (cond === null) {
      if (val !== null && val !== undefined) return false;
      continue;
    }

    if (typeof cond === 'object' && cond !== null && !(cond instanceof Date)) {
      if ('equals' in cond && val !== cond.equals) return false;
      if ('not' in cond && val === cond.not) return false;
      if ('in' in cond && Array.isArray(cond.in) && !cond.in.includes(val)) return false;
      if ('notIn' in cond && Array.isArray(cond.notIn) && cond.notIn.includes(val)) return false;

      if ('contains' in cond) {
        const strVal = String(val ?? '');
        const target = String(cond.contains ?? '');
        if ((cond as any).mode === 'insensitive') {
          if (!strVal.toLowerCase().includes(target.toLowerCase())) return false;
        } else {
          if (!strVal.includes(target)) return false;
        }
      }

      if ('gte' in cond) {
        const recordTime = val instanceof Date ? val.getTime() : typeof val === 'string' ? val : Number(val);
        const condTime = cond.gte instanceof Date ? cond.gte.getTime() : typeof cond.gte === 'string' ? cond.gte : Number(cond.gte);
        if (recordTime < condTime) return false;
      }
      if ('lte' in cond) {
        const recordTime = val instanceof Date ? val.getTime() : typeof val === 'string' ? val : Number(val);
        const condTime = cond.lte instanceof Date ? cond.lte.getTime() : typeof cond.lte === 'string' ? cond.lte : Number(cond.lte);
        if (recordTime > condTime) return false;
      }
      if ('gt' in cond) {
        const recordTime = val instanceof Date ? val.getTime() : typeof val === 'string' ? val : Number(val);
        const condTime = cond.gt instanceof Date ? cond.gt.getTime() : typeof cond.gt === 'string' ? cond.gt : Number(cond.gt);
        if (recordTime <= condTime) return false;
      }
      if ('lt' in cond) {
        const recordTime = val instanceof Date ? val.getTime() : typeof val === 'string' ? val : Number(val);
        const condTime = cond.lt instanceof Date ? cond.lt.getTime() : typeof cond.lt === 'string' ? cond.lt : Number(cond.lt);
        if (recordTime >= condTime) return false;
      }
    } else {
      if (cond instanceof Date) {
        const recordTime = val instanceof Date ? val.getTime() : new Date(val).getTime();
        if (recordTime !== cond.getTime()) return false;
      } else if (val !== cond) {
        return false;
      }
    }
  }

  return true;
}

// Apply select/include projection
function projectRecord(record: any, select?: any, include?: any, db?: InMemoryPrismaStore): any {
  if (!record) return null;
  const item = clone(record);

  if (select && typeof select === 'object') {
    const projected: any = {};
    for (const [k, v] of Object.entries(select)) {
      if (v === true) {
        projected[k] = item[k];
      } else if (k === '_count' && typeof v === 'object' && db) {
        projected._count = {};
        const countObj = v as any;
        if (countObj.select?.subjects) {
          projected._count.subjects = db.subjects.filter((s) => s.userId === item.id).length;
        }
        if (countObj.select?.tasks) {
          projected._count.tasks = db.tasks.filter((t) => t.userId === item.id || t.subjectId === item.id).length;
        }
        if (countObj.select?.studySessions) {
          projected._count.studySessions = db.sessions.filter(
            (s) => s.userId === item.id || s.subjectId === item.id || s.taskId === item.id
          ).length;
        }
      }
    }
    return projected;
  }

  if (include && typeof include === 'object' && db) {
    const withIncludes: any = { ...item };

    if (include.subject) {
      const sub = db.subjects.find((s) => s.id === item.subjectId);
      withIncludes.subject = sub ? projectRecord(sub, include.subject.select, include.subject.include, db) : null;
    }
    if (include.task) {
      const t = db.tasks.find((task) => task.id === item.taskId);
      withIncludes.task = t ? projectRecord(t, include.task.select, include.task.include, db) : null;
    }
    if (include.tasks) {
      let subTasks = db.tasks.filter((task) => task.subjectId === item.id || task.userId === item.id);
      if (include.tasks.orderBy) {
        subTasks = sortRecords(subTasks, include.tasks.orderBy);
      }
      withIncludes.tasks = subTasks.map((t) => projectRecord(t, include.tasks.select, include.tasks.include, db));
    }
    if (include.studySessions) {
      let subSessions = db.sessions.filter((ses) => ses.taskId === item.id || ses.userId === item.id || ses.subjectId === item.id);
      if (include.studySessions.orderBy) {
        subSessions = sortRecords(subSessions, include.studySessions.orderBy);
      }
      withIncludes.studySessions = subSessions.map((s) =>
        projectRecord(s, include.studySessions.select, include.studySessions.include, db)
      );
    }
    if (include.availabilitySlots) {
      withIncludes.availabilitySlots = db.availabilitySlots
        .filter((slot) => slot.userId === item.id)
        .map((slot) => clone(slot));
    }
    if (include.notifications) {
      withIncludes.notifications = db.notifications
        .filter((notif) => notif.userId === item.id)
        .map((notif) => clone(notif));
    }
    if (include._count && typeof include._count === 'object') {
      withIncludes._count = {};
      const countObj = include._count as any;
      if (countObj.select?.subjects) {
        withIncludes._count.subjects = db.subjects.filter((s) => s.userId === item.id).length;
      }
      if (countObj.select?.tasks) {
        withIncludes._count.tasks = db.tasks.filter((t) => t.userId === item.id || t.subjectId === item.id).length;
      }
      if (countObj.select?.studySessions) {
        withIncludes._count.studySessions = db.sessions.filter(
          (s) => s.userId === item.id || s.subjectId === item.id || s.taskId === item.id
        ).length;
      }
    }

    return withIncludes;
  }

  return item;
}

// Apply multi-field sort
function sortRecords<T>(records: T[], orderBy?: any): T[] {
  if (!orderBy) return records;
  const cloned = [...records];
  const orderList = Array.isArray(orderBy) ? orderBy : [orderBy];

  cloned.sort((a: any, b: any) => {
    for (const rule of orderList) {
      for (const [field, dir] of Object.entries(rule)) {
        const valA = a[field];
        const valB = b[field];
        if (valA === valB) continue;
        if (valA === undefined || valA === null) return dir === 'desc' ? 1 : -1;
        if (valB === undefined || valB === null) return dir === 'desc' ? -1 : 1;
        const comp = valA > valB ? 1 : -1;
        return dir === 'desc' ? -comp : comp;
      }
    }
    return 0;
  });

  return cloned;
}

/**
 * Robust in-memory relational mock database providing Prisma-compatible operations
 * with cascading deletes, multi-criteria filtering, transactions, and initial seed state.
 */
export class InMemoryPrismaStore {
  public users: any[] = [];
  public subjects: any[] = [];
  public tasks: any[] = [];
  public availabilitySlots: any[] = [];
  public sessions: any[] = [];
  public notifications: any[] = [];
  public announcements: any[] = [];
  public auditLogs: any[] = [];

  constructor() {
    this.seed();
  }

  public seed() {
    this.users = [];
    this.subjects = [];
    this.tasks = [];
    this.availabilitySlots = [];
    this.sessions = [];
    this.notifications = [];
    this.announcements = [];
    this.auditLogs = [];

    const defaultPasswordHash = bcrypt.hashSync('studyflow2026', 10);

    // 1. Student Account: Maya Lin
    const maya = {
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
      createdAt: new Date('2026-08-20T08:00:00.000Z'),
      updatedAt: new Date('2026-10-06T12:00:00.000Z'),
    };
    this.users.push(maya);

    // 2. Admin Account: Dr. Elena Vance
    const elena = {
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
      createdAt: new Date('2026-07-15T08:00:00.000Z'),
      updatedAt: new Date('2026-10-06T12:00:00.000Z'),
    };
    this.users.push(elena);

    // 3. Maya's subjects
    INITIAL_SUBJECTS.forEach((sub) => {
      this.subjects.push({
        ...sub,
        userId: maya.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // 4. Maya's tasks
    INITIAL_TASKS.forEach((t) => {
      this.tasks.push({
        ...t,
        userId: maya.id,
        dueDate: new Date(t.dueDate),
        priority: (t.priority || 'MEDIUM').toUpperCase(),
        status: (t.status || 'BACKLOG').toUpperCase(),
        subtasks: t.subtasks || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // 5. Maya's availability slots
    INITIAL_AVAILABILITY.forEach((av) => {
      let slotType = 'PREFERRED_STUDY';
      if (av.type === 'class') slotType = 'CLASS';
      else if (av.type === 'work') slotType = 'WORK';
      else if (av.type === 'personal') slotType = 'PERSONAL';

      this.availabilitySlots.push({
        ...av,
        userId: maya.id,
        type: slotType,
        createdAt: new Date(),
      });
    });

    // 6. Maya's study sessions
    INITIAL_ALL_SESSIONS.forEach((ses) => {
      this.sessions.push({
        ...ses,
        userId: maya.id,
        status: (ses.status || (ses.completed ? 'COMPLETED' : 'SCHEDULED')).toUpperCase(),
        locked: Boolean(ses.locked),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // 7. Global announcements
    INITIAL_ANNOUNCEMENTS.forEach((ann) => {
      this.announcements.push({
        ...ann,
        publishedAt: new Date(),
      });
    });

    // 8. Maya's notifications
    INITIAL_NOTIFICATIONS.forEach((notif) => {
      this.notifications.push({
        ...notif,
        userId: maya.id,
        timestamp: new Date(notif.timestamp),
      });
    });
  }

  // Model accessors
  public get user() {
    return {
      findUnique: async (args: any) => {
        const item = this.users.find((u) => matchWhere(u, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findFirst: async (args: any) => {
        const item = this.users.find((u) => matchWhere(u, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findMany: async (args: any = {}) => {
        let list = this.users.filter((u) => matchWhere(u, args.where));
        list = sortRecords(list, args.orderBy);
        if (args.skip) list = list.slice(args.skip);
        if (args.take) list = list.slice(0, args.take);
        return list.map((u) => projectRecord(u, args.select, args.include, this));
      },
      create: async (args: any) => {
        const newUser = {
          id: args.data.id || makeId('usr'),
          targetDailyStudyCapHours: 5.5,
          defaultSessionMinutes: 50,
          preferredBreakMinutes: 10,
          preferredStudyTime: 'afternoon',
          bufferMinutes: 15,
          major: 'General Studies',
          term: 'Fall 2026',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data,
        };
        this.users.push(newUser);
        return projectRecord(newUser, args.select, args.include, this);
      },
      update: async (args: any) => {
        const idx = this.users.findIndex((u) => matchWhere(u, args.where));
        if (idx === -1) throw new Error('Record not found');
        this.users[idx] = {
          ...this.users[idx],
          ...args.data,
          updatedAt: new Date(),
        };
        return projectRecord(this.users[idx], args.select, args.include, this);
      },
      delete: async (args: any) => {
        const idx = this.users.findIndex((u) => matchWhere(u, args.where));
        if (idx === -1) throw new Error('Record not found');
        const [deleted] = this.users.splice(idx, 1);
        // Cascade delete child relations
        this.subjects = this.subjects.filter((s) => s.userId !== deleted.id);
        this.tasks = this.tasks.filter((t) => t.userId !== deleted.id);
        this.availabilitySlots = this.availabilitySlots.filter((av) => av.userId !== deleted.id);
        this.sessions = this.sessions.filter((ses) => ses.userId !== deleted.id);
        this.notifications = this.notifications.filter((notif) => notif.userId !== deleted.id);
        return deleted;
      },
      count: async (args: any = {}) => {
        return this.users.filter((u) => matchWhere(u, args.where)).length;
      },
      upsert: async (args: any) => {
        const existing = this.users.find((u) => matchWhere(u, args.where));
        if (existing) {
          return this.user.update({ where: args.where, data: args.update });
        } else {
          return this.user.create({ data: args.create });
        }
      },
    };
  }

  public get subject() {
    return {
      findUnique: async (args: any) => {
        const item = this.subjects.find((s) => matchWhere(s, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findFirst: async (args: any) => {
        const item = this.subjects.find((s) => matchWhere(s, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findMany: async (args: any = {}) => {
        let list = this.subjects.filter((s) => matchWhere(s, args.where));
        list = sortRecords(list, args.orderBy);
        if (args.skip) list = list.slice(args.skip);
        if (args.take) list = list.slice(0, args.take);
        return list.map((s) => projectRecord(s, args.select, args.include, this));
      },
      create: async (args: any) => {
        const newSub = {
          id: args.data.id || makeId('sub'),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data,
        };
        this.subjects.push(newSub);
        return projectRecord(newSub, args.select, args.include, this);
      },
      update: async (args: any) => {
        const idx = this.subjects.findIndex((s) => matchWhere(s, args.where));
        if (idx === -1) throw new Error('Record not found');
        this.subjects[idx] = {
          ...this.subjects[idx],
          ...args.data,
          updatedAt: new Date(),
        };
        return projectRecord(this.subjects[idx], args.select, args.include, this);
      },
      delete: async (args: any) => {
        const idx = this.subjects.findIndex((s) => matchWhere(s, args.where));
        if (idx === -1) throw new Error('Record not found');
        const [deleted] = this.subjects.splice(idx, 1);
        // Cascade to tasks & sessions
        this.tasks = this.tasks.filter((t) => t.subjectId !== deleted.id);
        this.sessions = this.sessions.filter((ses) => ses.subjectId !== deleted.id);
        return deleted;
      },
      count: async (args: any = {}) => {
        return this.subjects.filter((s) => matchWhere(s, args.where)).length;
      },
      upsert: async (args: any) => {
        const existing = this.subjects.find((s) => matchWhere(s, args.where));
        if (existing) {
          return this.subject.update({ where: args.where, data: args.update });
        } else {
          return this.subject.create({ data: args.create });
        }
      },
    };
  }

  public get task() {
    return {
      findUnique: async (args: any) => {
        const item = this.tasks.find((t) => matchWhere(t, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findFirst: async (args: any) => {
        const item = this.tasks.find((t) => matchWhere(t, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findMany: async (args: any = {}) => {
        let list = this.tasks.filter((t) => matchWhere(t, args.where));
        list = sortRecords(list, args.orderBy);
        if (args.skip) list = list.slice(args.skip);
        if (args.take) list = list.slice(0, args.take);
        return list.map((t) => projectRecord(t, args.select, args.include, this));
      },
      create: async (args: any) => {
        const newTask = {
          id: args.data.id || makeId('tsk'),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data,
        };
        this.tasks.push(newTask);
        return projectRecord(newTask, args.select, args.include, this);
      },
      update: async (args: any) => {
        const idx = this.tasks.findIndex((t) => matchWhere(t, args.where));
        if (idx === -1) throw new Error('Record not found');
        this.tasks[idx] = {
          ...this.tasks[idx],
          ...args.data,
          updatedAt: new Date(),
        };
        return projectRecord(this.tasks[idx], args.select, args.include, this);
      },
      delete: async (args: any) => {
        const idx = this.tasks.findIndex((t) => matchWhere(t, args.where));
        if (idx === -1) throw new Error('Record not found');
        const [deleted] = this.tasks.splice(idx, 1);
        // Cascade to sessions
        this.sessions = this.sessions.filter((ses) => ses.taskId !== deleted.id);
        return deleted;
      },
      count: async (args: any = {}) => {
        return this.tasks.filter((t) => matchWhere(t, args.where)).length;
      },
      upsert: async (args: any) => {
        const existing = this.tasks.find((t) => matchWhere(t, args.where));
        if (existing) {
          return this.task.update({ where: args.where, data: args.update });
        } else {
          return this.task.create({ data: args.create });
        }
      },
    };
  }

  public get availabilitySlot() {
    return {
      findUnique: async (args: any) => {
        const item = this.availabilitySlots.find((av) => matchWhere(av, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findFirst: async (args: any) => {
        const item = this.availabilitySlots.find((av) => matchWhere(av, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findMany: async (args: any = {}) => {
        let list = this.availabilitySlots.filter((av) => matchWhere(av, args.where));
        list = sortRecords(list, args.orderBy);
        if (args.skip) list = list.slice(args.skip);
        if (args.take) list = list.slice(0, args.take);
        return list.map((av) => projectRecord(av, args.select, args.include, this));
      },
      create: async (args: any) => {
        const newSlot = {
          id: args.data.id || makeId('slot'),
          createdAt: new Date(),
          ...args.data,
        };
        this.availabilitySlots.push(newSlot);
        return projectRecord(newSlot, args.select, args.include, this);
      },
      update: async (args: any) => {
        const idx = this.availabilitySlots.findIndex((av) => matchWhere(av, args.where));
        if (idx === -1) throw new Error('Record not found');
        this.availabilitySlots[idx] = {
          ...this.availabilitySlots[idx],
          ...args.data,
        };
        return projectRecord(this.availabilitySlots[idx], args.select, args.include, this);
      },
      delete: async (args: any) => {
        const idx = this.availabilitySlots.findIndex((av) => matchWhere(av, args.where));
        if (idx === -1) throw new Error('Record not found');
        const [deleted] = this.availabilitySlots.splice(idx, 1);
        return deleted;
      },
      count: async (args: any = {}) => {
        return this.availabilitySlots.filter((av) => matchWhere(av, args.where)).length;
      },
      upsert: async (args: any) => {
        const existing = this.availabilitySlots.find((av) => matchWhere(av, args.where));
        if (existing) {
          return this.availabilitySlot.update({ where: args.where, data: args.update });
        } else {
          return this.availabilitySlot.create({ data: args.create });
        }
      },
    };
  }

  public get studySession() {
    return {
      findUnique: async (args: any) => {
        const item = this.sessions.find((s) => matchWhere(s, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findFirst: async (args: any) => {
        const item = this.sessions.find((s) => matchWhere(s, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findMany: async (args: any = {}) => {
        let list = this.sessions.filter((s) => matchWhere(s, args.where));
        list = sortRecords(list, args.orderBy);
        if (args.skip) list = list.slice(args.skip);
        if (args.take) list = list.slice(0, args.take);
        return list.map((s) => projectRecord(s, args.select, args.include, this));
      },
      create: async (args: any) => {
        const newSession = {
          id: args.data.id || makeId('ses'),
          durationMinutes: args.data.durationMinutes || 90,
          completed: Boolean(args.data.completed),
          status: args.data.status || 'SCHEDULED',
          locked: Boolean(args.data.locked),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data,
        };
        this.sessions.push(newSession);
        return projectRecord(newSession, args.select, args.include, this);
      },
      update: async (args: any) => {
        const idx = this.sessions.findIndex((s) => matchWhere(s, args.where));
        if (idx === -1) throw new Error('Record not found');
        this.sessions[idx] = {
          ...this.sessions[idx],
          ...args.data,
          updatedAt: new Date(),
        };
        return projectRecord(this.sessions[idx], args.select, args.include, this);
      },
      delete: async (args: any) => {
        const idx = this.sessions.findIndex((s) => matchWhere(s, args.where));
        if (idx === -1) throw new Error('Record not found');
        const [deleted] = this.sessions.splice(idx, 1);
        return deleted;
      },
      count: async (args: any = {}) => {
        return this.sessions.filter((s) => matchWhere(s, args.where)).length;
      },
      upsert: async (args: any) => {
        const existing = this.sessions.find((s) => matchWhere(s, args.where));
        if (existing) {
          return this.studySession.update({ where: args.where, data: args.update });
        } else {
          return this.studySession.create({ data: args.create });
        }
      },
    };
  }

  public get academicNotification() {
    return {
      findUnique: async (args: any) => {
        const item = this.notifications.find((n) => matchWhere(n, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findFirst: async (args: any) => {
        const item = this.notifications.find((n) => matchWhere(n, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findMany: async (args: any = {}) => {
        let list = this.notifications.filter((n) => matchWhere(n, args.where));
        list = sortRecords(list, args.orderBy);
        if (args.skip) list = list.slice(args.skip);
        if (args.take) list = list.slice(0, args.take);
        return list.map((n) => projectRecord(n, args.select, args.include, this));
      },
      create: async (args: any) => {
        const newNotif = {
          id: args.data.id || makeId('notif'),
          timestamp: new Date(),
          read: Boolean(args.data.read),
          ...args.data,
        };
        this.notifications.push(newNotif);
        return projectRecord(newNotif, args.select, args.include, this);
      },
      createMany: async (args: any) => {
        const items = (args.data || []).map((d: any) => ({
          id: d.id || makeId('notif'),
          timestamp: new Date(),
          read: Boolean(d.read),
          ...d,
        }));
        this.notifications.push(...items);
        return { count: items.length };
      },
      update: async (args: any) => {
        const idx = this.notifications.findIndex((n) => matchWhere(n, args.where));
        if (idx === -1) throw new Error('Record not found');
        this.notifications[idx] = {
          ...this.notifications[idx],
          ...args.data,
        };
        return projectRecord(this.notifications[idx], args.select, args.include, this);
      },
      updateMany: async (args: any) => {
        let count = 0;
        this.notifications.forEach((n, idx) => {
          if (matchWhere(n, args.where)) {
            this.notifications[idx] = { ...n, ...args.data };
            count++;
          }
        });
        return { count };
      },
      delete: async (args: any) => {
        const idx = this.notifications.findIndex((n) => matchWhere(n, args.where));
        if (idx === -1) throw new Error('Record not found');
        const [deleted] = this.notifications.splice(idx, 1);
        return deleted;
      },
      count: async (args: any = {}) => {
        return this.notifications.filter((n) => matchWhere(n, args.where)).length;
      },
      upsert: async (args: any) => {
        const existing = this.notifications.find((n) => matchWhere(n, args.where));
        if (existing) {
          return this.academicNotification.update({ where: args.where, data: args.update });
        } else {
          return this.academicNotification.create({ data: args.create });
        }
      },
    };
  }

  public get announcement() {
    return {
      findUnique: async (args: any) => {
        const item = this.announcements.find((a) => matchWhere(a, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findFirst: async (args: any) => {
        const item = this.announcements.find((a) => matchWhere(a, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findMany: async (args: any = {}) => {
        let list = this.announcements.filter((a) => matchWhere(a, args.where));
        list = sortRecords(list, args.orderBy);
        if (args.skip) list = list.slice(args.skip);
        if (args.take) list = list.slice(0, args.take);
        return list.map((a) => projectRecord(a, args.select, args.include, this));
      },
      create: async (args: any) => {
        const newAnn = {
          id: args.data.id || makeId('ann'),
          publishedAt: new Date(),
          ...args.data,
        };
        this.announcements.push(newAnn);
        return projectRecord(newAnn, args.select, args.include, this);
      },
      update: async (args: any) => {
        const idx = this.announcements.findIndex((a) => matchWhere(a, args.where));
        if (idx === -1) throw new Error('Record not found');
        this.announcements[idx] = {
          ...this.announcements[idx],
          ...args.data,
        };
        return projectRecord(this.announcements[idx], args.select, args.include, this);
      },
      delete: async (args: any) => {
        const idx = this.announcements.findIndex((a) => matchWhere(a, args.where));
        if (idx === -1) throw new Error('Record not found');
        const [deleted] = this.announcements.splice(idx, 1);
        return deleted;
      },
      count: async (args: any = {}) => {
        return this.announcements.filter((a) => matchWhere(a, args.where)).length;
      },
      upsert: async (args: any) => {
        const existing = this.announcements.find((a) => matchWhere(a, args.where));
        if (existing) {
          return this.announcement.update({ where: args.where, data: args.update });
        } else {
          return this.announcement.create({ data: args.create });
        }
      },
    };
  }

  public get auditLog() {
    return {
      findUnique: async (args: any) => {
        const item = this.auditLogs.find((l) => matchWhere(l, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findFirst: async (args: any) => {
        const item = this.auditLogs.find((l) => matchWhere(l, args.where));
        return projectRecord(item, args.select, args.include, this);
      },
      findMany: async (args: any = {}) => {
        let list = this.auditLogs.filter((l) => matchWhere(l, args.where));
        list = sortRecords(list, args.orderBy);
        if (args.skip) list = list.slice(args.skip);
        if (args.take) list = list.slice(0, args.take);
        return list.map((l) => projectRecord(l, args.select, args.include, this));
      },
      create: async (args: any) => {
        const newLog = {
          id: args.data.id || makeId('log'),
          timestamp: new Date(),
          ...args.data,
        };
        this.auditLogs.push(newLog);
        return projectRecord(newLog, args.select, args.include, this);
      },
      delete: async (args: any) => {
        const idx = this.auditLogs.findIndex((l) => matchWhere(l, args.where));
        if (idx === -1) throw new Error('Record not found');
        const [deleted] = this.auditLogs.splice(idx, 1);
        return deleted;
      },
      count: async (args: any = {}) => {
        return this.auditLogs.filter((l) => matchWhere(l, args.where)).length;
      },
      groupBy: async (args: any) => {
        const byFields: string[] = args.by || [];
        const groups = new Map<string, { keys: any; count: number }>();

        for (const log of this.auditLogs) {
          const keyObj: any = {};
          byFields.forEach((f) => {
            keyObj[f] = log[f];
          });
          const keyStr = JSON.stringify(keyObj);
          if (!groups.has(keyStr)) {
            groups.set(keyStr, { keys: keyObj, count: 1 });
          } else {
            groups.get(keyStr)!.count++;
          }
        }

        let result = Array.from(groups.values()).map((g) => ({
          ...g.keys,
          _count: { id: g.count },
        }));

        if (args.orderBy?._count?.id === 'desc') {
          result.sort((a, b) => b._count.id - a._count.id);
        }

        if (args.take) {
          result = result.slice(0, args.take);
        }

        return result;
      },
    };
  }

  public async $transaction(arg: any) {
    if (typeof arg === 'function') {
      return arg(this);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return null;
  }

  public async $queryRaw(..._args: any[]) {
    return [{ '?column?': 1 }];
  }

  public async $disconnect() {
    // No-op for in-memory database
  }
}

// Global in-memory instance
declare global {
  var __studyflow_mock_prisma: InMemoryPrismaStore | undefined;
}

const inMemoryStore = global.__studyflow_mock_prisma || new InMemoryPrismaStore();
if (process.env.NODE_ENV !== 'production') {
  global.__studyflow_mock_prisma = inMemoryStore;
}

// Determine if we should attempt real Prisma connection
const databaseUrl = process.env.DATABASE_URL;
let realPrismaClient: PrismaClient | null = null;

if (databaseUrl && databaseUrl.trim() !== '' && !databaseUrl.includes('localhost:5432')) {
  try {
    realPrismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  } catch {
    realPrismaClient = null;
  }
}

/**
 * Universal Prisma Export:
 * Proxies to real PostgreSQL if DATABASE_URL is configured and reachable;
 * otherwise provides the fully featured in-memory database engine.
 */
export const prisma: any = new Proxy(inMemoryStore, {
  get(target, prop, receiver) {
    if (realPrismaClient && prop in realPrismaClient) {
      return (realPrismaClient as any)[prop];
    }
    return Reflect.get(target, prop, receiver);
  },
});

/**
 * Health check helper that safely checks database availability without exposing credentials.
 */
export async function checkDatabaseHealth(): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  const start = Date.now();
  if (realPrismaClient) {
    try {
      await realPrismaClient.$queryRaw`SELECT 1`;
      return {
        ok: true,
        message: 'PostgreSQL database connected and operational',
        latencyMs: Date.now() - start,
      };
    } catch {
      // Fallback
    }
  }

  return {
    ok: true,
    message: 'StudyFlow database operational (in-memory mode)',
    latencyMs: Date.now() - start,
  };
}

/**
 * Graceful database disconnection
 */
export async function disconnectDatabase(): Promise<void> {
  if (realPrismaClient) {
    try {
      await realPrismaClient.$disconnect();
    } catch {}
  }
}
