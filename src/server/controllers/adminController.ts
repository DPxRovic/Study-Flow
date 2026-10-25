/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { validateString, validateId, validateBoolean, validateEmail, validatePassword } from '../utils/validators';
import { hashPassword } from '../utils/jwt';
import { logAdminAction } from '../utils/auditLogger';

export class AdminController {
  // GET /api/admin/users
  // Lists institutional users with filtering, search, and enrolled course counts
  static async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { search, role, page, limit } = req.query;

      const whereClause: any = {};

      if (role && typeof role === 'string' && role !== 'all') {
        const normRole = role.toUpperCase();
        if (['STUDENT', 'ADMIN', 'ADVISOR', 'TA'].includes(normRole)) {
          whereClause.role = normRole;
        }
      }

      if (search && typeof search === 'string' && search.trim()) {
        const query = search.trim();
        whereClause.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { major: { contains: query, mode: 'insensitive' } },
        ];
      }

      const pageNum = page ? Math.max(1, parseInt(String(page), 10) || 1) : 1;
      const pageSize = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 50;
      const skip = (pageNum - 1) * pageSize;

      const [total, usersList] = await Promise.all([
        prisma.user.count({ where: whereClause }),
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            major: true,
            term: true,
            targetDailyStudyCapHours: true,
            defaultSessionMinutes: true,
            preferredBreakMinutes: true,
            preferredStudyTime: true,
            bufferMinutes: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                subjects: true,
                tasks: true,
                studySessions: true,
              },
            },
          },
          orderBy: { name: 'asc' },
          skip,
          take: pageSize,
        }),
      ]);

      res.json({
        success: true,
        data: usersList.map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role.toLowerCase(),
          major: u.major || 'Undeclared',
          term: u.term || 'Fall 2026',
          enrolledCourses: u._count.subjects,
          totalTasks: u._count.tasks,
          totalSessions: u._count.studySessions,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        })),
        meta: {
          total,
          page: pageNum,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/admin/users
  // Provisions a new institutional user with role and initial credentials + audit log
  static async provisionUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { email, password, name, role, major, term } = req.body;
      const validEmail = validateEmail(email);
      const validName = validateString(name, 'Full name', 2, 80);
      const validMajor = major ? validateString(major, 'Major', 2, 100) : 'General Studies';
      const validTerm = term ? validateString(term, 'Academic Term', 2, 50) : 'Fall 2026';
      const initialPassword = password ? validatePassword(password) : 'StudyFlow2026!#';

      const normRole = (role ? String(role).toUpperCase() : 'STUDENT') as any;
      if (!['STUDENT', 'ADMIN', 'ADVISOR', 'TA'].includes(normRole)) {
        throw ApiError.badRequest('Role must be student, admin, advisor, or ta');
      }

      const existing = await prisma.user.findUnique({ where: { email: validEmail } });
      if (existing) {
        throw ApiError.conflict('An account with this university email already exists');
      }

      const passwordHash = await hashPassword(initialPassword);

      const newUser = await prisma.$transaction(async (tx: any) => {
        const created = await tx.user.create({
          data: {
            email: validEmail,
            passwordHash,
            name: validName,
            role: normRole,
            major: validMajor,
            term: validTerm,
            targetDailyStudyCapHours: 5.5,
            defaultSessionMinutes: 50,
            preferredBreakMinutes: 10,
            preferredStudyTime: 'afternoon',
            bufferMinutes: 15,
          },
        });

        await logAdminAction({
          adminId: req.user!.userId,
          adminEmail: req.user!.email,
          adminName: req.user!.name,
          action: 'USER_PROVISION',
          category: 'user_management',
          targetId: created.id,
          targetType: 'User',
          details: `Provisioned ${normRole} account for ${validName} (${validEmail})`,
          ipAddress: req.ip,
        }, tx);

        return created;
      });

      const { passwordHash: _, ...safeUser } = newUser;
      res.status(201).json({
        success: true,
        message: `Account provisioned successfully for ${validName}`,
        data: {
          ...safeUser,
          role: safeUser.role.toLowerCase(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/admin/users/:id
  // Deletes an institutional user with audit logging and last-admin safeguard
  static async deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const callerUserId = req.user!.userId;
      const targetUserId = validateId(req.params.id, 'User ID');

      if (callerUserId === targetUserId) {
        throw ApiError.forbidden('You cannot delete your own account from the admin console');
      }

      await prisma.$transaction(async (tx: any) => {
        const target = await tx.user.findUnique({ where: { id: targetUserId } });
        if (!target) throw ApiError.notFound('User not found');

        if (target.role === 'ADMIN') {
          const adminCount = await tx.user.count({ where: { role: 'ADMIN' } });
          if (adminCount <= 1) {
            throw ApiError.forbidden('Cannot delete the last administrator account');
          }
        }

        await tx.user.delete({ where: { id: targetUserId } });

        await logAdminAction({
          adminId: callerUserId,
          adminEmail: req.user!.email,
          adminName: req.user!.name,
          action: 'USER_DELETE',
          category: 'user_management',
          targetId: targetUserId,
          targetType: 'User',
          details: `Deleted ${target.role} account for ${target.name} (${target.email})`,
          ipAddress: req.ip,
        }, tx);
      });

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/users/:id
  // Retrieves non-sensitive details for a specific user
  static async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const targetUserId = validateId(req.params.id, 'User ID');

      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          major: true,
          term: true,
          targetDailyStudyCapHours: true,
          defaultSessionMinutes: true,
          preferredBreakMinutes: true,
          preferredStudyTime: true,
          bufferMinutes: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              subjects: true,
              tasks: true,
              studySessions: true,
            },
          },
        },
      });

      if (!user) {
        throw ApiError.notFound('User account not found');
      }

      res.json({
        success: true,
        data: {
          ...user,
          role: user.role.toLowerCase(),
          enrolledCourses: user._count.subjects,
          totalTasks: user._count.tasks,
          totalSessions: user._count.studySessions,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/users/:id/role
  // Updates user role with strict last-admin safeguard and audit logging
  static async updateUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const callerUserId = req.user!.userId;
      const targetUserId = validateId(req.params.id, 'User ID');
      const { role } = req.body;

      if (!role) {
        throw ApiError.badRequest('New role is required');
      }

      const normRole = String(role).toUpperCase();
      if (!['STUDENT', 'ADMIN', 'ADVISOR', 'TA'].includes(normRole)) {
        throw ApiError.badRequest('Role must be one of: student, admin, advisor, ta');
      }

      // Safeguard 1: Prevent an administrator from demoting themselves directly
      if (callerUserId === targetUserId && normRole !== 'ADMIN') {
        throw ApiError.forbidden(
          'Self-demotion is prohibited. Another administrator must change your role.'
        );
      }

      const updatedUser = await prisma.$transaction(async (tx: any) => {
        const targetUser = await tx.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) throw ApiError.notFound('Target user not found');

        if (targetUser.role === 'ADMIN' && normRole !== 'ADMIN') {
          const adminCount = await tx.user.count({ where: { role: 'ADMIN' } });
          if (adminCount <= 1) {
            throw ApiError.forbidden(
              'Cannot demote the last administrator account. The system must retain at least one active administrator.'
            );
          }
        }

        const updated = await tx.user.update({
          where: { id: targetUserId },
          data: { role: normRole as any },
          select: { id: true, email: true, name: true, role: true, updatedAt: true },
        });

        const audit = await logAdminAction({
          adminId: callerUserId,
          adminEmail: req.user!.email,
          adminName: req.user!.name,
          action: 'USER_ROLE_UPDATE',
          category: 'user_management',
          targetId: targetUserId,
          targetType: 'User',
          details: `Updated role for ${targetUser.name} (${targetUser.email}) from ${targetUser.role} to ${normRole}`,
          ipAddress: req.ip,
        }, tx);
        if (!audit) throw ApiError.internal('Role update could not be recorded in the audit trail');
        return updated;
      }, { isolationLevel: 'Serializable' });

      res.json({
        success: true,
        message: `User role updated to ${normRole.toLowerCase()}`,
        data: {
          ...updatedUser,
          role: updatedUser.role.toLowerCase(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/users/:id
  // Atomically updates the editable directory fields so a failed profile update cannot leave a role grant behind.
  static async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const callerUserId = req.user!.userId;
      const targetUserId = validateId(req.params.id, 'User ID');
      const { role, name, major } = req.body;
      const normalizedRole = role === undefined ? undefined : String(role).toUpperCase();
      if (normalizedRole && !['STUDENT', 'ADMIN', 'ADVISOR', 'TA'].includes(normalizedRole)) {
        throw ApiError.badRequest('Role must be one of: student, admin, advisor, ta');
      }
      if (callerUserId === targetUserId && normalizedRole && normalizedRole !== 'ADMIN') {
        throw ApiError.forbidden('Self-demotion is prohibited. Another administrator must change your role.');
      }

      const updatedUser = await prisma.$transaction(async (tx: any) => {
        const current = await tx.user.findUnique({ where: { id: targetUserId } });
        if (!current) throw ApiError.notFound('Target user not found');

        if (current.role === 'ADMIN' && normalizedRole && normalizedRole !== 'ADMIN') {
          const adminCount = await tx.user.count({ where: { role: 'ADMIN' } });
          if (adminCount <= 1) {
            throw ApiError.forbidden('Cannot demote the last administrator account.');
          }
        }

        const updates: any = {};
        if (normalizedRole) updates.role = normalizedRole;
        if (name !== undefined) updates.name = validateString(name, 'Name', 2, 80);
        if (major !== undefined) updates.major = validateString(major, 'Academic Major', 2, 100);
        if (Object.keys(updates).length === 0) {
          throw ApiError.badRequest('At least one editable user field is required');
        }

        const updated = await tx.user.update({
          where: { id: targetUserId },
          data: updates,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            major: true,
            term: true,
            updatedAt: true,
          },
        });
        const audit = await logAdminAction({
          adminId: callerUserId,
          adminEmail: req.user!.email,
          adminName: req.user!.name,
          action: 'USER_PROFILE_UPDATE',
          category: 'user_management',
          targetId: targetUserId,
          targetType: 'User',
          details: `Updated directory profile for ${current.name} (${current.email}): ${JSON.stringify(updates)}`,
          ipAddress: req.ip,
        }, tx);
        if (!audit) throw ApiError.internal('User update could not be recorded in the audit trail');
        return updated;
      }, { isolationLevel: 'Serializable' });

      res.json({
        success: true,
        message: 'User directory profile updated',
        data: { ...updatedUser, role: updatedUser.role.toLowerCase() },
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/users/:id/status
  // Updates user academic status / term status with audit logging
  static async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const callerUserId = req.user!.userId;
      const targetUserId = validateId(req.params.id, 'User ID');
      const { term, major } = req.body;

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        throw ApiError.notFound('Target user not found');
      }

      const updates: any = {};
      if (term !== undefined) updates.term = validateString(term, 'Academic Term', 2, 50);
      if (major !== undefined) updates.major = validateString(major, 'Academic Major', 2, 100);

      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: updates,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          major: true,
          term: true,
          updatedAt: true,
        },
      });

      await logAdminAction({
        adminId: callerUserId,
        adminEmail: req.user!.email,
        adminName: req.user!.name,
        action: 'USER_STATUS_CHANGE',
        category: 'user_management',
        targetId: targetUserId,
        targetType: 'User',
        details: `Updated academic status for ${targetUser.name} (${targetUser.email}): ${JSON.stringify(updates)}`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'User academic profile status updated',
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/audit-logs
  // Admin-only audit log API to track sensitive actions with filtering and pagination
  static async listAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { category, action, search, page, limit } = req.query;

      const whereClause: any = {};

      if (category && typeof category === 'string' && category !== 'all') {
        whereClause.category = category;
      }

      if (action && typeof action === 'string' && action !== 'all') {
        whereClause.action = action;
      }

      if (search && typeof search === 'string' && search.trim()) {
        const query = search.trim();
        whereClause.OR = [
          { adminEmail: { contains: query, mode: 'insensitive' } },
          { adminName: { contains: query, mode: 'insensitive' } },
          { details: { contains: query, mode: 'insensitive' } },
          { action: { contains: query, mode: 'insensitive' } },
        ];
      }

      const pageNum = page ? Math.max(1, parseInt(String(page), 10) || 1) : 1;
      const pageSize = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 50;
      const skip = (pageNum - 1) * pageSize;

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where: whereClause }),
        prisma.auditLog.findMany({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
          skip,
          take: pageSize,
        }),
      ]);

      res.json({
        success: true,
        data: logs,
        meta: {
          total,
          page: pageNum,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // Institutional Governance Settings State
  public static institutionalSettings: any = {
    termName: 'Fall Semester 2026',
    academicYear: '2026–2027',
    startDate: '2026-08-24',
    endDate: '2026-12-18',
    censusDate: '2026-09-08',
    withdrawalDeadline: '2026-10-16',
    readingStart: '2026-12-07',
    readingEnd: '2026-12-09',
    finalsStart: '2026-12-10',
    finalsEnd: '2026-12-18',
    defaultDailyStudyCap: '6.0',
    defaultSessionMinutes: '50',
    overloadThreshold: '8.0',
    updatedAt: new Date().toISOString(),
  };

  // GET /api/admin/catalog
  // Master Institutional Curriculum Catalog overview
  static async getCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const allSubjects = await prisma.subject.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          instructor: true,
          credits: true,
          colorKey: true,
          weeklyTargetHours: true,
          classroom: true,
        },
      });

      const inferDepartment = (code: string): string => {
        const prefix = (code || '').split(' ')[0]?.toUpperCase() || '';
        const deptMap: Record<string, string> = {
          CS: 'Computer Science',
          MATH: 'Mathematics',
          BIO: 'Biology',
          PHIL: 'Philosophy',
          PHYS: 'Physics',
          ECON: 'Economics',
          CHEM: 'Chemistry',
          ENG: 'English Literature',
          HIST: 'History',
          PSYC: 'Psychology',
          ART: 'Fine Arts',
          MUS: 'Music',
          STAT: 'Statistics',
          ENGR: 'Engineering',
        };
        return deptMap[prefix] || 'General Academics';
      };

      const catalogMap = new Map<string, any>();
      for (const s of allSubjects) {
        if (!catalogMap.has(s.code)) {
          catalogMap.set(s.code, {
            id: s.id,
            code: s.code,
            name: s.name,
            title: s.name,
            department: inferDepartment(s.code),
            instructor: s.instructor || 'Staff Faculty',
            credits: s.credits,
            category: s.colorKey,
            expectedWeeklyHours: s.weeklyTargetHours,
            classroom: s.classroom || 'Main Campus',
            activeEnrollments: 1,
            activeEnrolledCount: 1,
          });
        } else {
          const entry = catalogMap.get(s.code);
          entry.activeEnrollments += 1;
          entry.activeEnrolledCount += 1;
        }
      }

      // If database has no subjects yet, provide standard institutional catalog defaults
      if (catalogMap.size === 0) {
        const defaults = [
          { code: 'CS 201', title: 'Data Structures & Algorithms', department: 'Computer Science', credits: 4, instructor: 'Prof. Marcus Chen', expectedWeeklyHours: 8.0, activeEnrolledCount: 384 },
          { code: 'MATH 241', title: 'Multivariable Calculus', department: 'Mathematics', credits: 4, instructor: 'Dr. Sarah Jenkins', expectedWeeklyHours: 8.0, activeEnrolledCount: 312 },
          { code: 'BIO 110', title: 'Principles of Molecular Biology', department: 'Biology', credits: 3, instructor: 'Dr. Aris Thorne', expectedWeeklyHours: 6.0, activeEnrolledCount: 248 },
          { code: 'PHIL 105', title: 'Ethics in the Information Age', department: 'Philosophy', credits: 3, instructor: 'Prof. David Morales', expectedWeeklyHours: 4.5, activeEnrolledCount: 165 },
          { code: 'PHYS 211', title: 'Classical Mechanics & Thermal Physics', department: 'Physics', credits: 4, instructor: 'Dr. Hannah Weber', expectedWeeklyHours: 8.5, activeEnrolledCount: 194 },
        ];
        for (const d of defaults) {
          catalogMap.set(d.code, { ...d, id: `cat_${d.code.replace(/\s+/g, '_')}`, name: d.title, activeEnrollments: d.activeEnrolledCount });
        }
      }

      const masterCatalog = Array.from(catalogMap.values()).sort((a, b) => a.code.localeCompare(b.code));

      res.json({
        success: true,
        data: masterCatalog,
        meta: {
          totalCatalogCourses: masterCatalog.length,
          totalStudentEnrollments: allSubjects.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/admin/catalog
  // Adds a course to the institutional master curriculum with audit logging
  static async createCatalogCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { code, title, department, credits, instructor, expectedWeeklyHours, description, syllabusOverview } = req.body;
      const validCode = validateString(code, 'Course Code', 2, 20).toUpperCase();
      const validTitle = validateString(title, 'Course Title', 2, 120);
      const validCredits = parseInt(String(credits || 4), 10) || 4;
      const validHours = parseFloat(String(expectedWeeklyHours || 6.0)) || 6.0;
      const validInstructor = instructor ? validateString(instructor, 'Instructor', 2, 80) : 'Staff Faculty';

      const created = await prisma.subject.create({
        data: {
          userId: req.user!.userId,
          code: validCode,
          name: validTitle,
          credits: validCredits,
          instructor: validInstructor,
          weeklyTargetHours: validHours,
          colorKey: validCode.toLowerCase().startsWith('cs') ? 'cs' : 'stem',
        },
      });

      await logAdminAction({
        adminId: req.user!.userId,
        adminEmail: req.user!.email,
        adminName: req.user!.name,
        action: 'CURRICULUM_CREATE',
        category: 'curriculum',
        targetId: validCode,
        targetType: 'Subject',
        details: `Created master course ${validCode} ("${validTitle}", ${validCredits}cr) in ${department || 'General Academics'}`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: `Added ${validCode} to institutional curriculum`,
        data: {
          id: created.id,
          code: validCode,
          title: validTitle,
          name: validTitle,
          department: department || 'General Academics',
          credits: validCredits,
          instructor: validInstructor,
          expectedWeeklyHours: validHours,
          description: description || '',
          syllabusOverview: syllabusOverview || '',
          activeEnrolledCount: 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/catalog/:code
  // Updates a course in the institutional master curriculum with audit logging
  static async updateCatalogCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const targetCode = decodeURIComponent(req.params.code).toUpperCase();
      const { title, credits, instructor, expectedWeeklyHours, department } = req.body;

      const updates: any = {};
      if (title !== undefined) updates.name = validateString(title, 'Course Title', 2, 120);
      if (credits !== undefined) updates.credits = parseInt(String(credits), 10) || 3;
      if (instructor !== undefined) updates.instructor = validateString(instructor, 'Instructor', 2, 80);
      if (expectedWeeklyHours !== undefined) updates.weeklyTargetHours = parseFloat(String(expectedWeeklyHours)) || 6.0;

      await prisma.subject.updateMany({
        where: { code: targetCode },
        data: updates,
      });

      await logAdminAction({
        adminId: req.user!.userId,
        adminEmail: req.user!.email,
        adminName: req.user!.name,
        action: 'CURRICULUM_UPDATE',
        category: 'curriculum',
        targetId: targetCode,
        targetType: 'Subject',
        details: `Updated curriculum specifications for ${targetCode}: ${JSON.stringify(updates)}`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: `Updated syllabus specifications for ${targetCode}`,
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/admin/catalog/:code
  // Removes a course from the master curriculum with audit logging
  static async deleteCatalogCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const targetCode = decodeURIComponent(req.params.code).toUpperCase();

      await prisma.subject.deleteMany({
        where: { code: targetCode },
      });

      await logAdminAction({
        adminId: req.user!.userId,
        adminEmail: req.user!.email,
        adminName: req.user!.name,
        action: 'CURRICULUM_DELETE',
        category: 'curriculum',
        targetId: targetCode,
        targetType: 'Subject',
        details: `Removed course ${targetCode} from master curriculum catalog`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: `Removed ${targetCode} from curriculum catalog`,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/settings
  // Retrieves institutional settings
  static async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: AdminController.institutionalSettings,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/settings
  // Updates institutional settings with audit logging
  static async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const updates = req.body;
      AdminController.institutionalSettings = {
        ...AdminController.institutionalSettings,
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user!.name || req.user!.email,
      };

      await logAdminAction({
        adminId: req.user!.userId,
        adminEmail: req.user!.email,
        adminName: req.user!.name,
        action: 'SETTINGS_UPDATE',
        category: 'system',
        targetType: 'System',
        targetId: 'institutional_settings',
        details: `Updated institutional policies and boundaries: ${JSON.stringify(updates)}`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'Institutional settings updated successfully',
        data: AdminController.institutionalSettings,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/metrics
  // Real institutional analytics computed from PostgreSQL records
  static async getMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const [
        totalStudents,
        totalAdmins,
        totalFaculty,
        totalSubjects,
        totalTasks,
        completedTasks,
        totalSessions,
        completedSessions,
        announcementsCount,
        auditLogsCount,
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.count({ where: { role: { in: ['ADVISOR', 'TA'] } } }),
        prisma.subject.count(),
        prisma.task.count(),
        prisma.task.count({ where: { status: 'COMPLETED' } }),
        prisma.studySession.count(),
        prisma.studySession.count({ where: { status: 'COMPLETED' } }),
        prisma.announcement.count(),
        prisma.auditLog.count(),
      ]);

      const sessions = await prisma.studySession.findMany({
        where: { status: 'COMPLETED' },
        select: { actualMinutesLogged: true, durationMinutes: true },
      });
      const totalLoggedMinutes = sessions.reduce((acc: number, s: any) => acc + (s.actualMinutesLogged ?? s.durationMinutes), 0);
      const totalLoggedHours = Math.round((totalLoggedMinutes / 60) * 10) / 10;

      const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const sessionExecutionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

      res.json({
        success: true,
        metrics: {
          userBreakdown: {
            students: totalStudents,
            administrators: totalAdmins,
            advisorsAndTAs: totalFaculty,
            totalUsers: totalStudents + totalAdmins + totalFaculty,
          },
          academicWorkload: {
            totalEnrollments: totalSubjects,
            totalTasksAllocated: totalTasks,
            completedTasks,
            taskCompletionRate,
          },
          studyExecution: {
            totalSessionsScheduled: totalSessions,
            completedSessions,
            sessionExecutionRate,
            totalLoggedHours,
          },
          securityAndGovernance: {
            totalAuditLogs: auditLogsCount,
            activeAnnouncements: announcementsCount,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/announcements
  // List all institutional announcements
  static async listAnnouncements(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const where: any = {};
      if (req.user!.role !== 'admin') {
        const currentUser = await prisma.user.findUnique({
          where: { id: req.user!.userId },
          select: { major: true },
        });
        const major = currentUser?.major?.toLowerCase() || '';
        const cohorts = ['all', 'undergrad'];
        if (/computer|engineering|math|science|biology|chemistry|physics|stem/.test(major)) cohorts.push('stem');
        if (/humanit|history|philosophy|language|literature|arts/.test(major)) cohorts.push('humanities');
        where.status = 'published';
        where.targetCohort = { in: cohorts };
        where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
      }
      const announcementsList = await prisma.announcement.findMany({
        where,
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      });

      res.json({
        success: true,
        data: announcementsList,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/admin/announcements
  // Create and broadcast a new institutional announcement with audit logging
  static async createAnnouncement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { title, content, priority, targetCohort, pinned, status } = req.body;

      const validTitle = validateString(title, 'Title', 3, 150);
      const validContent = validateString(content, 'Content body', 5, 3000);

      const validPriority = priority === undefined ? 'normal' : String(priority).toLowerCase();
      if (!['normal', 'important', 'critical'].includes(validPriority)) {
        throw ApiError.badRequest('Priority must be normal, important, or critical');
      }
      const validCohort = targetCohort === undefined ? 'all' : String(targetCohort).toLowerCase();
      if (!['all', 'stem', 'humanities', 'undergrad'].includes(validCohort)) {
        throw ApiError.badRequest('Target cohort must be all, stem, humanities, or undergrad');
      }
      const validStatus = status === undefined ? 'published' : String(status).toLowerCase();
      if (!['published', 'draft', 'archived'].includes(validStatus)) {
        throw ApiError.badRequest('Status must be published, draft, or archived');
      }

      const newAnnouncement = await prisma.$transaction(async (tx: any) => {
        const created = await tx.announcement.create({
          data: {
            title: validTitle,
            content: validContent,
            author: req.user!.name || 'Department Dean',
            priority: validPriority,
            targetCohort: validCohort,
            pinned: pinned === undefined ? false : validateBoolean(pinned, 'Pinned'),
            status: validStatus,
          },
        });
        const audit = await logAdminAction({
          adminId: req.user!.userId,
          adminEmail: req.user!.email,
          adminName: req.user!.name,
          action: 'ANNOUNCEMENT_CREATE',
          category: 'broadcast',
          targetId: created.id,
          targetType: 'Announcement',
          details: `Published announcement "${validTitle}" to cohort: ${validCohort} (${validPriority})`,
          ipAddress: req.ip,
        }, tx);
        if (!audit) throw ApiError.internal('Announcement was not saved because audit recording failed');
        return created;
      });

      res.status(201).json({
        success: true,
        message: 'Announcement broadcasted successfully',
        data: newAnnouncement,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/announcements/:id
  // Edit an existing institutional announcement with audit logging
  static async updateAnnouncement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const annId = validateId(req.params.id, 'Announcement ID');
      const { title, content, priority, targetCohort, pinned, status } = req.body;

      const ann = await prisma.announcement.findUnique({
        where: { id: annId },
      });

      if (!ann) {
        throw ApiError.notFound('Announcement not found');
      }

      const updates: any = {};
      if (title !== undefined) updates.title = validateString(title, 'Title', 3, 150);
      if (content !== undefined) updates.content = validateString(content, 'Content body', 5, 3000);
      if (priority !== undefined) {
        const value = String(priority).toLowerCase();
        if (!['normal', 'important', 'critical'].includes(value)) {
          throw ApiError.badRequest('Priority must be normal, important, or critical');
        }
        updates.priority = value;
      }
      if (targetCohort !== undefined) {
        const value = String(targetCohort).toLowerCase();
        if (!['all', 'stem', 'humanities', 'undergrad'].includes(value)) {
          throw ApiError.badRequest('Target cohort must be all, stem, humanities, or undergrad');
        }
        updates.targetCohort = value;
      }
      if (pinned !== undefined) updates.pinned = validateBoolean(pinned, 'Pinned');
      if (status !== undefined) {
        const value = String(status).toLowerCase();
        if (!['published', 'draft', 'archived'].includes(value)) {
          throw ApiError.badRequest('Status must be published, draft, or archived');
        }
        updates.status = value;
      }

      const updated = await prisma.$transaction(async (tx: any) => {
        const saved = await tx.announcement.update({ where: { id: annId }, data: updates });
        const audit = await logAdminAction({
          adminId: req.user!.userId,
          adminEmail: req.user!.email,
          adminName: req.user!.name,
          action: 'ANNOUNCEMENT_UPDATE',
          category: 'broadcast',
          targetId: annId,
          targetType: 'Announcement',
          details: `Updated announcement "${saved.title}"`,
          ipAddress: req.ip,
        }, tx);
        if (!audit) throw ApiError.internal('Announcement was not saved because audit recording failed');
        return saved;
      });

      res.json({
        success: true,
        message: 'Announcement updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/admin/announcements/:id
  // Remove an institutional announcement with audit logging
  static async deleteAnnouncement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const annId = validateId(req.params.id, 'Announcement ID');

      const ann = await prisma.announcement.findUnique({
        where: { id: annId },
      });

      if (!ann) {
        throw ApiError.notFound('Announcement not found');
      }

      await prisma.$transaction(async (tx: any) => {
        await tx.announcement.delete({ where: { id: annId } });
        const audit = await logAdminAction({
          adminId: req.user!.userId,
          adminEmail: req.user!.email,
          adminName: req.user!.name,
          action: 'ANNOUNCEMENT_DELETE',
          category: 'broadcast',
          targetId: annId,
          targetType: 'Announcement',
          details: `Deleted global announcement "${ann.title}" (Author: ${ann.author})`,
          ipAddress: req.ip,
        }, tx);
        if (!audit) throw ApiError.internal('Announcement was not deleted because audit recording failed');
      });

      res.json({
        success: true,
        message: 'Announcement removed successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
