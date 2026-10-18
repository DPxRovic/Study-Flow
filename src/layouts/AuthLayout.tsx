/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  ArrowLeft,
  Check,
  Clock,
  Calendar,
  BookOpen,
  ShieldCheck,
  Layers,
} from 'lucide-react';

export function AuthLayout() {
  const location = useLocation();
  const isRegister = location.pathname.startsWith('/register');
  const isForgotPassword = location.pathname.startsWith('/forgot-password');

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col lg:flex-row font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* =========================================================================
          LEFT / VISUAL AREA (Desktop Split View)
          Academic Blue/Cyan Environment with Real StudyFlow Schedule Motifs
         ========================================================================= */}
      <aside className="hidden lg:flex lg:w-[46%] xl:w-[44%] 2xl:w-[42%] bg-gradient-to-br from-sky-700 via-sky-800 to-slate-950 text-white flex-col justify-between p-10 xl:p-14 relative overflow-hidden shrink-0 select-none">
        {/* Subtle geometric academic background arcs */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full border border-sky-400/15 pointer-events-none" />
        <div className="absolute -top-12 -left-12 w-[440px] h-[440px] rounded-full border border-cyan-400/10 pointer-events-none" />
        <div className="absolute -bottom-36 -right-36 w-[520px] h-[520px] rounded-full border border-sky-300/10 pointer-events-none" />

        {/* Top: StudyFlow Brand Header */}
        <div className="relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 group transition-opacity hover:opacity-95"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-sky-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-cyan-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>StudyFlow</span>
              </div>
              <div className="text-[10px] text-sky-200/90 font-semibold tracking-wide uppercase">
                Collegiate Academic Planner
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Dynamic Collegiate Narrative & Real Feature Preview */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-lg">
          {/* Flow-Specific Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-cyan-200 border border-white/15 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              {isRegister
                ? 'New Student Account · Fall 2026'
                : isForgotPassword
                ? 'Account Security · Student Recovery'
                : 'Academic Workspace · Welcome Back'}
            </span>
          </div>

          {/* Flow Headline */}
          <h1 className="text-2xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight text-balance">
            {isRegister
              ? 'Set up your semester for calm consistency.'
              : isForgotPassword
              ? 'Keep your semester schedule on track.'
              : 'Make your workload fit your week.'}
          </h1>

          {/* Supporting Copy */}
          <p className="text-sm xl:text-base text-sky-100/90 leading-relaxed font-medium">
            {isRegister
              ? 'StudyFlow connects enrolled courses, assignment deadlines, and your weekly free hours to build a realistic study plan that protects your sleep.'
              : isForgotPassword
              ? 'Verify your registered university email to restore uninterrupted access to your study schedule and upcoming deadlines.'
              : 'Your courses, fatigue caps, and daily study blocks are right where you left them. Zero panic, zero late-night cramming.'}
          </p>

          {/* Authentic Real StudyFlow Planner Feature Preview (Tailored to Route) */}
          {isRegister ? (
            /* Register Preview: 3-Step Setup Card */
            <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs space-y-3 shadow-lg">
              <div className="text-xs font-bold text-cyan-200 flex items-center justify-between">
                <span>Deterministic Scheduler Pipeline</span>
                <span className="text-[10px] font-mono text-sky-200">100% Automated</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-black/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-300" />
                    <span className="text-slate-200 font-semibold">1. Input Syllabi & Deadlines</span>
                  </div>
                  <span className="text-[10px] text-cyan-300 font-bold">5 Courses</span>
                </div>
                <div className="p-2 rounded-lg bg-black/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-sky-300" />
                    <span className="text-slate-200 font-semibold">2. Block Lectures & Jobs</span>
                  </div>
                  <span className="text-[10px] text-sky-300 font-bold">Free Time Found</span>
                </div>
                <div className="p-2 rounded-lg bg-black/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-slate-200 font-semibold">3. Spaced Study Sessions</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-bold">Anti-Cram Ready</span>
                </div>
              </div>
            </div>
          ) : isForgotPassword ? (
            /* Forgot Password Preview: Security & Data Continuity Card */
            <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs space-y-3 shadow-lg">
              <div className="text-xs font-bold text-cyan-200 flex items-center justify-between">
                <span>Timetable Data Preserved</span>
                <span className="text-[10px] font-mono text-emerald-300">Protected</span>
              </div>
              <p className="text-xs text-sky-100 leading-relaxed font-medium">
                Your subject syllabi, target study caps, and generated sessions remain fully stored and ready upon authentication.
              </p>
              <div className="p-2.5 rounded-lg bg-black/20 text-[11px] text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>Encrypted session tokens & campus authentication compatibility.</span>
              </div>
            </div>
          ) : (
            /* Login Preview: Today's Authentic Schedule Snapshot */
            <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs space-y-3 shadow-lg">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-white/10">
                <span className="font-bold text-cyan-200">Today's Study Session Queue</span>
                <span className="text-[10px] font-mono text-sky-200 font-semibold">Maya Lin · Week 7</span>
              </div>

              {/* Session 1 */}
              <div className="p-2.5 rounded-xl bg-black/25 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wide">
                    CS 201 · Data Structures
                  </div>
                  <div className="text-slate-100 font-semibold text-[11px]">
                    PS4: Red-Black Trees & AVL
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-sky-200 font-bold">14:00 - 15:30</div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-200 font-bold">
                    90 min
                  </span>
                </div>
              </div>

              {/* Session 2 */}
              <div className="p-2.5 rounded-xl bg-black/25 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">
                    BIO 110 · Genetics Lab
                  </div>
                  <div className="text-slate-100 font-semibold text-[11px]">
                    Lab Report Data Analysis
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-emerald-200 font-bold">16:30 - 17:30</div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-bold">
                    60 min
                  </span>
                </div>
              </div>

              {/* Fatigue Limit Meter */}
              <div className="pt-1 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-300 font-medium">Daily Study Cap: 4.0h / 5.5h</span>
                  <span className="text-cyan-300 font-bold">Healthy Workload</span>
                </div>
                <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
                  <div className="w-[73%] h-full bg-gradient-to-r from-sky-400 to-cyan-300 rounded-full" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom: 3 Unboxed Academic Value Pillars */}
        <div className="relative z-10 pt-4 border-t border-white/10 space-y-2">
          <div className="grid grid-cols-1 gap-1.5 text-xs text-sky-100/90 font-medium">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 stroke-[2.5]" />
              <span>Anti-cram interval spreading before major assignment deadlines</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 stroke-[2.5]" />
              <span>Daily study fatigue limits and protected sleep boundaries</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 stroke-[2.5]" />
              <span>Deterministic knapsack scheduler with transparent hours</span>
            </div>
          </div>
          <div className="text-[10px] text-sky-300/70 pt-1">
            StudyFlow Academic System · Undergraduate & Graduate Support
          </div>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT / FORM AREA (Interactive Form Environment)
          Enclosed in tactile surface-base atelier card with academic canvas backdrop
         ========================================================================= */}
      <main className="w-full lg:w-[54%] xl:w-[56%] 2xl:w-[58%] bg-academic-canvas flex flex-col justify-between p-4 sm:p-6 lg:p-10 xl:p-12 min-h-screen overflow-y-auto">
        {/* Top Header Row */}
        <div className="flex items-center justify-between pb-3 sm:pb-0">
          {/* Mobile-only brand identifier */}
          <Link
            to="/"
            className="lg:hidden flex items-center gap-2 text-slate-900 hover:opacity-90 transition-opacity"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base bg-gradient-to-r from-sky-700 to-cyan-600 bg-clip-text text-transparent">
              StudyFlow
            </span>
          </Link>

          {/* Back to overview link */}
          <Link
            to="/"
            className="text-xs font-bold text-slate-500 hover:text-sky-700 transition-colors flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg hover:bg-slate-200/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to overview</span>
          </Link>
        </div>

        {/* Compact Mobile Academic Context Banner (Visible on mobile/tablet only) */}
        <div className="lg:hidden my-3 p-3.5 rounded-2xl bg-gradient-to-r from-sky-700 to-cyan-700 text-white shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-200">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>StudyFlow Academic Workspace · Fall 2026</span>
          </div>
          <p className="text-xs font-semibold text-white">
            {isRegister
              ? 'Set up your semester · Balanced study planning'
              : isForgotPassword
              ? 'Account recovery · Reset university password'
              : 'Make your workload fit your week · Sign in'}
          </p>
        </div>

        {/* Central Atelier Form Card */}
        <div className="max-w-lg w-full mx-auto my-auto py-4">
          <div className="surface-base bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-9 space-y-6">
            {/* Quick Flow Switcher Tabs (Shown for login & register) */}
            {!isForgotPassword && (
              <div className="flex p-1 rounded-xl bg-slate-100 surface-inset border border-slate-200/80">
                <Link
                  to="/login"
                  className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                    !isRegister
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                    isRegister
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </Link>
              </div>
            )}

            {/* Rendered Flow Outlet */}
            <Outlet />
          </div>
        </div>

        {/* Bottom Collegiate Note */}
        <div className="pt-4 text-center text-xs text-slate-400 font-medium">
          StudyFlow · Calm, realistic study planning for collegiate academics.
        </div>
      </main>
    </div>
  );
}
