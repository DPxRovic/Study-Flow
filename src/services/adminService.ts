/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient';
import { AuditLogRecord, DirectoryUser, Announcement, CatalogCourse } from '../types';

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  action?: string;
  targetType?: string;
  adminId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  order?: 'desc' | 'asc';
}

export interface PaginatedAuditResponse {
  success: boolean;
  data: AuditLogRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface AuditStatsResponse {
  success: boolean;
  stats: {
    totalLogs: number;
    todayCount: number;
    byCategory: {
      user_management: number;
      security: number;
      broadcast: number;
      curriculum: number;
      system: number;
    };
    topAdmins: Array<{
      name: string;
      email: string;
      count: number;
    }>;
  };
}

export interface AdminMetricsResponse {
  success: boolean;
  metrics: {
    userBreakdown: {
      students: number;
      administrators: number;
      advisorsAndTAs: number;
      totalUsers: number;
    };
    academicWorkload: {
      totalEnrollments: number;
      totalTasksAllocated: number;
      completedTasks: number;
      taskCompletionRate: number;
    };
    studyExecution: {
      totalSessionsScheduled: number;
      completedSessions: number;
      sessionExecutionRate: number;
      totalLoggedHours: number;
    };
    securityAndGovernance: {
      totalAuditLogs: number;
      activeAnnouncements: number;
    };
  };
}

export const adminService = {
  /**
   * Retrieves paginated audit logs with search and category filters.
   */
  async getAuditLogs(params: AuditLogQueryParams = {}): Promise<PaginatedAuditResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.action && params.action !== 'all') query.set('action', params.action);
    if (params.targetType && params.targetType !== 'all') query.set('targetType', params.targetType);
    if (params.adminId && params.adminId !== 'all') query.set('adminId', params.adminId);
    if (params.search) query.set('search', params.search);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.order) query.set('order', params.order);

    const queryString = query.toString();
    return apiClient.get<PaginatedAuditResponse>(`/admin/audit-logs${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Retrieves summary statistics for audit activity.
   */
  async getAuditStats(): Promise<AuditStatsResponse> {
    return apiClient.get<AuditStatsResponse>('/admin/audit-logs/stats');
  },

  /**
   * Retrieves a single audit record by its unique ID.
   */
  async getAuditLogById(id: string): Promise<{ success: boolean; data: AuditLogRecord }> {
    return apiClient.get<{ success: boolean; data: AuditLogRecord }>(`/admin/audit-logs/${id}`);
  },

  /**
   * Retrieves institutional analytics computed from real PostgreSQL records.
   */
  async getMetrics(): Promise<AdminMetricsResponse> {
    return apiClient.get<AdminMetricsResponse>('/admin/metrics');
  },

  /**
   * Retrieves users directory with optional role filter and search.
   */
  async getUsers(params: { role?: string; search?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.role && params.role !== 'all') query.set('role', params.role);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const queryString = query.toString();
    return apiClient.get<{ success: boolean; data: DirectoryUser[]; meta: any }>(
      `/admin/users${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Updates user role with server-side last-admin safeguard and automatic audit logging.
   */
  async updateUserRole(userId: string, role: string) {
    return apiClient.patch<{ success: boolean; message: string; data: any }>(
      `/admin/users/${userId}/role`,
      { role }
    );
  },

  async updateUser(userId: string, data: { role?: string; name?: string; major?: string }) {
    return apiClient.patch<{ success: boolean; message: string; data: any }>(
      `/admin/users/${userId}`,
      data
    );
  },

  /**
   * Updates user status/term/major with automatic audit logging.
   */
  async updateUserStatus(userId: string, data: { term?: string; major?: string }) {
    return apiClient.patch<{ success: boolean; message: string; data: any }>(
      `/admin/users/${userId}/status`,
      data
    );
  },

  /**
   * Retrieves all institutional announcements.
   */
  async getAnnouncements(): Promise<{ success: boolean; data: Announcement[] }> {
    return apiClient.get<{ success: boolean; data: Announcement[] }>('/admin/announcements');
  },

  /**
   * Broadcasts a new campus announcement and generates an audit log record.
   */
  async createAnnouncement(data: Partial<Announcement>) {
    return apiClient.post<{ success: boolean; message: string; data: Announcement }>(
      '/admin/announcements',
      data
    );
  },

  /**
   * Updates an existing announcement with audit logging.
   */
  async updateAnnouncement(id: string, data: Partial<Announcement>) {
    return apiClient.patch<{ success: boolean; message: string; data: Announcement }>(
      `/admin/announcements/${id}`,
      data
    );
  },

  /**
   * Deletes an announcement with audit logging.
   */
  async deleteAnnouncement(id: string) {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/admin/announcements/${id}`
    );
  },

  /**
   * Retrieves master curriculum catalog from PostgreSQL.
   */
  async getCatalog(): Promise<{ success: boolean; data: CatalogCourse[]; meta: any }> {
    return apiClient.get<{ success: boolean; data: CatalogCourse[]; meta: any }>('/admin/catalog');
  },

  /**
   * Provisions a new user account with role and initial credentials.
   */
  async provisionUser(data: { name: string; email: string; role: string; major?: string; password?: string }) {
    return apiClient.post<{ success: boolean; message: string; data: DirectoryUser }>('/admin/users', data);
  },

  /**
   * Deletes a user account with audit logging.
   */
  async deleteUser(userId: string) {
    return apiClient.delete<{ success: boolean; message: string }>(`/admin/users/${userId}`);
  },

  /**
   * Adds a master course to institutional curriculum catalog.
   */
  async createCatalogCourse(data: Partial<CatalogCourse>) {
    return apiClient.post<{ success: boolean; message: string; data: CatalogCourse }>('/admin/catalog', data);
  },

  /**
   * Updates master course parameters in the institutional catalog.
   */
  async updateCatalogCourse(code: string, data: Partial<CatalogCourse>) {
    return apiClient.patch<{ success: boolean; message: string; data?: CatalogCourse }>(
      `/admin/catalog/${encodeURIComponent(code)}`,
      data
    );
  },

  /**
   * Removes a course from the institutional master curriculum.
   */
  async deleteCatalogCourse(code: string) {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/admin/catalog/${encodeURIComponent(code)}`
    );
  },

  /**
   * Retrieves institutional governance settings.
   */
  async getSettings(): Promise<{ success: boolean; data: any }> {
    return apiClient.get('/admin/settings');
  },

  /**
   * Updates institutional governance settings with audit logging.
   */
  async updateSettings(data: any): Promise<{ success: boolean; message: string; data: any }> {
    return apiClient.patch('/admin/settings', data);
  },

  /**
   * Retrieves server and database health status.
   */
  async getHealth(): Promise<{ status: string; timestamp: string; database: { ok: boolean; latencyMs: number } }> {
    return apiClient.get('/health');
  },
};
