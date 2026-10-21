/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient';
import { ScheduledSession, SessionStatus } from '../types';

export interface SessionQueryParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  subjectId?: string;
  taskId?: string;
  status?: string;
  locked?: boolean;
}

function normalizeSession(raw: any): ScheduledSession {
  return {
    id: raw.id,
    taskId: raw.taskId,
    subjectId: raw.subjectId,
    date: raw.date,
    startTime: raw.startTime,
    endTime: raw.endTime,
    durationMinutes: Number(raw.durationMinutes) || 0,
    completed: Boolean(raw.completed || String(raw.status).toUpperCase() === 'COMPLETED'),
    status: (raw.status ? String(raw.status).toLowerCase() : 'scheduled') as SessionStatus,
    actualMinutesLogged: raw.actualMinutesLogged !== undefined && raw.actualMinutesLogged !== null
      ? Number(raw.actualMinutesLogged)
      : undefined,
    locked: Boolean(raw.locked),
    notes: raw.notes || undefined,
  };
}

export const scheduleService = {
  async getSchedule(startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    const qs = query.toString();
    return apiClient.get<any>(`/schedule${qs ? `?${qs}` : ''}`);
  },

  async generateSchedule(options: {
    startDate?: string;
    endDate?: string;
    mode?: string;
    targetDailyStudyCapHours?: number;
    defaultSessionMinutes?: number;
    preferredBreakMinutes?: number;
    bufferMinutes?: number;
    preferredStudyTime?: string;
  } = {}) {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: {
        dateRange: { startDate: string; endDate: string; totalDays: number };
        sessions: any[];
        generatedCount: number;
        preservedCount: number;
        unscheduledTasks: any[];
        warnings: string[];
        summary: any;
      };
    }>('/schedule/generate', options);

    return {
      ...res.data,
      sessions: (res.data.sessions || []).map(normalizeSession),
    };
  },

  async listSessions(params: SessionQueryParams = {}): Promise<ScheduledSession[]> {
    const query = new URLSearchParams();
    if (params.date) query.set('date', params.date);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.subjectId && params.subjectId !== 'all') query.set('subjectId', params.subjectId);
    if (params.taskId) query.set('taskId', params.taskId);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.locked !== undefined) query.set('locked', String(params.locked));

    const qs = query.toString();
    const res = await apiClient.get<{ success: boolean; data: any[] }>(`/schedule/sessions${qs ? `?${qs}` : ''}`);
    return (res.data || []).map(normalizeSession);
  },

  async getSessionById(id: string): Promise<ScheduledSession> {
    const res = await apiClient.get<{ success: boolean; data: any }>(`/schedule/sessions/${id}`);
    return normalizeSession(res.data);
  },

  async createSession(session: Omit<ScheduledSession, 'id'>): Promise<ScheduledSession> {
    const res = await apiClient.post<{ success: boolean; data: any; message: string }>(
      '/schedule/sessions',
      session
    );
    return normalizeSession(res.data);
  },

  async updateSession(id: string, updates: Partial<ScheduledSession>): Promise<ScheduledSession> {
    const res = await apiClient.patch<{ success: boolean; data: any; message: string }>(
      `/schedule/sessions/${id}`,
      updates
    );
    return normalizeSession(res.data);
  },

  async toggleLock(id: string): Promise<ScheduledSession> {
    const res = await apiClient.patch<{ success: boolean; data: any; message: string }>(
      `/schedule/sessions/${id}/lock`
    );
    return normalizeSession(res.data);
  },

  async updateStatus(
    id: string,
    status: SessionStatus,
    actualMinutesLogged?: number
  ): Promise<ScheduledSession> {
    const res = await apiClient.patch<{ success: boolean; data: any; message: string }>(
      `/schedule/sessions/${id}/status`,
      { status, actualMinutesLogged }
    );
    return normalizeSession(res.data);
  },

  async deleteSession(id: string): Promise<void> {
    await apiClient.delete<{ success: boolean; message: string }>(`/schedule/sessions/${id}`);
  },
};
