/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma, disconnectDatabase } from '../src/server/db/prisma';
import { hashPassword } from '../src/server/utils/jwt';
import {
  INITIAL_SUBJECTS,
  INITIAL_TASKS,
  INITIAL_ALL_SESSIONS,
  INITIAL_AVAILABILITY,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
} from '../src/data/mockData';

export async function seedDatabase() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) {
    console.warn('[SECURITY] Seeding is disabled in production environments without ALLOW_PROD_SEED=true.');
    return;
  }

  console.log('[Seed] Beginning idempotent StudyFlow database seeding...');

  // 1. Password hashing for demo accounts (Default: "studyflow2026")
  const defaultPasswordHash = await hashPassword('studyflow2026');

  // 2. Student Account: Maya Lin
  const maya = await prisma.user.upsert({
    where: { email: 'm.lin@university.edu' },
    update: {
      name: 'Maya Lin',
      major: 'Computer Science & Mathematics',
      term: 'Fall 2026',
      targetDailyStudyCapHours: 5.5,
      defaultSessionMinutes: 50,
      preferredBreakMinutes: 10,
      preferredStudyTime: 'afternoon',
      bufferMinutes: 15,
    },
    create: {
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
    },
  });

  // 3. Admin Account: Dr. Elena Vance
  const elena = await prisma.user.upsert({
    where: { email: 'e.vance@university.edu' },
    update: {
      name: 'Dr. Elena Vance',
      major: 'Dean of Academic Operations & Curriculum',
      term: 'Fall 2026',
    },
    create: {
      id: 'usr_admin_elena',
      email: 'e.vance@university.edu',
      passwordHash: defaultPasswordHash,
      name: 'Dr. Elena Vance',
      role: 'ADMIN',
      major: 'Dean of Academic Operations & Curriculum',
      term: 'Fall 2026',
    },
  });

  console.log(`[Seed] Ensured users: ${maya.email} (STUDENT) & ${elena.email} (ADMIN)`);

  // 4. Seed Course Subjects for Maya
  for (const s of INITIAL_SUBJECTS) {
    await prisma.subject.upsert({
      where: { id: s.id },
      update: {
        code: s.code,
        name: s.name,
        instructor: s.instructor,
        credits: s.credits,
        colorKey: s.colorKey,
        weeklyTargetHours: s.weeklyTargetHours,
        classroom: s.classroom,
        officeHours: s.officeHours,
      },
      create: {
        id: s.id,
        userId: maya.id,
        code: s.code,
        name: s.name,
        instructor: s.instructor,
        credits: s.credits,
        colorKey: s.colorKey,
        weeklyTargetHours: s.weeklyTargetHours,
        classroom: s.classroom,
        officeHours: s.officeHours,
      },
    });
  }

  // 5. Seed Tasks for Maya
  for (const t of INITIAL_TASKS) {
    // Priority mapping
    let priorityEnum: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (t.priority === 'urgent') priorityEnum = 'URGENT';
    else if (t.priority === 'high') priorityEnum = 'HIGH';
    else if (t.priority === 'low') priorityEnum = 'LOW';

    let statusEnum: 'BACKLOG' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' = 'BACKLOG';
    if (t.status === 'completed') statusEnum = 'COMPLETED';
    else if (t.status === 'in_progress') statusEnum = 'IN_PROGRESS';
    else if (t.status === 'scheduled') statusEnum = 'SCHEDULED';

    await prisma.task.upsert({
      where: { id: t.id },
      update: {
        title: t.title,
        dueDate: new Date(t.dueDate),
        estimatedHours: t.estimatedHours,
        remainingHours: t.remainingHours,
        type: t.type,
        priority: priorityEnum,
        status: statusEnum,
        notes: t.notes,
        subtasks: t.subtasks ? (t.subtasks as any) : undefined,
      },
      create: {
        id: t.id,
        userId: maya.id,
        subjectId: t.subjectId,
        title: t.title,
        dueDate: new Date(t.dueDate),
        estimatedHours: t.estimatedHours,
        remainingHours: t.remainingHours,
        type: t.type,
        priority: priorityEnum,
        status: statusEnum,
        notes: t.notes,
        subtasks: t.subtasks ? (t.subtasks as any) : undefined,
      },
    });
  }

  // 6. Seed Availability Slots for Maya
  for (const av of INITIAL_AVAILABILITY) {
    let slotType: 'PREFERRED_STUDY' | 'CLASS' | 'WORK' | 'PERSONAL' = 'PREFERRED_STUDY';
    const avTypeStr = String(av.type);
    if (avTypeStr === 'class_lecture' || avTypeStr === 'CLASS') slotType = 'CLASS';
    else if (avTypeStr === 'work_shift' || avTypeStr === 'WORK') slotType = 'WORK';
    else if (avTypeStr === 'personal_commitment' || avTypeStr === 'PERSONAL') slotType = 'PERSONAL';

    await prisma.availabilitySlot.upsert({
      where: { id: av.id },
      update: {
        dayOfWeek: av.dayOfWeek,
        startTime: av.startTime,
        endTime: av.endTime,
        type: slotType,
        label: av.label,
      },
      create: {
        id: av.id,
        userId: maya.id,
        dayOfWeek: av.dayOfWeek,
        startTime: av.startTime,
        endTime: av.endTime,
        type: slotType,
        label: av.label,
      },
    });
  }

  // 7. Seed Scheduled Study Sessions
  for (const ses of INITIAL_ALL_SESSIONS) {
    await prisma.studySession.upsert({
      where: { id: ses.id },
      update: {
        date: ses.date,
        startTime: ses.startTime,
        endTime: ses.endTime,
        durationMinutes: ses.durationMinutes,
        completed: ses.completed,
        locked: ses.locked,
        notes: ses.notes,
      },
      create: {
        id: ses.id,
        userId: maya.id,
        taskId: ses.taskId,
        subjectId: ses.subjectId,
        date: ses.date,
        startTime: ses.startTime,
        endTime: ses.endTime,
        durationMinutes: ses.durationMinutes,
        completed: ses.completed,
        locked: ses.locked,
        notes: ses.notes,
      },
    });
  }

  // 8. Seed Campus Announcements
  for (const ann of INITIAL_ANNOUNCEMENTS) {
    await prisma.announcement.upsert({
      where: { id: ann.id },
      update: {
        title: ann.title,
        content: ann.content,
        author: ann.author,
        priority: ann.priority,
        targetCohort: ann.targetCohort,
        pinned: ann.pinned || false,
        status: ann.status || 'published',
      },
      create: {
        id: ann.id,
        title: ann.title,
        content: ann.content,
        author: ann.author,
        priority: ann.priority,
        targetCohort: ann.targetCohort,
        pinned: ann.pinned || false,
        status: ann.status || 'published',
      },
    });
  }

  // 9. Seed Academic Notifications for Maya
  for (const notif of INITIAL_NOTIFICATIONS) {
    await prisma.academicNotification.upsert({
      where: { id: notif.id },
      update: {
        category: notif.category,
        title: notif.title,
        description: notif.description,
        read: notif.read,
        actionUrl: notif.actionUrl,
        actionLabel: notif.actionLabel,
        relatedId: notif.relatedId,
        priority: notif.priority,
      },
      create: {
        id: notif.id,
        userId: maya.id,
        category: notif.category,
        title: notif.title,
        description: notif.description,
        read: notif.read,
        actionUrl: notif.actionUrl,
        actionLabel: notif.actionLabel,
        relatedId: notif.relatedId,
        priority: notif.priority,
      },
    });
  }

  // 10. Seed Realistic Institutional Audit Logs
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
    await prisma.auditLog.upsert({
      where: { id: log.id },
      update: {
        action: log.action,
        category: log.category,
        details: log.details,
      },
      create: log,
    });
  }

  console.log('[Seed] Seeding completed successfully and idempotently.');
}

if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(async () => {
      await disconnectDatabase();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('[Seed Error]:', e);
      await disconnectDatabase();
      process.exit(1);
    });
}
