/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Megaphone,
  BarChart3,
  Settings,
  ShieldCheck,
  History,
  ArrowLeft,
  Menu,
  X,
  LogOut,
  ShieldAlert,
  GraduationCap,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlanner } from '../context/PlannerContext';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, switchRole, logout } = useAuth();
  const { announcements } = usePlanner();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publishedCount = announcements.filter((a) => (a.status || 'published') === 'published').length;

  const adminNavLinks = [
    { to: '/admin', end: true, label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/admin/users', label: 'Users & Cohorts', icon: <Users className="w-4 h-4" />, badge: '1,248' },
    { to: '/admin/subjects', label: 'Master Curriculum', icon: <BookOpen className="w-4 h-4" /> },
    { to: '/admin/announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" />, badge: String(publishedCount) },
    { to: '/admin/analytics', label: 'Cohort Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { to: '/admin/audit', label: 'Security & Audit Logs', icon: <ShieldCheck className="w-4 h-4" /> },
    { to: '/admin/settings', label: 'Institutional Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-academic-canvas text-slate-900 flex flex-col font-sans">
      {/* Admin Top Bar */}
      <header className="h-14 surface-base border-t-0 border-x-0 border-b border-slate-200/90 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer rounded-lg hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <NavLink
            to="/admin"
            className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-900">StudyFlow</span>
          </NavLink>

          <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200/90 px-2.5 py-0.5 rounded-md font-bold shadow-2xs">
            Admin Console
          </span>
        </div>

        {/* Current Path */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <span className="text-slate-400">Institutional Affairs</span>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="font-bold text-slate-900">
            {location.pathname.includes('audit')
              ? 'Security & Audit Logs'
              : location.pathname.includes('users')
              ? 'Users & Cohorts'
              : location.pathname.includes('subjects')
              ? 'Master Curriculum'
              : location.pathname.includes('announcements')
              ? 'Announcements'
              : location.pathname.includes('analytics')
              ? 'Cohort Analytics'
              : location.pathname.includes('settings')
              ? 'Institutional Settings'
              : 'Overview'}
          </span>
        </div>

        {/* Switch back to Student View Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              switchRole('student');
              navigate('/dashboard');
            }}
            className="btn-tactile-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-800 rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Student View</span>
          </button>
        </div>
      </header>

      {/* Admin Layout Grid */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <aside className="w-60 shrink-0 surface-base border-r border-slate-200/90 border-t-0 border-b-0 border-l-0 p-3.5 hidden sm:flex flex-col justify-between bg-white/95">
          <div className="space-y-4">
            <div className="px-2.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Operations & Oversight
            </div>
            <nav className="space-y-1">
              {adminNavLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `w-full flex items-center justify-between py-2 pr-3 text-xs rounded-lg transition-all ${
                      isActive
                        ? 'border-l-3 border-amber-600 bg-amber-50 text-amber-950 font-bold pl-2.5 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium pl-3'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-400">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] tabular-nums font-mono px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.name || 'Dr. Elena Vance'}
              </div>
              <div className="text-[10px] text-amber-800 font-semibold truncate">
                Department Dean
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/40 sm:hidden">
            <div className="w-64 bg-white h-full p-4 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-extrabold text-sm text-slate-900">Admin Operations</span>
                  <button onClick={() => setMobileMenuOpen(false)}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <nav className="space-y-1 mt-3">
                  {adminNavLinks.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                          isActive
                            ? 'bg-amber-50 text-amber-800 font-bold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    switchRole('student');
                    setMobileMenuOpen(false);
                    navigate('/dashboard');
                  }}
                  className="w-full py-2 text-xs text-sky-700 font-bold border border-sky-200 bg-sky-50 rounded-lg flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Student View</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Content Viewport */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
