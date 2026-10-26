/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import apiRoutes from '../routes';
import { errorHandler } from '../middleware/errorHandler';
import { securityHeaders, corsMiddleware } from '../middleware/security';
import { prisma, disconnectDatabase } from '../db/prisma';

import { apiClient, ApiClientError } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { subjectService } from '../../services/subjectService';
import { taskService } from '../../services/taskService';
import { availabilityService } from '../../services/availabilityService';
import { scheduleService } from '../../services/scheduleService';
import { notificationService } from '../../services/notificationService';
import { progressService } from '../../services/progressService';
import { adminService } from '../../services/adminService';

async function runIntegrationSuite() {
  console.log('=================================================================');
  console.log('   STUDYFLOW FULL-STACK E2E CLIENT-SERVER INTEGRATION TEST SUITE  ');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Setup Express Test Server
  const app = express();
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use('/api', apiRoutes);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://localhost:${port}/api`;
  apiClient.setBaseUrl(baseUrl);

  console.log(`[TEST SERVER] Running on ephemeral port ${port} (Base: ${baseUrl})\n`);

  const timestamp = Date.now();
  const testStudentEmail = `integration.student.${timestamp}@university.edu`;
  const testStudentPassword = 'SecureStudent2026!';
  let createdStudentId = '';
  let createdProfessorId = '';
  let createdSubjectId = '';
  let createdCatalogCourseId = '';
  let createdTaskId = '';
  let createdSlotId = '';
  let createdSessionId = '';
  let createdAnnouncementId = '';
  let studentToken = '';

  try {
    // =========================================================================
    // SECTION 1: AUTHENTICATION FLOWS (STUDENT)
    // =========================================================================
    console.log('--- 1. AUTHENTICATION & SESSION PERSISTENCE (STUDENT) ---');

    // 1.1 Register new student
    const regRes = await authService.register({
      name: 'Integration Test Student',
      email: testStudentEmail,
      password: testStudentPassword,
      major: 'Cognitive Systems',
      term: 'Fall 2026',
    });

    assert(regRes.success === true, 'Student registration succeeds with valid credentials');
    assert(!!regRes.token, 'Registration returns valid JWT authentication token');
    assert(regRes.user.email === testStudentEmail, 'Registration user response has matching email');
    assert(regRes.user.role === 'student', 'Registered account is assigned student role');
    createdStudentId = regRes.user.id;
    studentToken = regRes.token!;

    // 1.2 Verify current user retrieval (session refresh)
    apiClient.setToken(studentToken);
    const currentUser = await authService.getCurrentUser();
    assert(currentUser.id === createdStudentId, 'Current user retrieval confirms authenticated session');
    assert(currentUser.major === 'Cognitive Systems', 'Retrieved profile contains correct academic major');

    // 1.3 Login with credentials
    apiClient.clearToken();
    const loginRes = await authService.login(testStudentEmail, testStudentPassword);
    assert(loginRes.success === true, 'Student login succeeds with registered credentials');
    assert(!!loginRes.token, 'Login returns verified JWT token');
    studentToken = loginRes.token!;
    apiClient.setToken(studentToken);

    // 1.4 Update user study preferences
    const updatedUser = await authService.updatePreferences({
      targetDailyStudyCapHours: 6.0,
      defaultSessionMinutes: 45,
      preferredBreakMinutes: 15,
      preferredStudyTime: 'morning',
      bufferMinutes: 20,
    });
    assert(updatedUser.targetDailyStudyCapHours === 6.0, 'Persists targetDailyStudyCapHours to PostgreSQL');
    assert(updatedUser.defaultSessionMinutes === 45, 'Persists defaultSessionMinutes to PostgreSQL');
    assert(updatedUser.preferredStudyTime === 'morning', 'Persists preferredStudyTime to PostgreSQL');

    // =========================================================================
    // SECTION 2: SUBJECTS & COURSE CATALOG FLOWS
    // =========================================================================
    console.log('\n--- 2. SUBJECTS & COURSE CATALOG FLOWS ---');

    const courseCode = `CS${Math.floor(100 + Math.random() * 899)}`;
    const catalogCourse = await prisma.catalogCourse.create({
      data: {
        code: courseCode,
        title: 'Distributed Systems & Cloud',
        department: 'Computer Science',
        colorKey: 'cs',
        credits: 4,
        instructor: 'Dr. Turing',
        expectedWeeklyHours: 8.0,
      },
    });
    createdCatalogCourseId = catalogCourse.id;
    const newSubject = await subjectService.create({
      catalogCourseId: catalogCourse.id,
      weeklyTargetHours: 8.0,
    });

    assert(!!newSubject.id, 'Creates new course subject in PostgreSQL');
    assert(newSubject.code === courseCode, 'Subject has correct course code');
    assert(newSubject.weeklyTargetHours === 8.0, 'Subject retains assigned weekly study target');
    createdSubjectId = newSubject.id;

    // List subjects
    const subjectsList = await subjectService.list();
    assert(subjectsList.some((s) => s.id === createdSubjectId), 'Subject list contains newly created course');

    // Update subject
    const updatedSubject = await subjectService.update(createdSubjectId, {
      weeklyTargetHours: 9.5,
    });
    assert(updatedSubject.weeklyTargetHours === 9.5, 'Updates course target hours successfully');

    let studentCreditUpdateRejected = false;
    try {
      await subjectService.update(createdSubjectId, { credits: 12 });
    } catch (err: any) {
      studentCreditUpdateRejected = err instanceof ApiClientError && err.status === 403;
    }
    assert(studentCreditUpdateRejected, 'Student cannot modify administrator-controlled course credits');

    // =========================================================================
    // SECTION 3: TASKS & DELIVERABLES FLOWS
    // =========================================================================
    console.log('\n--- 3. TASKS & DELIVERABLES FLOWS ---');

    const dueDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const newTask = await taskService.create({
      subjectId: createdSubjectId,
      title: 'Raft Consensus Implementation',
      type: 'assignment',
      priority: 'high',
      dueDate,
      estimatedHours: 6.0,
      notes: 'Implement leader election and log replication',
      subtasks: [
        { id: 'sub_1', title: 'Leader Election Protocol', completed: false },
        { id: 'sub_2', title: 'Log Replication Heartbeats', completed: false },
      ],
    });

    assert(!!newTask.id, 'Creates deliverable task in PostgreSQL');
    assert(newTask.remainingHours === 6.0, 'Task initial remainingHours equals estimatedHours');
    assert(newTask.subtasks?.length === 2, 'Task retains structured subtasks');
    createdTaskId = newTask.id;

    // Update task
    const updatedTask = await taskService.update(createdTaskId, {
      notes: 'Updated: Passes test suite A and B',
      priority: 'urgent',
    });
    assert(updatedTask.priority === 'urgent', 'Updates task priority to urgent');

    // Toggle completed
    const completedTask = await taskService.toggleComplete(createdTaskId);
    assert(completedTask.status === 'completed', 'Toggles task status to completed');
    assert(completedTask.remainingHours === 0, 'Remaining workload drops to 0h on completion');

    // Reopen task
    const reopenedTask = await taskService.toggleComplete(createdTaskId);
    assert(reopenedTask.status === 'in_progress', 'Reopening task restores status to in_progress');
    assert(reopenedTask.remainingHours === 6.0, 'Reopening task restores remaining workload to 6.0h');

    // =========================================================================
    // SECTION 4: AVAILABILITY & COMMITTED WINDOWS FLOWS
    // =========================================================================
    console.log('\n--- 4. AVAILABILITY & STUDY WINDOWS FLOWS ---');

    const newSlot = await availabilityService.create({
      dayOfWeek: 2, // Tuesday
      startTime: '09:00',
      endTime: '11:30',
      type: 'preferred_study',
      label: 'Morning Deep Focus Block',
    });

    assert(!!newSlot.id, 'Creates availability slot in PostgreSQL');
    assert(newSlot.dayOfWeek === 2, 'Slot has correct day of week');
    assert(newSlot.type === 'preferred_study', 'Slot retains preferred_study type');
    createdSlotId = newSlot.id;

    const availabilityList = await availabilityService.list();
    assert(availabilityList.some((slot) => slot.id === createdSlotId), 'Availability list includes newly created slot');

    // =========================================================================
    // SECTION 5: SCHEDULE & STUDY SESSIONS FLOWS
    // =========================================================================
    console.log('\n--- 5. SCHEDULE & STUDY SESSIONS FLOWS ---');

    const sessionDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0];
    const newSession = await scheduleService.createSession({
      taskId: createdTaskId,
      subjectId: createdSubjectId,
      date: sessionDate,
      startTime: '10:00',
      endTime: '11:30',
      durationMinutes: 90,
      completed: false,
      locked: false,
      notes: 'Leader election algorithm unit tests',
    });

    assert(!!newSession.id, 'Creates scheduled study session in PostgreSQL');
    assert(newSession.durationMinutes === 90, 'Session has correct duration in minutes');
    assert(newSession.locked === false, 'Session initially unlocked');
    createdSessionId = newSession.id;

    // Toggle session lock
    const lockedSession = await scheduleService.toggleLock(createdSessionId);
    assert(lockedSession.locked === true, 'Successfully locks session against auto-rescheduler');

    // Mark session completed (verify workload deduction)
    const completedSession = await scheduleService.updateStatus(createdSessionId, 'completed', 90);
    assert(completedSession.status === 'completed', 'Marks session as completed');
    assert(completedSession.completed === true, 'Session completed boolean is true');

    const taskAfterSession = await taskService.getById(createdTaskId);
    assert(taskAfterSession.remainingHours === 4.5, 'Session completion deducts 1.5h from task remaining hours (6.0 -> 4.5)');

    // Test scheduleService.generateSchedule (Recursive backtracking scheduler engine)
    const genResult = await scheduleService.generateSchedule({
      startDate: sessionDate,
      mode: 'BALANCED',
    });
    assert(genResult.sessions.length >= 1, 'Auto-generate schedule returns scheduled sessions');
    assert(genResult.preservedCount >= 1, 'Auto-generate preserves existing completed/locked session');
    assert(genResult.summary.searchSteps >= 1, 'Auto-generate exercises recursive search steps');

    // =========================================================================
    // SECTION 6: PROGRESS & NOTIFICATIONS FLOWS
    // =========================================================================
    console.log('\n--- 6. PROGRESS & NOTIFICATIONS FLOWS ---');

    const progressSummary = await progressService.getSummary();
    assert(progressSummary.success === true, 'Fetches live progress analytics from server');
    assert(progressSummary.data.metrics.totalTasks >= 1, 'Progress metrics count active deliverables');
    assert(progressSummary.data.metrics.totalEstimatedHours >= 6.0, 'Progress metrics reflect total estimated workload');

    // Notifications
    const notifs = await notificationService.list();
    assert(Array.isArray(notifs.notifications), 'Fetches user academic notifications list');

    // Mark all notifications read
    await notificationService.markAllRead();
    const notifsAfterRead = await notificationService.list();
    assert(notifsAfterRead.unreadCount === 0, 'Mark-all-read clears unread notification count');

    // =========================================================================
    // SECTION 7: ADMIN FLOWS & ROLE-BASED ACCESS CONTROL
    // =========================================================================
    console.log('\n--- 7. ADMIN DASHBOARD & SECURITY CONTROLS ---');

    // 7.1 Student attempting admin route MUST be rejected with 403 Forbidden
    let studentForbidden = false;
    try {
      await adminService.getMetrics();
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 403) {
        studentForbidden = true;
      }
    }
    assert(studentForbidden, 'Student token calling /api/admin/metrics is rejected with 403 Forbidden');

    // 7.2 Log in as institutional administrator (Dean Vance)
    apiClient.clearToken();
    const adminLogin = await authService.login('e.vance@university.edu', 'studyflow2026');
    assert(adminLogin.success === true, 'Admin login succeeds for campus dean');
    assert(adminLogin.user.role === 'admin', 'Admin user profile has admin role');
    apiClient.setToken(adminLogin.token!);

    // 7.3 Admin metrics
    const adminMetrics = await adminService.getMetrics();
    assert(adminMetrics.success === true, 'Admin successfully retrieves institutional metrics');
    assert(adminMetrics.metrics.userBreakdown.students >= 1, 'Institutional metrics report active students count');

    // 7.4 Admin user directory
    const userDir = await adminService.getUsers({ role: 'student' });
    assert(userDir.success === true, 'Admin successfully queries user directory');
    assert(userDir.data.some((u) => u.email === testStudentEmail), 'User directory includes newly registered student');

    // 7.5 Admin announcements
    const newAnnouncement = await adminService.createAnnouncement({
      title: 'Campus Mid-Term Scheduling Policy',
      content: 'All faculty must respect fatigue limits during reading week.',
      priority: 'important',
      targetCohort: 'all',
      status: 'published',
      pinned: true,
    });
    assert(newAnnouncement.success === true, 'Admin creates campus-wide announcement');
    createdAnnouncementId = newAnnouncement.data.id;

    // Update announcement
    const updatedAnnouncement = await adminService.updateAnnouncement(createdAnnouncementId, {
      title: 'Updated Campus Mid-Term Scheduling Policy',
    });
    assert(updatedAnnouncement.data.title === 'Updated Campus Mid-Term Scheduling Policy', 'Admin updates announcement');

    // 7.6 Admin audit logs
    const auditLogs = await adminService.getAuditLogs({ limit: 5 });
    assert(auditLogs.success === true, 'Admin queries tamper-evident audit logs');
    assert(auditLogs.data.length > 0, 'Audit logs record institutional operations');

    // Delete announcement
    await adminService.deleteAnnouncement(createdAnnouncementId);
    assert(true, 'Admin deletes announcement with audit logging');

    const professorEmail = `integration.professor.${timestamp}@university.edu`;
    const professorPassword = 'SecureProfessor2026!';
    const professorProvision = await adminService.provisionUser({
      name: 'Integration Test Professor',
      email: professorEmail,
      password: professorPassword,
      role: 'professor',
      major: 'Computer Science',
    });
    createdProfessorId = professorProvision.data.id;
    const professorLogin = await authService.login(professorEmail, professorPassword);
    const professorToken = professorLogin.token!;
    assert(professorLogin.user.role === 'professor', 'Administrator can provision a Professor account');
    const facultySubject = await subjectService.create({
      catalogCourseId: createdCatalogCourseId,
      classroom: 'Faculty Hall 201',
      classSchedule: 'Tue/Thu 10:00-11:30',
    });
    assert(facultySubject.catalogCourseId === createdCatalogCourseId, 'Professor adds an administrator-created course to faculty load');
    const professorTask = await taskService.create({
      subjectId: facultySubject.id,
      title: 'Professor-managed assignment',
      type: 'assignment',
      priority: 'medium',
      dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      estimatedHours: 1,
    });
    let professorCompletionRejected = false;
    try {
      await taskService.toggleComplete(professorTask.id);
    } catch (err: any) {
      professorCompletionRejected = err instanceof ApiClientError && err.status === 403;
    }
    assert(professorCompletionRejected, 'Professor cannot invoke the student-only assignment completion action');

    await authService.login('e.vance@university.edu', 'studyflow2026');
    const catalogView = await adminService.getCatalog();
    const catalogCourseView = catalogView.data.find((course) => course.id === createdCatalogCourseId);
    assert(catalogCourseView?.activeEnrolledCount === 1, 'Admin catalog counts only students in the enrolled cohort');
    assert(
      catalogCourseView?.enrolledStudents?.some((student) => student.email === testStudentEmail) === true,
      'Admin can view the identity and academic details of an enrolled student'
    );
    assert(catalogCourseView?.facultyLoadCount === 1, 'Admin catalog reports faculty loads separately from student enrollments');
    await adminService.updateUser(createdProfessorId, { status: 'Suspended' });
    apiClient.setToken(professorToken);
    let suspendedProfessorRejected = false;
    try {
      await authService.getCurrentUser();
    } catch (err: any) {
      suspendedProfessorRejected = err instanceof ApiClientError && [401, 403].includes(err.status);
    }
    const suspendedRecord = await prisma.user.findUnique({ where: { id: createdProfessorId } });
    assert(suspendedProfessorRejected, 'Suspending an account immediately invalidates its active session');
    assert(suspendedRecord?.term === 'Fall 2026', 'Account suspension does not overwrite the academic term');

    // =========================================================================
    // SECTION 8: NEGATIVE SCENARIOS & SESSION INVALIDATION
    // =========================================================================
    console.log('\n--- 8. NEGATIVE SCENARIOS & SESSION INVALIDATION ---');

    // 8.1 Unauthenticated request returns 401
    apiClient.clearToken();
    let unauthRejected = false;
    try {
      await authService.getCurrentUser();
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 401) {
        unauthRejected = true;
      }
    }
    assert(unauthRejected, 'Unauthenticated request to protected route is rejected with 401 Unauthorized');

    // 8.2 Tampered token returns 401
    apiClient.setToken('tampered.jwt.signature.string');
    let tamperedRejected = false;
    try {
      await authService.getCurrentUser();
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 401) {
        tamperedRejected = true;
      }
    }
    assert(tamperedRejected, 'Tampered token is rejected with 401 Unauthorized');

    // 8.3 Invalid login credentials return 401
    apiClient.clearToken();
    let invalidLoginRejected = false;
    try {
      await authService.login(testStudentEmail, 'WrongPassword123!');
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 401) {
        invalidLoginRejected = true;
      }
    }
    assert(invalidLoginRejected, 'Invalid login credentials rejected with 401 Unauthorized');

    // 8.4 Validation error returns 400 Bad Request
    apiClient.setToken(studentToken);
    let validationRejected = false;
    try {
      // Invalid subject with missing name and empty code
      await apiClient.post('/subjects', { code: '', name: '' });
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 400) {
        validationRejected = true;
      }
    }
    assert(validationRejected, 'Validation failure returns 400 Bad Request without silent failure');

    // 8.5 Server-side logout revokes the bearer token, not just browser state
    apiClient.setToken(studentToken);
    await authService.logout();
    apiClient.setToken(studentToken);
    let revokedTokenRejected = false;
    try {
      await authService.getCurrentUser();
    } catch (err: any) {
      revokedTokenRejected = err instanceof ApiClientError && err.status === 401;
    }
    assert(revokedTokenRejected, 'Logged-out bearer token is rejected by the server');

  } finally {
    // Clean up created student and cascading records
    if (createdStudentId) {
      try {
        await prisma.user.delete({ where: { id: createdStudentId } }).catch(() => null);
      } catch {
        // Ignore cleanup error
      }
    }
    if (createdProfessorId) {
      await prisma.user.delete({ where: { id: createdProfessorId } }).catch(() => null);
    }
    if (createdCatalogCourseId) {
      await prisma.catalogCourse.delete({ where: { id: createdCatalogCourseId } }).catch(() => null);
    }

    server.close();
    await disconnectDatabase();
  }

  console.log('\n=================================================================');
  console.log(`   INTEGRATION SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runIntegrationSuite().catch((err) => {
  console.error('Integration suite encountered fatal error:', err);
  process.exit(1);
});
