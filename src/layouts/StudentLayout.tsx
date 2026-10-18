/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Clock,
  CalendarRange,
  Calendar,
  TrendingUp,
  Bell,
  Settings,
  Plus,
  Menu,
  X,
  LogOut,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { usePlanner } from '../context/PlannerContext';

export function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, switchRole } = useAuth();
  const { tasks, subjects, addTask, announcements, unreadNotificationsCount } = usePlanner();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Quick Add Form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState(subjects[0]?.id || '');
  const [taskDueDate, setTaskDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [taskHours, setTaskHours] = useState('2.5');
  const [taskPriority, setTaskPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('high');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    addTask({
      title: taskTitle.trim(),
      subjectId: taskSubject || subjects[0]?.id || 'sub_cs201',
      dueDate: `${taskDueDate}T23:59:00`,
      estimatedHours: parseFloat(taskHours) || 2.0,
      remainingHours: parseFloat(taskHours) || 2.0,
      type: 'assignment',
      priority: taskPriority,
      status: 'scheduled',
    });

    setTaskTitle('');
    setIsQuickAddOpen(false);
  };

  // Canonical navigation structure grouped logically per Prompt 4 & PRODUCT.md
  const activeTasksCount = tasks.filter((t) => t.status !== 'completed').length;
  const unreadAlertsCount = unreadNotificationsCount;

  const navGroups = [
    {
      group: 'Academic',
      items: [
        {
          to: '/dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
          badge: 'Today',
        },
        {
          to: '/tasks',
          label: 'Tasks & Deadlines',
          icon: <CheckSquare className="w-4 h-4 shrink-0" />,
          badge: `${activeTasksCount}`,
        },
        {
          to: '/subjects',
          label: 'Enrolled Courses',
          icon: <BookOpen className="w-4 h-4 shrink-0" />,
          badge: `${subjects.length}`,
        },
        {
          to: '/schedule',
          label: 'Study Schedule',
          icon: <CalendarRange className="w-4 h-4 shrink-0" />,
        },
        {
          to: '/calendar',
          label: 'Calendar Grid',
          icon: <Calendar className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      group: 'Planning',
      items: [
        {
          to: '/availability',
          label: 'Weekly Availability',
          icon: <Clock className="w-4 h-4 shrink-0" />,
        },
        {
          to: '/progress',
          label: 'Study Pacing',
          icon: <TrendingUp className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      group: 'Account',
      items: [
        {
          to: '/notifications',
          label: 'Academic Alerts',
          icon: <Bell className="w-4 h-4 shrink-0" />,
          badge: unreadAlertsCount > 0 ? `${unreadAlertsCount}` : undefined,
        },
        {
          to: '/settings',
          label: 'Preferences',
          icon: <Settings className="w-4 h-4 shrink-0" />,
        },
      ],
    },
  ];

  // Mobile bottom bar core items (top 4 student destinations)
  const mobileBottomItems = [
    { to: '/dashboard', label: 'Today', icon: <LayoutDashboard className="w-5 h-5" /> },
    { to: '/tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5" />, badge: activeTasksCount },
    { to: '/schedule', label: 'Schedule', icon: <CalendarRange className="w-5 h-5" /> },
    { to: '/calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
  ];

  // Format breadcrumb text
  const currentPathSegment = location.pathname.split('/')[1] || 'dashboard';
  const pageTitles: Record<string, string> = {
    dashboard: 'Academic Dashboard',
    tasks: 'Tasks & Deliverables',
    subjects: 'Enrolled Courses',
    schedule: 'Study Schedule',
    calendar: 'Academic Calendar',
    availability: 'Weekly Availability',
    progress: 'Study Pacing & Progress',
    notifications: 'Academic Alerts',
    settings: 'Settings & Preferences',
  };

  const currentPageTitle = pageTitles[currentPathSegment] || 'Workspace';

  return (
    <div className="min-h-screen bg-academic-canvas text-slate-900 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* =========================================================================
          TOP BAR (Authoritative Collegiate Brand & Tactical Header)
         ========================================================================= */}
      <header className="h-16 surface-base border-t-0 border-x-0 border-b border-slate-200/90 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between bg-white/95 backdrop-blur-md">
        {/* Left: Brand Lockup & Academic Term Indicator */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 text-slate-600 hover:text-slate-900 cursor-pointer rounded-xl hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Toggle navigation drawer"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link
            to="/dashboard"
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2.5 hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-lg p-0.5"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold bg-gradient-to-r from-sky-700 to-cyan-600 bg-clip-text text-transparent leading-none">
                StudyFlow
              </span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5 hidden xs:inline">
                Academic Atelier
              </span>
            </div>
          </Link>

          <span className="hidden lg:inline-block text-slate-300 mx-1" aria-hidden="true">|</span>

          {/* Academic Term Tag */}
          <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-850 border border-sky-200/90 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse" />
            <span>{user?.term || 'Fall 2026'} · Week 7</span>
          </div>
        </div>

        {/* Center: Contextual Breadcrumb */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium">
          <span className="text-slate-400">Student Workspace</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="font-bold text-slate-900 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/60">
            {currentPageTitle}
          </span>
        </div>

        {/* Right: Actions, Notification Alert, and User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Add Task Button */}
          <Button
            variant="primary"
            onClick={() => setIsQuickAddOpen(true)}
            icon={<Plus className="w-4 h-4" />}
            className="text-xs font-bold"
          >
            <span className="hidden xs:inline">New Task</span>
            <span className="xs:hidden">Add</span>
          </Button>

          {/* Academic Alerts Bell Button */}
          <Link
            to="/notifications"
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label={`Academic alerts: ${unreadAlertsCount} unread`}
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-600 ring-2 ring-white" />
            )}
          </Link>

          {/* User Profile & Workspace Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl border border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 shadow-2xs"
              aria-label="User account menu"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-600 to-sky-800 text-white flex items-center justify-center font-extrabold text-[11px] shadow-2xs">
                {user?.name ? user.name.split(' ').map((n) => n[0]).join('') : 'ML'}
              </div>
              <span className="hidden sm:inline-block text-xs font-bold text-slate-800 max-w-[100px] truncate">
                {user?.name?.split(' ')[0] || 'Maya'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Elevated Popover Menu */}
            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 surface-elevated rounded-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 focus:outline-none"
                role="menu"
                aria-orientation="vertical"
              >
                {/* User Details Header */}
                <div className="p-3 surface-inset rounded-xl border border-slate-200/80 mb-2 space-y-1">
                  <div className="text-xs font-extrabold text-slate-900 truncate">
                    {user?.name || 'Maya Lin'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    {user?.email || 'm.lin@university.edu'}
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[10px] font-semibold text-slate-600 border-t border-slate-200/60 mt-1.5">
                    <span>{user?.major || 'Computer Science'}</span>
                    <span className="text-sky-700 font-bold font-mono">
                      Cap: {user?.targetDailyStudyCapHours || 5.5}h/day
                    </span>
                  </div>
                </div>

                {/* Workspace Navigation Links */}
                <div className="space-y-0.5">
                  <Link
                    to="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    role="menuitem"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Study Preferences & Cap</span>
                  </Link>

                  <Link
                    to="/notifications"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2.5">
                      <Bell className="w-4 h-4 text-slate-400" />
                      <span>Academic Alerts</span>
                    </div>
                    {unreadAlertsCount > 0 && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded">
                        {unreadAlertsCount}
                      </span>
                    )}
                  </Link>

                  {/* Role Switcher Option */}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      switchRole('admin');
                      navigate('/admin');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-left"
                    role="menuitem"
                  >
                    <Shield className="w-4 h-4 text-amber-500" />
                    <div className="flex-1">
                      <span>Switch to Admin Console</span>
                    </div>
                  </button>
                </div>

                {/* Divider */}
                <div className="my-1.5 border-t border-slate-100" />

                {/* Sign Out Button */}
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-left"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* =========================================================================
            SIDEBAR NAVIGATION (Grounded with Structural Depth)
            Cleanly organized into ACADEMIC, PLANNING, and ACCOUNT
           ========================================================================= */}
        <aside
          aria-label="Student primary navigation"
          className="w-64 shrink-0 surface-base border-r border-slate-200/90 border-t-0 border-b-0 border-l-0 p-4 hidden sm:flex flex-col justify-between bg-white/95 backdrop-blur-xs select-none"
        >
          <div className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.group} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
                  {group.group}
                </div>
                <nav className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `w-full flex items-center justify-between py-2 pr-3 text-xs rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                          isActive
                            ? 'border-l-3 border-sky-600 bg-gradient-to-r from-sky-50 to-sky-100/50 text-sky-950 font-bold pl-2.5 shadow-2xs border border-sky-200/70'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium pl-3'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-2.5">
                            <span className={isActive ? 'text-sky-600' : 'text-slate-400'}>
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[10px] tabular-nums font-mono px-1.5 py-0.5 rounded font-bold ${
                                isActive
                                  ? 'bg-sky-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          {/* Student Profile Card (Tactile Collegiate Card) */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="p-3 rounded-2xl surface-inset border border-slate-200/90 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-600 to-sky-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {user?.name ? user.name.split(' ').map((n) => n[0]).join('') : 'ML'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {user?.name || 'Maya Lin'}
                </div>
                <div className="text-[11px] text-slate-500 font-medium truncate">
                  {user?.major || 'Computer Science'}
                </div>
                <div className="text-[10px] font-mono text-sky-700 font-bold pt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Cap: {user?.targetDailyStudyCapHours || 5.5}h / day</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 transition-colors cursor-pointer font-medium rounded-lg hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/40 sm:hidden backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-72 bg-white h-full p-4 flex flex-col justify-between shadow-xl animate-in slide-in-from-left duration-200">
              <div className="space-y-5 overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-sm text-slate-900">StudyFlow</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation drawer"
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Term tag */}
                <div className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200/80 text-[11px] font-bold text-sky-850 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse" />
                  <span>{user?.term || 'Fall 2026'} · Week 7</span>
                </div>

                <div className="space-y-4">
                  {navGroups.map((group) => (
                    <div key={group.group} className="space-y-1">
                      <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {group.group}
                      </div>
                      <nav className="space-y-0.5">
                        {group.items.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              `w-full flex items-center justify-between py-2 px-3 text-xs rounded-xl transition-all ${
                                isActive
                                  ? 'border-l-3 border-sky-600 bg-sky-50 text-sky-950 font-bold'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                              }`
                            }
                          >
                            <div className="flex items-center gap-2.5">
                              {item.icon}
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-600">
                                {item.badge}
                              </span>
                            )}
                          </NavLink>
                        ))}
                      </nav>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Profile & Logout */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="p-2.5 rounded-xl surface-inset border border-slate-200/80">
                  <div className="text-xs font-bold text-slate-900">{user?.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">{user?.email}</div>
                  <div className="text-[10px] text-sky-700 font-bold font-mono pt-0.5">
                    Cap: {user?.targetDailyStudyCapHours || 5.5}h / day
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    switchRole('admin');
                    navigate('/admin');
                  }}
                  className="w-full flex items-center gap-2 py-1.5 px-2 text-xs text-amber-700 font-semibold cursor-pointer rounded-lg hover:bg-amber-50"
                >
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span>Switch to Admin Console</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2 py-2 px-2 text-xs text-rose-600 font-bold cursor-pointer rounded-lg hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Primary Page Outlet Container (with extra bottom padding on mobile for bottom bar) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 sm:pb-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* =========================================================================
          MOBILE STICKY BOTTOM NAVIGATION BAR
          Fast 1-thumb switching for mobile users
         ========================================================================= */}
      <nav
        aria-label="Mobile quick navigation"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-30 surface-base bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 flex items-center justify-around"
      >
        {mobileBottomItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors relative min-w-[56px] ${
                isActive
                  ? 'text-sky-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-mono font-bold bg-sky-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
              {isActive && (
                <span className="w-4 h-0.5 bg-sky-600 rounded-full mt-0.5" />
              )}
            </Link>
          );
        })}

        {/* Drawer Toggle */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-500 hover:text-slate-800 transition-colors min-w-[56px]"
          aria-label="Open full menu"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">More</span>
        </button>
      </nav>

      {/* =========================================================================
          QUICK ADD TASK MODAL
         ========================================================================= */}
      <Modal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        title="Add Course Assignment"
        description="Schedule a homework deliverable, lab report, or exam milestone."
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Assignment Title"
            placeholder="e.g. Problem Set 5: Graph Traversals"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Course Subject
              </label>
              <select
                value={taskSubject}
                onChange={(e) => setTaskSubject(e.target.value)}
                className="w-full surface-inset rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 font-medium"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} – {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                required
                className="w-full surface-inset rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Estimated Study Hours"
              type="number"
              step="0.5"
              min="0.5"
              max="20"
              value={taskHours}
              onChange={(e) => setTaskHours(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Urgency & Priority
              </label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as any)}
                className="w-full surface-inset rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 font-medium"
              >
                <option value="urgent">Urgent (Due in ≤ 48h)</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsQuickAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add to Study Queue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
