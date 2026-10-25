/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarRange,
  Clock,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  GraduationCap,
  Check,
  Calendar,
  Layers,
  Zap,
  Sliders,
  Flame,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [demoSessionDone, setDemoSessionDone] = useState(false);

  // Interactive Workload Simulator State
  const [creditLoad, setCreditLoad] = useState<12 | 16 | 20>(16);
  const [dailyCap, setDailyCap] = useState<number>(5.5);

  const calculatedWeeklyHours = Math.round(creditLoad * 1.5);
  const calculatedDaysNeeded = Math.ceil(calculatedWeeklyHours / dailyCap);
  const calculatedPacingState =
    calculatedDaysNeeded > 6
      ? { label: 'High Fatigue Risk', color: 'text-rose-600 bg-rose-50 border-rose-200' }
      : calculatedDaysNeeded > 4
      ? { label: 'Optimal Spacing', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
      : { label: 'Light Academic Load', color: 'text-sky-700 bg-sky-50 border-sky-200' };

  return (
    <div className="space-y-24 py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* =========================================================================
          1. HERO SECTION: HIGH-CHARACTER EDITORIAL ATELIER
         ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center pt-4 sm:pt-10">
        {/* Left Column (7/12): Clear, Authoritative Collegiate Narrative */}
        <div className="lg:col-span-7 space-y-7 text-left">
          {/* Atelier Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white surface-card border border-sky-200/90 text-sky-800 shadow-xs">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-600" />
            </span>
            <GraduationCap className="w-4 h-4 text-sky-600" />
            <span className="tracking-wide">Collegiate Academic Atelier · Fall 2026 Term</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] text-balance">
            Turn syllabus chaos into a{' '}
            <span className="bg-gradient-to-r from-sky-600 via-sky-700 to-cyan-600 bg-clip-text text-transparent">
              realistic study rhythm
            </span>{' '}
            you can actually keep.
          </h1>

          {/* Core Philosophy Copy */}
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium max-w-2xl">
            StudyFlow connects what’s due on your course syllabi with when you’re actually free between classes. We calculate fatigue limits, spread out 8-hour projects across multiple days, and protect against late-night panic cramming.
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3.5">
            {isAuthenticated ? (
              <Button
                size="lg"
                variant="primary"
                onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {user?.role === 'admin' ? 'Open Admin Console' : 'Go to Study Workspace'}
              </Button>
            ) : (
              <>
                <Link
                  to="/register"
                  className="btn-tactile-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/login"
                  className="btn-tactile-secondary inline-flex items-center gap-1.5 px-5 py-3 text-sm font-bold text-slate-700 rounded-xl"
                >
                  <span>Student Sign In</span>
                </Link>
              </>
            )}

          </div>

          {/* 3 Physical Atelier Feature Anchors */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200/90">
            <div className="surface-card p-3.5 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Clock className="w-4 h-4 text-sky-600" />
                <span>Anti-Cram Spreading</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-normal">
                Breaks 6h–10h deliverables into manageable 90-min sessions days prior to deadlines.
              </p>
            </div>

            <div className="surface-card p-3.5 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Daily Fatigue Caps</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-normal">
                Enforces maximum study hours (e.g. 5.5h/day) to safeguard healthy sleep boundaries.
              </p>
            </div>

            <div className="surface-card p-3.5 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Deterministic Knapsack</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-normal">
                100% reproducible scheduler without random AI hallucinations or broken slots.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (5/12): Physical Atelier Student Planner Preview */}
        <div className="lg:col-span-5">
          <div className="relative rounded-3xl surface-base border border-slate-200/90 shadow-2xl p-5 sm:p-6 space-y-4">
            {/* Top Atelier Bar */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  ML
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Maya Lin</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-bold">
                      Student
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium font-mono">
                    CS & CogSci · 16 Credits
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold">
                <Calendar className="w-3 h-3 text-sky-600" />
                <span>Week 7 of 15</span>
              </div>
            </div>

            {/* Daily Hours Commitment Gauge with Recessed Inset Well */}
            <div className="surface-inset p-3.5 rounded-2xl border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Today's Pacing Target</span>
                <span className="font-mono tabular-nums font-bold text-sky-700">
                  {demoSessionDone ? '4.0h / 5.5h (73%)' : '2.5h / 5.5h (45%)'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 via-sky-600 to-cyan-500 rounded-full transition-all duration-500 shadow-2xs"
                  style={{ width: demoSessionDone ? '73%' : '45%' }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>Morning Lectures: 3.0h completed</span>
                <span className="text-emerald-700 font-bold">Within Fatigue Limit</span>
              </div>
            </div>

            {/* HERO SPOTLIGHT: "NEXT UP TODAY" HERO TILE */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-700 via-sky-800 to-slate-900 text-white space-y-3 shadow-lg shadow-sky-900/15 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center justify-between text-xs relative z-10">
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-white/20 text-cyan-200 text-[10px] backdrop-blur-xs">
                  Next Study Block · 14:00 – 15:30
                </span>
                <span className="font-mono text-cyan-200 text-xs font-bold">90 mins</span>
              </div>

              <div className="relative z-10 space-y-0.5">
                <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                  CS 201 · Data Structures
                </div>
                <h2 className="text-sm font-bold text-white leading-snug">
                  Problem Set 4: AVL Rotations & Red-Black Invariants
                </h2>
              </div>

              <div className="pt-1 flex items-center justify-between relative z-10">
                <span className="text-[11px] text-sky-200 font-medium">Due Thursday at 23:59</span>
                <button
                  type="button"
                  onClick={() => setDemoSessionDone(!demoSessionDone)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    demoSessionDone
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-white text-sky-900 hover:bg-sky-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{demoSessionDone ? 'Completed' : 'Mark Done'}</span>
                </button>
              </div>
            </div>

            {/* Mini Study Queue with Binder Spines */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <span>Upcoming Study Blocks</span>
                <span className="font-mono text-slate-500">2 remaining</span>
              </div>

              {/* Block 1 */}
              <div className="surface-card p-3 rounded-xl border border-slate-200/80 border-l-4 border-l-blue-600 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">MATH 241 · Multivariable Calc</div>
                  <div className="text-[11px] text-slate-500 font-medium">Exam Prep: Vector Fields & Green’s Thm</div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <div className="font-bold text-slate-800">16:00 – 17:30</div>
                  <span className="text-[10px] text-sky-700 font-semibold">90 min</span>
                </div>
              </div>

              {/* Block 2 */}
              <div className="surface-card p-3 rounded-xl border border-slate-200/80 border-l-4 border-l-emerald-500 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">BIO 110 · Cellular Genetics</div>
                  <div className="text-[11px] text-slate-500 font-medium">Lab Notebook Synthesis ·Franklin 202</div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <div className="font-bold text-slate-800">18:30 – 19:30</div>
                  <span className="text-[10px] text-emerald-700 font-semibold">60 min</span>
                </div>
              </div>
            </div>

            {/* 1-Click Launch Button at the bottom of the card */}
            <Link
              to="/register"
              className="w-full py-2.5 text-center text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Build Your Course Schedule Like Maya’s</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. INTERACTIVE WORKLOAD PACING SIMULATOR
          Engaging, tactile demonstration of the deterministic scheduling engine
         ========================================================================= */}
      <section id="scheduling-engine" className="surface-base rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-lg space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5" />
              <span>Interactive Pacing Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Test how StudyFlow balances your week
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              See how our algorithm distributes weekly required study hours within your personal daily fatigue limits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${calculatedPacingState.color}`}>
              {calculatedPacingState.label}
            </span>
          </div>
        </div>

        {/* Simulator Controls & Real-Time Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Controls (6/12) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Control 1: Enrolled Credits */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Enrolled Credit Load</span>
                <span className="font-mono font-bold text-sky-800">{creditLoad} Semester Credits</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { credits: 12, label: '12 Credits (Light)' },
                  { credits: 16, label: '16 Credits (Standard)' },
                  { credits: 20, label: '20 Credits (Intensive)' },
                ].map((item) => (
                  <button
                    key={item.credits}
                    type="button"
                    onClick={() => setCreditLoad(item.credits as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      creditLoad === item.credits
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 2: Maximum Daily Study Cap */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Daily Study Fatigue Limit</span>
                <span className="font-mono font-bold text-sky-800">{dailyCap}h / day max</span>
              </div>
              <input
                type="range"
                min="3.0"
                max="8.0"
                step="0.5"
                value={dailyCap}
                onChange={(e) => setDailyCap(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>3.0h (Gentle)</span>
                <span>5.5h (Recommended)</span>
                <span>8.0h (Max Burnout Cap)</span>
              </div>
            </div>
          </div>

          {/* Engine Output Dashboard (6/12) */}
          <div className="lg:col-span-6 surface-inset p-6 rounded-2xl border border-slate-200/90 space-y-4">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Deterministic Output Projection
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="surface-card p-3.5 rounded-xl border border-slate-200/80 text-center space-y-0.5">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Study Hours/Wk</div>
                <div className="text-xl font-extrabold text-slate-900 font-mono">{calculatedWeeklyHours}h</div>
                <div className="text-[10px] text-slate-400 font-medium">catalog standard</div>
              </div>

              <div className="surface-card p-3.5 rounded-xl border border-slate-200/80 text-center space-y-0.5">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Study Days Needed</div>
                <div className="text-xl font-extrabold text-sky-800 font-mono">{calculatedDaysNeeded} days</div>
                <div className="text-[10px] text-slate-400 font-medium">at {dailyCap}h/day cap</div>
              </div>

              <div className="surface-card p-3.5 rounded-xl border border-slate-200/80 text-center space-y-0.5">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Rest Days Left</div>
                <div className="text-xl font-extrabold text-emerald-700 font-mono">
                  {Math.max(0, 7 - calculatedDaysNeeded)} days
                </div>
                <div className="text-[10px] text-slate-400 font-medium">guaranteed off</div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              StudyFlow strictly schedules your {calculatedWeeklyHours} weekly hours across{' '}
              <span className="font-bold text-slate-900">{calculatedDaysNeeded} active days</span> without exceeding your {dailyCap}h daily ceiling. Rest time is preserved so you stay refreshed for classes.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. TRADITIONAL CHAOTIC TO-DO VS STUDYFLOW METHOD
         ========================================================================= */}
      <section id="anti-cram" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-sky-700 uppercase tracking-wider">
            Architectural Philosophy
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Why ordinary to-do apps fail college students
          </h2>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            Students don’t fall behind because they lack ambition. They fall behind because generic tools separate assignments from available hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Left: The Broken Syllabus Trap */}
          <div className="p-7 rounded-3xl surface-base border border-rose-200/90 shadow-sm space-y-5 bg-gradient-to-br from-rose-50/40 to-white">
            <div className="flex items-center gap-2.5 text-rose-800 font-bold text-base">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span>The Unbounded Syllabus Trap</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Standard task apps display an endless column of 20+ bullet items completely unanchored to your calendar:
            </p>

            <ul className="space-y-3.5 text-xs text-slate-700 leading-relaxed font-medium">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                  ✕
                </span>
                <span>You see "Write 10-page History paper due Friday" but have zero scheduled slots to start researching on Monday.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                  ✕
                </span>
                <span>No protection against scheduling 11 hours of work on a Thursday when you already have 4 hours of lab sessions.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                  ✕
                </span>
                <span>Result: Exhausting all-night cramming sessions, caffeine crashes, and perpetual panic.</span>
              </li>
            </ul>
          </div>

          {/* Right: The StudyFlow Method */}
          <div className="p-7 rounded-3xl surface-base border border-sky-300 shadow-md space-y-5 bg-gradient-to-br from-sky-50/50 to-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-sky-200/30 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2.5 text-sky-900 font-bold text-base relative z-10">
              <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span>The StudyFlow Spaced Scheduling Method</span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium relative z-10">
              We translate syllabi into realistic daily commitments matched to your true free time:
            </p>

            <ul className="space-y-3.5 text-xs text-slate-700 leading-relaxed font-medium relative z-10">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs shrink-0">
                  ✓
                </span>
                <span><strong className="text-slate-900">Anti-Cram Interval Spreading:</strong> Long papers and exam prep are automatically broken into 90-minute blocks spaced across days.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs shrink-0">
                  ✓
                </span>
                <span><strong className="text-slate-900">Daily Fatigue Ceiling:</strong> If your cap is 5.5h, we never pack 6h. The scheduler moves extra sessions earlier rather than overloading you.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs shrink-0">
                  ✓
                </span>
                <span><strong className="text-slate-900">Guaranteed Sleep & Rest:</strong> You close your laptop knowing today’s quota is achieved and tomorrow is already organized.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. 3-STEP ACADEMIC TIMELINE ATELIER
         ========================================================================= */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-sky-700 uppercase tracking-wider">
            Simplicity & Transparency
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            How StudyFlow organizes your semester in 3 steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="surface-card p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-3.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 font-extrabold text-sm flex items-center justify-center border border-sky-200">
              01
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Add Enrolled Courses & Tasks
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Input problem sets, lab reports, essays, and exams. Assign custom discipline color badges to keep subjects visually distinct at a glance.
            </p>
          </div>

          <div className="surface-card p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-3.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-700 font-extrabold text-sm flex items-center justify-center border border-cyan-200">
              02
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Block Lecture Hours & Fatigue Limits
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Mark out fixed classroom periods, lab times, campus athletics, and jobs. Set your personalized study fatigue slider (e.g. 5.5h daily cap).
            </p>
          </div>

          <div className="surface-card p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 font-extrabold text-sm flex items-center justify-center border border-emerald-200">
              03
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              1-Click Deterministic Generation
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Our knapsack engine populates your schedule with actionable study slots. Check off blocks as you finish them to dynamically decrement remaining hours.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. CALL TO ACTION ATELIER BANNER
         ========================================================================= */}
      <section className="rounded-3xl bg-gradient-to-br from-sky-700 via-sky-800 to-slate-950 text-white p-8 sm:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-cyan-200 border border-white/15 backdrop-blur-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ready for a Calm, Consistent Semester</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Stop guessing when to study. Let StudyFlow map your hours.
          </h2>

          <p className="text-xs sm:text-sm text-sky-100 font-medium leading-relaxed">
            Free forever for students. Deterministic scheduling, fatigue limits, and syllabus translation designed for undergraduate and graduate coursework.
          </p>
        </div>

        <div className="relative z-10 pt-2 flex flex-wrap items-center justify-center gap-3.5">
          {isAuthenticated ? (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {user?.role === 'admin' ? 'Open Admin Console' : 'Go to Study Workspace'}
            </Button>
          ) : (
            <>
              <Link
                to="/register"
                className="btn-tactile-primary px-6 py-3 text-sm font-bold text-white rounded-xl"
              >
                Create Free Account
              </Link>

              <Link
                to="/login"
                className="btn-tactile-secondary px-5 py-3 text-sm font-bold text-slate-800 bg-white rounded-xl"
              >
                Sign In to Existing Account
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
