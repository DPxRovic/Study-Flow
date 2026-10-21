/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient';
import { AcademicNotification, NotificationCategory, NotificationPriority } from '../types';

export interface NotificationQueryParams {
  category?: string;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationListResponse {
  success: boolean;
  data: any[];
  meta?: {
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function normalizeNotification(raw: any): AcademicNotification {
  return {
    id: raw.id,
    category: (raw.category ? String(raw.category).toLowerCase() : 'deadline') as NotificationCategory,
    title: raw.title,
    description: raw.description,
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date(raw.timestamp).toISOString(),
    read: Boolean(raw.read),
    actionUrl: raw.actionUrl || undefined,
    actionLabel: raw.actionLabel || undefined,
    relatedId: raw.relatedId || undefined,
    priority: (raw.priority ? String(raw.priority).toLowerCase() : 'normal') as NotificationPriority,
  };
}

export const notificationService = {
  async list(params: NotificationQueryParams = {}): Promise<{ notifications: AcademicNotification[]; unreadCount: number }> {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.unreadOnly !== undefined) query.set('unreadOnly', String(params.unreadOnly));
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const res = await apiClient.get<NotificationListResponse>(`/notifications${qs ? `?${qs}` : ''}`);
    return {
      notifications: (res.data || []).map(normalizeNotification),
      unreadCount: res.meta?.unreadCount || 0,
    };
  },

  async syncEvents(): Promise<{ createdCount: number }> {
    const res = await apiClient.post<{ success: boolean; data: { createdCount: number } }>('/notifications/sync-events');
    return res.data || { createdCount: 0 };
  },

  async markRead(id: string): Promise<AcademicNotification> {
    const res = await apiClient.patch<{ success: boolean; data: any }>(`/notifications/${id}/read`);
    return normalizeNotification(res.data);
  },

  async markAllRead(): Promise<void> {
    await apiClient.post<{ success: boolean; message: string }>('/notifications/read-all');
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete<{ success: boolean; message: string }>(`/notifications/${id}`);
  },
};
