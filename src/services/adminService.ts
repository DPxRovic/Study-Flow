/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

/**
 * Retrieves or establishes an authenticated session token for administrative requests.
 */
async function getAdminToken(): Promise<string> {
  const existingToken = localStorage.getItem('studyflow_token');
  if (existingToken) return existingToken;

  // Auto-authenticate as default administrator Elena Vance if token is missing
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'e.vance@university.edu',
        password: 'studyflow2026',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('studyflow_token', data.token);
        return data.token;
      }
    }
  } catch (err) {
    console.warn('[adminService] Token bootstrap warning:', err);
  }
  return '';
}

/**
 * Universal authenticated API fetcher with token injection and error handling.
 */
async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAdminToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = json?.error?.message || json?.message || `HTTP error ${response.status}`;
    throw new Error(errorMessage);
  }

  return json as T;
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
    return adminFetch<PaginatedAuditResponse>(`/api/admin/audit-logs${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Retrieves summary statistics for audit activity.
   */
  async getAuditStats(): Promise<AuditStatsResponse> {
    return adminFetch<AuditStatsResponse>('/api/admin/audit-logs/stats');
  },

  /**
   * Retrieves a single audit record by its unique ID.
   */
  async getAuditLogById(id: string): Promise<{ success: boolean; data: AuditLogRecord }> {
    return adminFetch<{ success: boolean; data: AuditLogRecord }>(`/api/admin/audit-logs/${id}`);
  },

  /**
   * Retrieves institutional analytics computed from real PostgreSQL records.
   */
  async getMetrics(): Promise<AdminMetricsResponse> {
    return adminFetch<AdminMetricsResponse>('/api/admin/metrics');
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
    return adminFetch<{ success: boolean; data: DirectoryUser[]; meta: any }>(
      `/api/admin/users${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Updates user role with server-side last-admin safeguard and automatic audit logging.
   */
  async updateUserRole(userId: string, role: string) {
    return adminFetch<{ success: boolean; message: string; data: any }>(
      `/api/admin/users/${userId}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }
    );
  },

  /**
   * Updates user status/term/major with automatic audit logging.
   */
  async updateUserStatus(userId: string, data: { term?: string; major?: string }) {
    return adminFetch<{ success: boolean; message: string; data: any }>(
      `/api/admin/users/${userId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Retrieves all institutional announcements.
   */
  async getAnnouncements(): Promise<{ success: boolean; data: Announcement[] }> {
    return adminFetch<{ success: boolean; data: Announcement[] }>('/api/admin/announcements');
  },

  /**
   * Broadcasts a new campus announcement and generates an audit log record.
   */
  async createAnnouncement(data: Partial<Announcement>) {
    return adminFetch<{ success: boolean; message: string; data: Announcement }>(
      '/api/admin/announcements',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Updates an existing announcement with audit logging.
   */
  async updateAnnouncement(id: string, data: Partial<Announcement>) {
    return adminFetch<{ success: boolean; message: string; data: Announcement }>(
      `/api/admin/announcements/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Deletes an announcement with audit logging.
   */
  async deleteAnnouncement(id: string) {
    return adminFetch<{ success: boolean; message: string }>(
      `/api/admin/announcements/${id}`,
      {
        method: 'DELETE',
      }
    );
  },

  /**
   * Retrieves master curriculum catalog from PostgreSQL.
   */
  async getCatalog(): Promise<{ success: boolean; data: CatalogCourse[]; meta: any }> {
    return adminFetch<{ success: boolean; data: CatalogCourse[]; meta: any }>('/api/admin/catalog');
  },
};
