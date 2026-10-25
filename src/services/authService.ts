/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient';
import { User, UserRole } from '../types';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user: User;
  message?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  major?: string;
  term?: string;
}

function normalizeUser(raw: any): User {
  if (!raw) return raw;
  return {
    ...raw,
    role: (raw.role ? String(raw.role).toLowerCase() : 'student') as UserRole,
  };
}

export const authService = {
  async register(data: RegisterPayload): Promise<AuthResponse> {
    const res = await apiClient.post<any>('/auth/register', data);
    if (res.token) {
      apiClient.setToken(res.token);
    }
    return {
      ...res,
      user: normalizeUser(res.user),
    };
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await apiClient.post<any>('/auth/login', {
      email,
      password,
    });
    if (res.token) {
      apiClient.setToken(res.token);
    }
    return {
      ...res,
      user: normalizeUser(res.user),
    };
  },

  async getCurrentUser(): Promise<User> {
    const res = await apiClient.get<{ success: boolean; user: any }>('/auth/me');
    return normalizeUser(res.user);
  },

  async updatePreferences(prefs: Partial<User>): Promise<User> {
    const res = await apiClient.patch<{ success: boolean; user: any }>('/auth/preferences', prefs);
    return normalizeUser(res.user);
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Even if network fails, proceed with client logout
    } finally {
      apiClient.clearToken();
    }
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', { email });
  },

  async verifyResetCode(
    email: string,
    code: string
  ): Promise<{ success: boolean; message: string; resetToken?: string }> {
    return apiClient.post<{ success: boolean; message: string; resetToken: string }>(
      '/auth/verify-reset-code',
      { email, code }
    );
  },

  async resetPassword(
    email: string,
    resetToken: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', {
      email,
      resetToken,
      newPassword,
    });
  },
};
