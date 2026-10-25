/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  INITIAL_SUBJECTS,
  INITIAL_TASKS,
  INITIAL_ALL_SESSIONS,
  INITIAL_AVAILABILITY,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_DIRECTORY_USERS,
} from '../../data/mockData';

// Default password hash for pre-seeded test accounts ("studyflow2026")
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('studyflow2026', 10);

interface StoreCollections {
  user: Map<string, any>;
  subject: Map<string, any>;
  task: Map<string, any>;
  availabilitySlot: Map<string, any>;
  schedule: Map<string, any>;
  studySession: Map<string, any>;
  academicNotification: Map<string, any>;
  announcement: Map<string, any>;
  auditLog: Map<string, any>;
  passwordResetRequest: Map<string, any>;
}

function initializeStores(): StoreCollections {
  const stores: StoreCollections = {
    user: new Map(),
    subject: new Map(),
    task: new Map(),
    availabilitySlot: new Map(),
    schedule: new Map(),
    studySession: new Map(),
    academicNotification: new Map(),
    announcement: new Map(),
    auditLog: new Map(),
    passwordResetRequest: new Map(),
  };

  const now = new Date();

  // 1. Seed Student: Maya Lin
  stores.user.set('usr_student_maya', {
    id: 'usr_student_maya',
    email: 'm.lin@university.edu',
    passwordHash: DEFAULT_PASSWORD_HASH,
    name: 'Maya Lin',
    role: 'STUDENT',
    major: 'Computer Science & Mathematics',
    term: 'Fall 2026',
    targetDailyStudyCapHours: 5.5,
    defaultSessionMinutes: 50,
    preferredBreakMinutes: 10,
    preferredStudyTime: 'afternoon',
    bufferMinutes: 15,
    createdAt: now,
    updatedAt: now,
  });

  // 2. Seed Admin: Dr. Elena Vance
  stores.user.set('usr_admin_elena', {
    id: 'usr_admin_elena',
    email: 'e.vance@university.edu',
    passwordHash: DEFAULT_PASSWORD_HASH,
    name: 'Dr. Elena Vance',
    role: 'ADMIN',
    major: 'Dean of Academic Operations & Curriculum',
    term: 'Fall 2026',
    targetDailyStudyCapHours: 5.5,
    defaultSessionMinutes: 50,
    preferredBreakMinutes: 10,
    preferredStudyTime: 'afternoon',
    bufferMinutes: 15,
    createdAt: now,
    updatedAt: now,
  });

  // 3. Seed other directory users
  for (const dirUser of INITIAL_DIRECTORY_USERS) {
    if (dirUser.email === 'm.lin@university.edu' || dirUser.email === 'e.vance@university.edu') continue;
    stores.user.set(dirUser.id, {
      id: dirUser.id,
      email: dirUser.email,
      passwordHash: DEFAULT_PASSWORD_HASH,
      name: dirUser.name,
      role: dirUser.role.toUpperCase(),
      major: dirUser.major,
      term: 'Fall 2026',
      targetDailyStudyCapHours: 5.5,
      defaultSessionMinutes: 50,
      preferredBreakMinutes: 10,
      preferredStudyTime: 'afternoon',
      bufferMinutes: 15,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 4. Seed Course Subjects for Maya
  for (const s of INITIAL_SUBJECTS) {
    stores.subject.set(s.id, {
      id: s.id,
      userId: 'usr_student_maya',
      code: s.code,
      name: s.name,
      instructor: s.instructor,
      credits: s.credits,
      colorKey: s.colorKey,
      weeklyTargetHours: s.weeklyTargetHours,
      classroom: s.classroom,
      officeHours: s.officeHours,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 5. Seed Tasks for Maya
  for (const t of INITIAL_TASKS) {
    let priority = 'MEDIUM';
    if (t.priority === 'urgent') priority = 'URGENT';
    else if (t.priority === 'high') priority = 'HIGH';
    else if (t.priority === 'low') priority = 'LOW';

    let status = 'BACKLOG';
    if (t.status === 'completed') status = 'COMPLETED';
    else if (t.status === 'in_progress') status = 'IN_PROGRESS';
    else if (t.status === 'scheduled') status = 'SCHEDULED';

    stores.task.set(t.id, {
      id: t.id,
      userId: 'usr_student_maya',
      subjectId: t.subjectId,
      title: t.title,
      dueDate: new Date(t.dueDate),
      estimatedHours: t.estimatedHours,
      remainingHours: t.remainingHours,
      type: t.type,
      priority,
      status,
      notes: t.notes,
      subtasks: t.subtasks ? JSON.parse(JSON.stringify(t.subtasks)) : null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 6. Seed Availability Slots for Maya
  for (const av of INITIAL_AVAILABILITY) {
    let slotType = 'PREFERRED_STUDY';
    const avType = String(av.type);
    if (avType === 'class_lecture' || avType === 'class' || avType === 'CLASS') slotType = 'CLASS';
    else if (avType === 'work_shift' || avType === 'work' || avType === 'WORK') slotType = 'WORK';
    else if (avType === 'personal_commitment' || avType === 'personal' || avType === 'PERSONAL') slotType = 'PERSONAL';

    stores.availabilitySlot.set(av.id, {
      id: av.id,
      userId: 'usr_student_maya',
      dayOfWeek: av.dayOfWeek,
      startTime: av.startTime,
      endTime: av.endTime,
      type: slotType,
      label: av.label,
      createdAt: now,
    });
  }

  // 7. Seed Scheduled Study Sessions
  for (const ses of INITIAL_ALL_SESSIONS) {
    stores.studySession.set(ses.id, {
      id: ses.id,
      userId: 'usr_student_maya',
      taskId: ses.taskId,
      subjectId: ses.subjectId,
      date: ses.date,
      startTime: ses.startTime,
      endTime: ses.endTime,
      durationMinutes: ses.durationMinutes,
      completed: ses.completed,
      status: ses.status ? ses.status.toUpperCase() : 'SCHEDULED',
      actualMinutesLogged: ses.actualMinutesLogged || null,
      locked: ses.locked || false,
      notes: ses.notes || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 8. Seed Announcements
  for (const ann of INITIAL_ANNOUNCEMENTS) {
    stores.announcement.set(ann.id, {
      id: ann.id,
      title: ann.title,
      content: ann.content,
      author: ann.author,
      priority: ann.priority,
      targetCohort: ann.targetCohort,
      pinned: ann.pinned || false,
      status: ann.status || 'published',
      publishedAt: new Date(ann.publishedAt),
      expiresAt: null,
    });
  }

  // 9. Seed Academic Notifications
  for (const notif of INITIAL_NOTIFICATIONS) {
    stores.academicNotification.set(notif.id, {
      id: notif.id,
      userId: 'usr_student_maya',
      category: notif.category,
      title: notif.title,
      description: notif.description,
      timestamp: new Date(notif.timestamp),
      read: notif.read,
      actionUrl: notif.actionUrl,
      actionLabel: notif.actionLabel,
      relatedId: notif.relatedId,
      priority: notif.priority,
    });
  }

  // 10. Seed Audit Logs
  const INITIAL_AUDIT_LOGS = [
    {
      id: 'audit_seed_1',
      adminId: 'usr_admin_elena',
      adminEmail: 'e.vance@university.edu',
      adminName: 'Dr. Elena Vance',
      action: 'USER_ROLE_UPDATE',
      category: 'user_management',
      targetId: 'stu_02',
      targetType: 'User',
      details: 'Elevated Jordan Reed (j.reed@university.edu) from STUDENT to TA for recitation sections',
      ipAddress: '192.168.1.104',
      timestamp: new Date('2026-10-14T09:15:00Z'),
    },
    {
      id: 'audit_seed_2',
      adminId: 'usr_admin_elena',
      adminEmail: 'e.vance@university.edu',
      adminName: 'Dr. Elena Vance',
      action: 'ANNOUNCEMENT_CREATE',
      category: 'broadcast',
      targetId: 'ann_01',
      targetType: 'Announcement',
      details: 'Broadcasted campus announcement "Midterm Study Sprint: Peer Tutoring Available" to cohort: all (priority: important)',
      ipAddress: '192.168.1.104',
      timestamp: new Date('2026-10-14T11:30:00Z'),
    },
    {
      id: 'audit_seed_3',
      adminId: 'usr_admin_elena',
      adminEmail: 'e.vance@university.edu',
      adminName: 'Dr. Elena Vance',
      action: 'SETTINGS_UPDATE',
      category: 'security',
      targetId: 'sys_policy_fatigue',
      targetType: 'System',
      details: 'Calibrated campus daily study fatigue threshold to 6.0 hours with 8.0h overload alert trigger',
      ipAddress: '192.168.1.104',
      timestamp: new Date('2026-10-15T08:20:00Z'),
    },
    {
      id: 'audit_seed_4',
      adminId: 'usr_admin_elena',
      adminEmail: 'e.vance@university.edu',
      adminName: 'Dr. Elena Vance',
      action: 'USER_STATUS_CHANGE',
      category: 'user_management',
      targetId: 'usr_student_maya',
      targetType: 'User',
      details: 'Confirmed academic registration and dual-degree major for Maya Lin (Computer Science & Mathematics)',
      ipAddress: '192.168.1.104',
      timestamp: new Date('2026-10-15T14:45:00Z'),
    },
    {
      id: 'audit_seed_5',
      adminId: 'usr_admin_elena',
      adminEmail: 'e.vance@university.edu',
      adminName: 'Dr. Elena Vance',
      action: 'CURRICULUM_UPDATE',
      category: 'curriculum',
      targetId: 'sub_cs201',
      targetType: 'Subject',
      details: 'Calibrated master curriculum expectations for CS 201: recommended weekly pacing set to 6.0h',
      ipAddress: '192.168.1.104',
      timestamp: new Date('2026-10-16T10:00:00Z'),
    },
    {
      id: 'audit_seed_6',
      adminId: 'usr_admin_elena',
      adminEmail: 'e.vance@university.edu',
      adminName: 'Dr. Elena Vance',
      action: 'ANNOUNCEMENT_DELETE',
      category: 'broadcast',
      targetId: 'ann_archived_legacy',
      targetType: 'Announcement',
      details: 'Deleted expired syllabus orientation broadcast notice after census date',
      ipAddress: '192.168.1.104',
      timestamp: new Date('2026-10-16T16:10:00Z'),
    },
    {
      id: 'audit_seed_7',
      adminId: 'usr_admin_elena',
      adminEmail: 'e.vance@university.edu',
      adminName: 'Dr. Elena Vance',
      action: 'CALENDAR_CALIBRATION',
      category: 'system',
      targetId: 'term_fall_2026',
      targetType: 'System',
      details: 'Finalized Fall 2026 Reading Period boundaries (Dec 07 - Dec 09) and Finals Examination window (Dec 10 - Dec 18)',
      ipAddress: '192.168.1.104',
      timestamp: new Date('2026-10-17T09:00:00Z'),
    },
  ];

  for (const log of INITIAL_AUDIT_LOGS) {
    stores.auditLog.set(log.id, { ...log });
  }

  return stores;
}

const stores = initializeStores();

function matchesCondition(itemVal: any, condVal: any): boolean {
  if (condVal === null || condVal === undefined) {
    return itemVal === null || itemVal === undefined;
  }

  if (typeof condVal === 'object' && !(condVal instanceof Date)) {
    if ('contains' in condVal) {
      if (typeof itemVal !== 'string') return false;
      const needle = String(condVal.contains);
      const haystack = itemVal;
      if (condVal.mode === 'insensitive') {
        return haystack.toLowerCase().includes(needle.toLowerCase());
      }
      return haystack.includes(needle);
    }
    if ('in' in condVal && Array.isArray(condVal.in)) {
      return condVal.in.includes(itemVal);
    }
    if ('notIn' in condVal && Array.isArray(condVal.notIn)) {
      return !condVal.notIn.includes(itemVal);
    }
    if ('not' in condVal) {
      return !matchesCondition(itemVal, condVal.not);
    }
    if ('gte' in condVal) {
      const gteVal = condVal.gte;
      if (gteVal instanceof Date) {
        if (!itemVal) return false;
        return new Date(itemVal).getTime() >= gteVal.getTime();
      }
      return itemVal >= gteVal;
    }
    if ('lte' in condVal) {
      const lteVal = condVal.lte;
      if (lteVal instanceof Date) {
        if (!itemVal) return false;
        return new Date(itemVal).getTime() <= lteVal.getTime();
      }
      return itemVal <= lteVal;
    }
    if ('gt' in condVal) {
      const gtVal = condVal.gt;
      if (gtVal instanceof Date) {
        if (!itemVal) return false;
        return new Date(itemVal).getTime() > gtVal.getTime();
      }
      return itemVal > gtVal;
    }
    if ('lt' in condVal) {
      const ltVal = condVal.lt;
      if (ltVal instanceof Date) {
        if (!itemVal) return false;
        return new Date(itemVal).getTime() < ltVal.getTime();
      }
      return itemVal < ltVal;
    }
  }

  if (condVal instanceof Date) {
    if (!itemVal) return false;
    return new Date(itemVal).getTime() === condVal.getTime();
  }

  return itemVal === condVal;
}

function matchesWhere(item: any, where?: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;

  if (where.OR && Array.isArray(where.OR)) {
    return where.OR.some((subWhere: any) => matchesWhere(item, subWhere));
  }
  if (where.AND && Array.isArray(where.AND)) {
    return where.AND.every((subWhere: any) => matchesWhere(item, subWhere));
  }
  if (where.NOT) {
    if (Array.isArray(where.NOT)) {
      return !where.NOT.some((subWhere: any) => matchesWhere(item, subWhere));
    }
    return !matchesWhere(item, where.NOT);
  }

  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR' || key === 'AND' || key === 'NOT') continue;
    if (cond === undefined) continue;

    if (!matchesCondition(item[key], cond)) {
      return false;
    }
  }

  return true;
}

function sortItems(items: any[], orderBy?: any): any[] {
  if (!orderBy) return items;

  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];

  return [...items].sort((a, b) => {
    for (const ord of orders) {
      const [key, direction] = Object.entries(ord)[0];
      const dirMult = direction === 'desc' ? -1 : 1;
      const valA = a[key];
      const valB = b[key];

      if (valA === valB) continue;
      if (valA === undefined || valA === null) return 1 * dirMult;
      if (valB === undefined || valB === null) return -1 * dirMult;

      if (valA instanceof Date && valB instanceof Date) {
        return (valA.getTime() - valB.getTime()) * dirMult;
      }
      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * dirMult;
      }
      return (valA < valB ? -1 : 1) * dirMult;
    }
    return 0;
  });
}

function formatResult(modelName: keyof StoreCollections, item: any, select?: any, include?: any): any {
  if (!item) return null;
  const clone = JSON.parse(JSON.stringify(item));

  // Date restoration
  for (const k of Object.keys(clone)) {
    if (
      k.endsWith('At') ||
      k.endsWith('Date') ||
      k === 'timestamp' ||
      k === 'expiresAt' ||
      k === 'tokenExpiresAt'
    ) {
      if (clone[k]) clone[k] = new Date(clone[k]);
    }
  }

  // Populate _count if requested in select or include
  if (select?._count || include?._count) {
    if (modelName === 'subject') {
      clone._count = {
        tasks: Array.from(stores.task.values()).filter((t) => t.subjectId === clone.id).length,
        studySessions: Array.from(stores.studySession.values()).filter((s) => s.subjectId === clone.id).length,
      };
    } else if (modelName === 'user') {
      clone._count = {
        subjects: Array.from(stores.subject.values()).filter((s) => s.userId === clone.id).length,
        tasks: Array.from(stores.task.values()).filter((t) => t.userId === clone.id).length,
        studySessions: Array.from(stores.studySession.values()).filter((s) => s.userId === clone.id).length,
      };
    }
  }

  // Handle inclusions
  if (include) {
    if (modelName === 'subject') {
      if (include.tasks) {
        const tasks = Array.from(stores.task.values()).filter((t) => t.subjectId === clone.id);
        const sorted = sortItems(tasks, include.tasks.orderBy);
        clone.tasks = sorted.map((t) => formatResult('task', t));
      }
    } else if (modelName === 'user') {
      if (include.availabilitySlots) {
        clone.availabilitySlots = Array.from(stores.availabilitySlot.values())
          .filter((av) => av.userId === clone.id)
          .map((av) => formatResult('availabilitySlot', av));
      }
      if (include.studySessions) {
        clone.studySessions = Array.from(stores.studySession.values())
          .filter((s) => s.userId === clone.id)
          .map((s) => formatResult('studySession', s));
      }
      if (include.notifications) {
        clone.notifications = Array.from(stores.academicNotification.values())
          .filter((n) => n.userId === clone.id)
          .map((n) => formatResult('academicNotification', n));
      }
    } else if (modelName === 'task') {
      if (include.subject) {
        const sub = stores.subject.get(clone.subjectId);
        clone.subject = sub ? formatResult('subject', sub) : null;
      }
      if (include.studySessions) {
        const sessions = Array.from(stores.studySession.values()).filter(
          (s) => s.taskId === clone.id
        );
        clone.studySessions = sessions.map((s) => formatResult('studySession', s));
      }
    } else if (modelName === 'studySession') {
      if (include.task) {
        const task = stores.task.get(clone.taskId);
        clone.task = task ? formatResult('task', task) : null;
      }
      if (include.subject) {
        const sub = stores.subject.get(clone.subjectId);
        clone.subject = sub ? formatResult('subject', sub) : null;
      }
    }
  }

  // Handle select
  if (select) {
    const selected: any = {};
    for (const [key, enabled] of Object.entries(select)) {
      if (enabled) {
        if (key === '_count') {
          selected._count = clone._count || { subjects: 0, tasks: 0, studySessions: 0 };
        } else if (key in clone) {
          selected[key] = clone[key];
        }
      }
    }
    return selected;
  }

  return clone;
}

const MODEL_DEFAULTS: Record<string, any> = {
  user: {
    role: 'STUDENT',
    major: 'General Studies',
    term: 'Fall 2026',
    targetDailyStudyCapHours: 5.5,
    defaultSessionMinutes: 50,
    preferredBreakMinutes: 10,
    preferredStudyTime: 'afternoon',
    bufferMinutes: 15,
  },
  subject: {
    credits: 4,
    colorKey: 'cs',
    weeklyTargetHours: 6.0,
  },
  task: {
    estimatedHours: 2.0,
    remainingHours: 2.0,
    type: 'assignment',
    priority: 'MEDIUM',
    status: 'BACKLOG',
  },
  availabilitySlot: {
    type: 'PREFERRED_STUDY',
  },
  schedule: {
    mode: 'BALANCED',
  },
  studySession: {
    durationMinutes: 90,
    completed: false,
    status: 'SCHEDULED',
    locked: false,
  },
  academicNotification: {
    read: false,
    priority: 'normal',
  },
  announcement: {
    priority: 'normal',
    targetCohort: 'all',
    pinned: false,
    status: 'published',
  },
  auditLog: {
    category: 'security',
  },
  passwordResetRequest: {
    attemptsCount: 0,
    maxAttempts: 5,
    usedAt: null,
  },
};

function createModelHandler(modelName: keyof StoreCollections) {
  const store = stores[modelName];

  return {
    async findUnique(args: { where: any; select?: any; include?: any }) {
      const items = Array.from(store.values());
      const item = items.find((i) => matchesWhere(i, args.where));
      return item ? formatResult(modelName, item, args.select, args.include) : null;
    },

    async findFirst(args: { where?: any; select?: any; include?: any; orderBy?: any }) {
      let items = Array.from(store.values());
      if (args?.where) items = items.filter((i) => matchesWhere(i, args.where));
      if (args?.orderBy) items = sortItems(items, args.orderBy);
      const item = items[0];
      return item ? formatResult(modelName, item, args?.select, args?.include) : null;
    },

    async findMany(args?: {
      where?: any;
      select?: any;
      include?: any;
      orderBy?: any;
      skip?: number;
      take?: number;
    }) {
      let items = Array.from(store.values());
      if (args?.where) items = items.filter((i) => matchesWhere(i, args.where));
      if (args?.orderBy) items = sortItems(items, args.orderBy);

      const skip = args?.skip || 0;
      const take = args?.take !== undefined ? args.take : items.length;
      const sliced = items.slice(skip, skip + take);

      return sliced.map((i) => formatResult(modelName, i, args?.select, args?.include));
    },

    async count(args?: { where?: any }) {
      if (!args?.where) return store.size;
      const items = Array.from(store.values());
      return items.filter((i) => matchesWhere(i, args.where)).length;
    },

    async create(args: { data: any; select?: any; include?: any }) {
      const now = new Date();
      const id = args.data.id || `${modelName.slice(0, 3)}_${crypto.randomUUID()}`;
      const defaults = MODEL_DEFAULTS[modelName] || {};
      const record = {
        ...defaults,
        ...args.data,
        id,
        createdAt: args.data.createdAt || now,
        updatedAt: now,
      };

      store.set(id, record);
      return formatResult(modelName, record, args.select, args.include);
    },

    async update(args: { where: any; data: any; select?: any; include?: any }) {
      const items = Array.from(store.values());
      const item = items.find((i) => matchesWhere(i, args.where));
      if (!item) {
        const err: any = new Error('Record to update not found');
        err.code = 'P2025';
        throw err;
      }

      const updated = {
        ...item,
        ...args.data,
        updatedAt: new Date(),
      };

      store.set(item.id, updated);
      return formatResult(modelName, updated, args.select, args.include);
    },

    async upsert(args: {
      where: any;
      update: any;
      create: any;
      select?: any;
      include?: any;
    }) {
      const items = Array.from(store.values());
      const existing = items.find((i) => matchesWhere(i, args.where));

      if (existing) {
        const updated = {
          ...existing,
          ...args.update,
          updatedAt: new Date(),
        };
        store.set(existing.id, updated);
        return formatResult(modelName, updated, args.select, args.include);
      } else {
        const now = new Date();
        const id = args.create.id || `${modelName.slice(0, 3)}_${crypto.randomUUID()}`;
        const defaults = MODEL_DEFAULTS[modelName] || {};
        const created = {
          ...defaults,
          ...args.create,
          id,
          createdAt: args.create.createdAt || now,
          updatedAt: now,
        };
        store.set(id, created);
        return formatResult(modelName, created, args.select, args.include);
      }
    },

    async createMany(args: { data: any[] }) {
      const records = Array.isArray(args.data) ? args.data : [args.data];
      let count = 0;
      for (const item of records) {
        const now = new Date();
        const id = item.id || `${modelName.slice(0, 3)}_${crypto.randomUUID()}`;
        const defaults = MODEL_DEFAULTS[modelName] || {};
        const record = {
          ...defaults,
          ...item,
          id,
          createdAt: item.createdAt || now,
          updatedAt: now,
        };
        store.set(id, record);
        count++;
      }
      return { count };
    },

    async updateMany(args: { where?: any; data: any }) {
      let count = 0;
      for (const [id, item] of store.entries()) {
        if (!args.where || matchesWhere(item, args.where)) {
          store.set(id, {
            ...item,
            ...args.data,
            updatedAt: new Date(),
          });
          count++;
        }
      }
      return { count };
    },

    async delete(args: { where: any; select?: any; include?: any }) {
      const items = Array.from(store.values());
      const item = items.find((i) => matchesWhere(i, args.where));
      if (!item) {
        const err: any = new Error('Record to delete not found');
        err.code = 'P2025';
        throw err;
      }

      store.delete(item.id);

      // Cascading deletions
      if (modelName === 'user') {
        for (const [subId, sub] of stores.subject.entries()) {
          if (sub.userId === item.id) stores.subject.delete(subId);
        }
        for (const [taskId, task] of stores.task.entries()) {
          if (task.userId === item.id) stores.task.delete(taskId);
        }
        for (const [slotId, slot] of stores.availabilitySlot.entries()) {
          if (slot.userId === item.id) stores.availabilitySlot.delete(slotId);
        }
        for (const [sesId, ses] of stores.studySession.entries()) {
          if (ses.userId === item.id) stores.studySession.delete(sesId);
        }
        for (const [notifId, notif] of stores.academicNotification.entries()) {
          if (notif.userId === item.id) stores.academicNotification.delete(notifId);
        }
        for (const [reqId, req] of stores.passwordResetRequest.entries()) {
          if (req.userId === item.id) stores.passwordResetRequest.delete(reqId);
        }
      } else if (modelName === 'subject') {
        for (const [taskId, task] of stores.task.entries()) {
          if (task.subjectId === item.id) stores.task.delete(taskId);
        }
        for (const [sesId, ses] of stores.studySession.entries()) {
          if (ses.subjectId === item.id) stores.studySession.delete(sesId);
        }
      } else if (modelName === 'task') {
        for (const [sesId, ses] of stores.studySession.entries()) {
          if (ses.taskId === item.id) stores.studySession.delete(sesId);
        }
      }

      return formatResult(modelName, item, args.select, args.include);
    },

    async deleteMany(args?: { where?: any }) {
      let count = 0;
      for (const [id, item] of Array.from(store.entries())) {
        if (!args?.where || matchesWhere(item, args.where)) {
          store.delete(id);
          count++;
        }
      }
      return { count };
    },

    async groupBy(args: { by: string[]; _count?: any; orderBy?: any; take?: number }) {
      const groups = new Map<string, { keys: any; count: number }>();

      for (const item of store.values()) {
        const groupKey = args.by.map((k) => item[k]).join('|');
        if (!groups.has(groupKey)) {
          const keys: any = {};
          for (const k of args.by) keys[k] = item[k];
          groups.set(groupKey, { keys, count: 0 });
        }
        groups.get(groupKey)!.count++;
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

export function createPrismaMock() {
  const userHandler = createModelHandler('user');
  const subjectHandler = createModelHandler('subject');
  const taskHandler = createModelHandler('task');
  const availabilitySlotHandler = createModelHandler('availabilitySlot');
  const scheduleHandler = createModelHandler('schedule');
  const studySessionHandler = createModelHandler('studySession');
  const academicNotificationHandler = createModelHandler('academicNotification');
  const announcementHandler = createModelHandler('announcement');
  const auditLogHandler = createModelHandler('auditLog');
  const passwordResetRequestHandler = createModelHandler('passwordResetRequest');

  const mock: any = {
    user: userHandler,
    subject: subjectHandler,
    task: taskHandler,
    availabilitySlot: availabilitySlotHandler,
    schedule: scheduleHandler,
    studySession: studySessionHandler,
    academicNotification: academicNotificationHandler,
    announcement: announcementHandler,
    auditLog: auditLogHandler,
    passwordResetRequest: passwordResetRequestHandler,

    async $transaction(arg: any) {
      if (typeof arg === 'function') {
        return arg(mock);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg;
    },

    async $queryRaw(strings?: any) {
      const rawText = Array.isArray(strings) ? strings.join('') : String(strings || '');
      return [{ '1': 1, version: 'PostgreSQL 16.2 (StudyFlow in-memory mock)' }];
    },

    async $disconnect() {
      // No-op for in-memory mock
    },
  };

  return mock;
}
