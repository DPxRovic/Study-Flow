/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { PlannerProvider } from './context/PlannerContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Route Guards
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { GuestRoute } from './components/auth/GuestRoute';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';

// Student Pages
import { DashboardPage } from './pages/student/DashboardPage';
import { TasksPage } from './pages/student/TasksPage';
import { SubjectsPage } from './pages/student/SubjectsPage';
import { AvailabilityPage } from './pages/student/AvailabilityPage';
import { SchedulePage } from './pages/student/SchedulePage';
import { CalendarPage } from './pages/student/CalendarPage';
import { ProgressPage } from './pages/student/ProgressPage';
import { NotificationsPage } from './pages/student/NotificationsPage';
import { SettingsPage } from './pages/student/SettingsPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { CurriculumPage } from './pages/admin/CurriculumPage';
import { AnnouncementsPage } from './pages/admin/AnnouncementsPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="StudyFlow Application Error">
      <ToastProvider>
        <AuthProvider>
          <PlannerProvider>
            <BrowserRouter>
              <Routes>
                {/* 1. Public Marketing Website */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<LandingPage />} />
                </Route>

                {/* 2. Guest-Only Authentication Routes */}
                <Route element={<GuestRoute><AuthLayout /></GuestRoute>}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                </Route>

                {/* 3. Authenticated Student Workspace */}
                <Route
                  element={
                    <ProtectedRoute>
                      <StudentLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/subjects" element={<SubjectsPage />} />
                  <Route path="/availability" element={<AvailabilityPage />} />
                  <Route path="/schedule" element={<SchedulePage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/progress" element={<ProgressPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* 4. Authenticated Admin Operations (Restricted to Admin Role) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="subjects" element={<CurriculumPage />} />
                  <Route path="announcements" element={<AnnouncementsPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="audit" element={<AuditLogsPage />} />
                  <Route path="audit-logs" element={<AuditLogsPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>

                {/* 5. Fallback Wildcard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </PlannerProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
