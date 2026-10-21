/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient';
import { AvailabilitySlot, SlotType, StudyPreferences } from '../types';

export interface AvailabilityListResponse {
  success: boolean;
  data: any[];
  meta?: {
    totalSlots: number;
    totalMinutesByDay: Record<number, number>;
  };
}

function normalizeSlot(raw: any): AvailabilitySlot {
  return {
    id: raw.id,
    dayOfWeek: Number(raw.dayOfWeek) as AvailabilitySlot['dayOfWeek'],
    startTime: raw.startTime,
    endTime: raw.endTime,
    type: (raw.type ? String(raw.type).toLowerCase() : 'preferred_study') as SlotType,
    label: raw.label || undefined,
  };
}

export const availabilityService = {
  async list(dayOfWeek?: number): Promise<AvailabilitySlot[]> {
    const query = dayOfWeek !== undefined ? `?dayOfWeek=${dayOfWeek}` : '';
    const res = await apiClient.get<AvailabilityListResponse>(`/availability${query}`);
    return (res.data || []).map(normalizeSlot);
  },

  async getPreferences(): Promise<StudyPreferences> {
    const res = await apiClient.get<{ success: boolean; data: StudyPreferences }>('/availability/preferences');
    return res.data;
  },

  async updatePreferences(prefs: Partial<StudyPreferences>): Promise<StudyPreferences> {
    const res = await apiClient.patch<{ success: boolean; data: StudyPreferences }>('/availability/preferences', prefs);
    return res.data;
  },

  async getById(id: string): Promise<AvailabilitySlot> {
    const res = await apiClient.get<{ success: boolean; data: any }>(`/availability/${id}`);
    return normalizeSlot(res.data);
  },

  async create(slot: Omit<AvailabilitySlot, 'id'>): Promise<AvailabilitySlot> {
    const res = await apiClient.post<{ success: boolean; data: any; message: string }>('/availability', slot);
    return normalizeSlot(res.data);
  },

  async update(id: string, updates: Partial<AvailabilitySlot>): Promise<AvailabilitySlot> {
    const res = await apiClient.patch<{ success: boolean; data: any; message: string }>(`/availability/${id}`, updates);
    return normalizeSlot(res.data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete<{ success: boolean; message: string }>(`/availability/${id}`);
  },
};
