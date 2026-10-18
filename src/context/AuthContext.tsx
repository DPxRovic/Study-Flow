/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { CURRENT_STUDENT } from '../data/mockData';

export interface RegisteredAccount extends User {
  passwordHash: string; // Plaintext simulation in mock frontend phase
}

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
  login: (email: string, password?: string) => Promise<LoginResult>;
  register: (data: RegisterData) => Promise<LoginResult>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; emailExists: boolean }>;
  switchRole: (role: UserRole) => void;
  updateUserPreferences: (prefs: Partial<User>) => void;
}

const DEFAULT_ACCOUNTS: RegisteredAccount[] = [
  {
    id: 'stu_01',
    name: 'Maya Lin',
    email: 'm.lin@university.edu',
    passwordHash: 'studyflow2026',
    role: 'student',
    major: 'Computer Science & Cognitive Science',
    term: 'Fall 2026',
    targetDailyStudyCapHours: 5.5,
    defaultSessionMinutes: 50,
    preferredBreakMinutes: 10,
    preferredStudyTime: 'afternoon',
    bufferMinutes: 15,
  },
  {
    id: 'stu_02',
    name: 'Jordan Reed',
    email: 'j.reed@university.edu',
    passwordHash: 'studyflow2026',
    role: 'student',
    major: 'Mechanical Engineering',
    term: 'Fall 2026',
    targetDailyStudyCapHours: 6.0,
    defaultSessionMinutes: 45,
    preferredBreakMinutes: 15,
    preferredStudyTime: 'morning',
    bufferMinutes: 10,
  },
  {
    id: 'adm_01',
    name: 'Dr. Elena Vance',
    email: 'e.vance@university.edu',
    passwordHash: 'admin2026',
    role: 'admin',
    major: 'Academic Affairs & Curriculum Dean',
    term: 'Fall 2026',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Registered accounts stored in localStorage to preserve across reloads
  const [accounts, setAccounts] = useState<RegisteredAccount[]>(() => {
    const saved = localStorage.getItem('studyflow_registered_accounts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_ACCOUNTS;
      }
    }
    return DEFAULT_ACCOUNTS;
  });

  // Current logged in user (null if guest)
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('studyflow_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Guest by default; null ensures guest flow works correctly
    return null;
  });

  useEffect(() => {
    localStorage.setItem('studyflow_registered_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('studyflow_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('studyflow_user');
    }
  }, [user]);

  /**
   * Validates credentials against registered mock accounts.
   */
  const login = async (email: string, password = 'studyflow2026'): Promise<LoginResult> => {
    // Artificial 250ms latency to simulate real network request and test loading states
    await new Promise((r) => setTimeout(r, 250));

    const normalizedEmail = email.trim().toLowerCase();
    const account = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);

    if (!account) {
      return {
        success: false,
        error: 'No registered student or faculty account found for this email address.',
      };
    }

    if (account.passwordHash && account.passwordHash !== password) {
      return {
        success: false,
        error: 'Incorrect password for this university email account.',
      };
    }

    const { passwordHash, ...userProfile } = account;
    setUser(userProfile);
    return { success: true, user: userProfile };
  };

  /**
   * Registers a new student account in mock state.
   */
  const register = async (data: RegisterData): Promise<LoginResult> => {
    await new Promise((r) => setTimeout(r, 300));

    const normalizedEmail = data.email.trim().toLowerCase();
    const existing = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);

    if (existing) {
      return {
        success: false,
        error: 'An account with this university email already exists. Please sign in instead.',
      };
    }

    const newAccount: RegisteredAccount = {
      id: `stu_${Date.now()}`,
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash: data.password,
      role: 'student',
      major: data.major?.trim() || 'Undeclared Major',
      term: data.term || 'Fall 2026',
      targetDailyStudyCapHours: 5.5,
      defaultSessionMinutes: 50,
    };

    setAccounts((prev) => [...prev, newAccount]);

    const { passwordHash, ...userProfile } = newAccount;
    setUser(userProfile);
    return { success: true, user: userProfile };
  };

  /**
   * Simulates password recovery validation.
   */
  const requestPasswordReset = async (email: string): Promise<{ success: boolean; emailExists: boolean }> => {
    await new Promise((r) => setTimeout(r, 350));
    const normalizedEmail = email.trim().toLowerCase();
    const account = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);

    return {
      success: true,
      emailExists: !!account,
    };
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    if (newRole === 'admin') {
      const adminAcc = accounts.find((a) => a.role === 'admin') || DEFAULT_ACCOUNTS[2];
      const { passwordHash, ...profile } = adminAcc;
      setUser(profile);
    } else {
      const studentAcc = accounts.find((a) => a.role === 'student') || DEFAULT_ACCOUNTS[0];
      const { passwordHash, ...profile } = studentAcc;
      setUser(profile);
    }
  };

  const updateUserPreferences = (prefs: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...prefs } : null));
    setAccounts((prev) =>
      prev.map((a) => (a.id === user?.id ? { ...a, ...prefs } : a))
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'student',
        isAuthenticated: !!user,
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
