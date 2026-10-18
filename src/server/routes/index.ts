/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { SubjectController } from '../controllers/subjectController';
import { TaskController } from '../controllers/taskController';
import { AvailabilityController } from '../controllers/availabilityController';
import { ScheduleController } from '../controllers/scheduleController';
import { NotificationController } from '../controllers/notificationController';
import { ProgressController } from '../controllers/progressController';
import { AdminController } from '../controllers/adminController';
import { AdminAuditController } from '../controllers/adminAuditController';
import { authenticate, requireRole } from '../middleware/auth';
import { checkDatabaseHealth } from '../db/prisma';

const router = Router();

// ==========================================
// 0. Database & System Health Check
// ==========================================
router.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const statusCode = dbHealth.ok ? 200 : 503;
  res.status(statusCode).json({
    status: dbHealth.ok ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbHealth,
  });
});

// ==========================================
// 1. Authentication Routes (Public / Student)
// ==========================================
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticate, AuthController.me);
router.patch('/auth/preferences', authenticate, AuthController.updatePreferences);
router.post('/auth/logout', authenticate, AuthController.logout);

// ==========================================
// 2. Student Course Subjects (Protected)
// ==========================================
router.get('/subjects', authenticate, SubjectController.list);
router.get('/subjects/:id', authenticate, SubjectController.getById);
router.post('/subjects', authenticate, SubjectController.create);
router.patch('/subjects/:id', authenticate, SubjectController.update);
router.delete('/subjects/:id', authenticate, SubjectController.delete);

// ==========================================
// 3. Student Tasks & Assignments (Protected)
// ==========================================
router.get('/tasks', authenticate, TaskController.list);
router.get('/tasks/:id', authenticate, TaskController.getById);
router.post('/tasks', authenticate, TaskController.create);
router.patch('/tasks/:id', authenticate, TaskController.update);
router.patch('/tasks/:id/complete', authenticate, TaskController.toggleComplete);
router.delete('/tasks/:id', authenticate, TaskController.delete);

// ==========================================
// 4. Student Availability Slots & Preferences (Protected)
// ==========================================
router.get('/availability/preferences', authenticate, AvailabilityController.getPreferences);
router.patch('/availability/preferences', authenticate, AvailabilityController.updatePreferences);
router.get('/availability', authenticate, AvailabilityController.list);
router.get('/availability/:id', authenticate, AvailabilityController.getById);
router.post('/availability', authenticate, AvailabilityController.create);
router.patch('/availability/:id', authenticate, AvailabilityController.update);
router.delete('/availability/:id', authenticate, AvailabilityController.delete);

// ==========================================
// 5. Student Schedule & Sessions (Protected)
// ==========================================
router.get('/schedule', authenticate, ScheduleController.getSchedule);
router.get('/schedule/sessions', authenticate, ScheduleController.listSessions);
router.get('/schedule/sessions/:id', authenticate, ScheduleController.getSessionById);
router.post('/schedule/sessions', authenticate, ScheduleController.createSession);
router.patch('/schedule/sessions/:id', authenticate, ScheduleController.updateSession);
router.patch('/schedule/sessions/:id/lock', authenticate, ScheduleController.toggleLock);
router.patch('/schedule/sessions/:id/status', authenticate, ScheduleController.updateStatus);
router.delete('/schedule/sessions/:id', authenticate, ScheduleController.deleteSession);

// ==========================================
// 6. Student Notifications (Protected)
// ==========================================
router.get('/notifications', authenticate, NotificationController.list);
router.post('/notifications/sync-events', authenticate, NotificationController.syncEvents);
router.patch('/notifications/:id/read', authenticate, NotificationController.markRead);
router.post('/notifications/read-all', authenticate, NotificationController.markAllRead);
router.delete('/notifications/:id', authenticate, NotificationController.delete);

// ==========================================
// 7. Academic Progress & Workload Analytics
// ==========================================
router.get('/progress/summary', authenticate, ProgressController.getSummary);

// ==========================================
// 8. Administrative Oversight (Admin Only)
// ==========================================
router.get('/admin/users', authenticate, requireRole('admin'), AdminController.listUsers);
router.get('/admin/users/:id', authenticate, requireRole('admin'), AdminController.getUserById);
router.patch('/admin/users/:id/role', authenticate, requireRole('admin'), AdminController.updateUserRole);
router.patch('/admin/users/:id/status', authenticate, requireRole('admin'), AdminController.updateUserStatus);
router.get('/admin/audit-logs', authenticate, requireRole('admin'), AdminAuditController.listLogs);
router.get('/admin/audit-logs/stats', authenticate, requireRole('admin'), AdminAuditController.getAuditStats);
router.get('/admin/audit-logs/:id', authenticate, requireRole('admin'), AdminAuditController.getLogById);
router.get('/admin/catalog', authenticate, requireRole('admin'), AdminController.getCatalog);
router.get('/admin/metrics', authenticate, requireRole('admin'), AdminController.getMetrics);
router.get('/admin/announcements', authenticate, AdminController.listAnnouncements);
router.post('/admin/announcements', authenticate, requireRole('admin'), AdminController.createAnnouncement);
router.patch('/admin/announcements/:id', authenticate, requireRole('admin'), AdminController.updateAnnouncement);
router.delete('/admin/announcements/:id', authenticate, requireRole('admin'), AdminController.deleteAnnouncement);

export default router;
