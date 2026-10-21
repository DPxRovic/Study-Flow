/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { authService, RegisterPayload } from '../services/authService';
import { apiClient } from '../services/apiClient';

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: User;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  major?: string;
  term?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password?: string) => Promise<LoginResult>;
  register: (data: RegisterData) => Promise<LoginResult>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; emailExists: boolean }>;
  switchRole: (role: UserRole) => Promise<void>;
  updateUserPreferences: (prefs: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize session from verified JWT token on app load
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      const token = apiClient.getToken();
      if (!token) {
        if (isMounted) {
          setUser(null);
          setIsInitializing(false);
        }
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (err) {
        // If token is invalid or expired, clear it safely
        apiClient.clearToken();
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    initializeAuth();

    // Listen for unauthorized events emitted by apiClient
    const unsubscribe = apiClient.onUnauthorized(() => {
      if (isMounted) {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  /**
   * Real API Login with backend JWT authentication
   */
  const login = async (email: string, password = 'studyflow2026'): Promise<LoginResult> => {
    try {
      const res = await authService.login(email.trim(), password);
      if (res.success && res.user) {
        setUser(res.user);
        return { success: true, user: res.user };
      }
      return {
        success: false,
        error: res.message || 'Login failed. Please check your credentials.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Authentication failed. Please verify your email and password.',
      };
    }
  };

  /**
   * Real API Registration with password hashing & PostgreSQL persistence
   */
  const register = async (data: RegisterData): Promise<LoginResult> => {
    try {
      const payload: RegisterPayload = {
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        major: data.major?.trim(),
        term: data.term?.trim(),
      };
      const res = await authService.register(payload);
      if (res.success && res.user) {
        setUser(res.user);
        return { success: true, user: res.user };
      }
      return {
        success: false,
        error: res.message || 'Registration could not be completed.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'An error occurred while creating your account.',
      };
    }
  };

  /**
   * Password recovery helper
   */
  const requestPasswordReset = async (email: string): Promise<{ success: boolean; emailExists: boolean }> => {
    const trimmed = email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return {
      success: isValidEmail,
      emailExists: isValidEmail,
    };
  };

  /**
   * Real API Logout
   */
  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  /**
   * Role Switcher for instant testing / demonstration
   * Authenticates as the corresponding verified database user
   */
  const switchRole = useCallback(async (newRole: UserRole) => {
    if (newRole === 'admin') {
      await login('e.vance@university.edu', 'studyflow2026');
    } else {
      await login('m.lin@university.edu', 'studyflow2026');
    }
  }, []);

  /**
   * Real API user preference updates persisted to PostgreSQL
   */
  const updateUserPreferences = async (prefs: Partial<User>) => {
    try {
      const updatedUser = await authService.updatePreferences(prefs);
      setUser(updatedUser);
    } catch (err) {
      // Optimistically retain existing state if network update failed
      console.error('Failed to persist user preferences:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'student',
        isAuthenticated: !!user,
        isInitializing,
        login,
        register,
        logout,
        requestPasswordReset,
        switchRole,
        updateUserPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
