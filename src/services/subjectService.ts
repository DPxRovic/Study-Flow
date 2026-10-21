/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient';
import { Subject } from '../types';

export interface SubjectListResponse {
  success: boolean;
  data: Subject[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const subjectService = {
  async list(search?: string): Promise<Subject[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await apiClient.get<SubjectListResponse>(`/subjects${query}`);
    return res.data || [];
  },

  async getById(id: string): Promise<Subject> {
    const res = await apiClient.get<{ success: boolean; data: Subject }>(`/subjects/${id}`);
    return res.data;
  },

  async create(subject: Omit<Subject, 'id'>): Promise<Subject> {
    const res = await apiClient.post<{ success: boolean; data: Subject; message: string }>('/subjects', subject);
    return res.data;
  },

  async update(id: string, updates: Partial<Subject>): Promise<Subject> {
    const res = await apiClient.patch<{ success: boolean; data: Subject; message: string }>(`/subjects/${id}`, updates);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete<{ success: boolean; message: string }>(`/subjects/${id}`);
  },
};
