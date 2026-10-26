/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient';
import { Task, TaskPriority, TaskStatus, TaskType } from '../types';

export interface TaskQueryParams {
  subjectId?: string;
  status?: string;
  priority?: string;
  type?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TaskListResponse {
  success: boolean;
  data: any[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function normalizeTask(raw: any): Task {
  return {
    id: raw.id,
    subjectId: raw.subjectId,
    title: raw.title,
    dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : new Date(raw.dueDate).toISOString(),
    estimatedHours: Number(raw.estimatedHours) || 0,
    remainingHours: Number(raw.remainingHours) || 0,
    type: (raw.type ? String(raw.type).toLowerCase() : 'assignment') as TaskType,
    priority: (raw.priority ? String(raw.priority).toLowerCase() : 'medium') as TaskPriority,
    status: (raw.status ? String(raw.status).toLowerCase() : 'backlog') as TaskStatus,
    notes: raw.notes || undefined,
    subtasks: Array.isArray(raw.subtasks)
      ? raw.subtasks.map((s: any) => ({
          id: s.id || `st_${Math.random().toString(36).substring(2, 9)}`,
          title: s.title || '',
          completed: Boolean(s.completed),
        }))
      : undefined,
    acceptanceOpen: Boolean(raw.acceptanceOpen),
    acceptanceReopenedUntil: raw.acceptanceReopenedUntil || undefined,
  };
}

export type CreateTaskPayload = Omit<Task, 'id' | 'remainingHours' | 'status'> & {
  remainingHours?: number;
  status?: TaskStatus;
};

export const taskService = {
  async list(params: TaskQueryParams = {}): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params.subjectId && params.subjectId !== 'all') query.set('subjectId', params.subjectId);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.priority && params.priority !== 'all') query.set('priority', params.priority);
    if (params.type && params.type !== 'all') query.set('type', params.type);
    if (params.search) query.set('search', params.search);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const res = await apiClient.get<TaskListResponse>(`/tasks${qs ? `?${qs}` : ''}`);
    return (res.data || []).map(normalizeTask);
  },

  async getById(id: string): Promise<Task> {
    const res = await apiClient.get<{ success: boolean; data: any }>(`/tasks/${id}`);
    return normalizeTask(res.data);
  },

  async create(task: CreateTaskPayload): Promise<Task> {
    const res = await apiClient.post<{ success: boolean; data: any; message: string }>('/tasks', task);
    return normalizeTask(res.data);
  },

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const res = await apiClient.patch<{ success: boolean; data: any; message: string }>(`/tasks/${id}`, updates);
    return normalizeTask(res.data);
  },

  async toggleComplete(id: string): Promise<Task> {
    const res = await apiClient.patch<{ success: boolean; data: any; message: string }>(`/tasks/${id}/complete`);
    return normalizeTask(res.data);
  },

  async reopenAcceptance(id: string, until: string): Promise<Task> {
    const res = await apiClient.patch<{ success: boolean; data: any; message: string }>(
      `/tasks/${id}/reopen-acceptance`,
      { until }
    );
    return normalizeTask(res.data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete<{ success: boolean; message: string }>(`/tasks/${id}`);
  },
};
