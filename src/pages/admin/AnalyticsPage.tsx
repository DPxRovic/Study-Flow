/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BarChart3,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  Clock,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Info,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function AnalyticsPage() {
  const [selectedCohort, setSelectedCohort] = useState<'all' | 'stem' | 'humanities'>('all');

  const weeks = [
    { week: 'W1', hours: 12.4, status: 'Normal', note: 'Syllabus week' },
    { week: 'W2', hours: 14.1, status: 'Normal', note: 'First assignments' },
    { week: 'W3', hours: 15.6, status: 'Normal', note: 'Routine problem sets' },
    { week: 'W4', hours: 16.8, status: 'Normal', note: 'First quizzes' },
    { week: 'W5', hours: 18.2, status: 'Elevated', note: 'Lab practicals' },
    { week: 'W6', hours: 19.5, status: 'Elevated', note: 'Term paper outlines' },
    { week: 'W7', hours: 21.0, status: 'Heavy', note: 'Pre-midterm study' },
    { week: 'W8', hours: 26.4, status: 'Critical Crunch', note: 'Midterms overlap (CS 201 + MATH 241)' },
    { week: 'W9', hours: 18.0, status: 'Normal', note: 'Post-midterm recovery' },
    { week: 'W10', hours: 17.5, status: 'Normal', note: 'Mid-semester baseline' },
    { week: 'W11', hours: 19.0, status: 'Elevated', note: 'Second round quizzes' },
    { week: 'W12', hours: 21.5, status: 'Heavy', note: 'Project code milestones' },
    { week: 'W13', hours: 22.0, status: 'Heavy', note: 'Paper rough drafts' },
    { week: 'W14', hours: 25.8, status: 'Critical Crunch', note: 'Final projects submission' },
    { week: 'W15', hours: 27.2, status: 'Finals Crunch', note: 'Final examination week' },
  ];

  const courseBottlenecks = [
    {
      code: 'CS 201',
      title: 'Data Structures & Algorithms',
      catalogExpected: 8.0,
      actualReported: 11.4,
      strainDelta: '+42% higher',
      verdict: 'Heavy Strain',
      remedy: 'Suggest splitting Assignment 4 into two milestones',
    },
    {
      code: 'MATH 241',
      title: 'Multivariable Calculus',
      catalogExpected: 8.0,
      actualReported: 9.8,
      strainDelta: '+22% higher',
      verdict: 'Moderate Strain',
      remedy: 'Review quiz prep recitation problem workload',
    },
    {
      code: 'PHYS 211',
      title: 'Classical Mechanics & Thermal Physics',
      catalogExpected: 8.5,
      actualReported: 9.4,
      strainDelta: '+11% higher',
      verdict: 'Acceptable',
      remedy: 'Computational lab exercises pacing well',
    },
    {
      code: 'BIO 110',
      title: 'Principles of Molecular Biology',
      catalogExpected: 6.0,
      actualReported: 6.2,
      strainDelta: '+3% normal',
      verdict: 'Balanced',
      remedy: 'Well-aligned with institutional credit standard',
    },
    {
      code: 'PHIL 105',
      title: 'Ethics in the Information Age',
      catalogExpected: 4.5,
      actualReported: 4.1,
      strainDelta: '-9% light',
      verdict: 'Balanced',
      remedy: 'Reading load well-balanced with seminar writing',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
              Workload & Academic Analytics
            </span>
            <span className="text-[11px] text-slate-400 font-mono">15-Week Term View</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Cohort Workload Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium leading-relaxed">
            Exclusively useful academic indicators: semester bottleneck weeks, student time distribution, and catalog expectations vs. real reported hours.
          </p>
        </div>

        {/* Cohort Selector Filter */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setSelectedCohort('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              selectedCohort === 'all'
                ? 'bg-sky-50 text-sky-850 shadow-2xs border border-sky-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Students
          </button>
          <button
            onClick={() => setSelectedCohort('stem')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              selectedCohort === 'stem'
                ? 'bg-sky-50 text-sky-850 shadow-2xs border border-sky-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            STEM Majors
          </button>
          <button
            onClick={() => setSelectedCohort('humanities')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              selectedCohort === 'humanities'
                ? 'bg-sky-50 text-sky-850 shadow-2xs border border-sky-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Humanities
          </button>
        </div>
      </div>

      {/* Critical Midterm Crunch Warning Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/80 border border-rose-200 flex flex-col md:flex-row md:items-start justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-rose-700" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-extrabold text-rose-950">
              Systemic Crunch Detected: Week 8 (Midterms) & Week 15 (Finals)
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed font-medium max-w-3xl">
              Average required student study workload spikes dramatically from <span className="font-bold text-slate-900">17.2h</span> to <span className="font-bold text-rose-900">26.4h/student</span> during Week 8 due to concurrent major deliverables between CS 201, MATH 241, and PHYS 211.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[11px] font-mono font-extrabold text-rose-800 bg-rose-100/70 px-2.5 py-1 rounded-md border border-rose-200">
            Action Recommended
          </span>
        </div>
      </div>

      {/* Analytical Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Term Mean Study Rate</div>
          <div className="text-xl font-extrabold font-mono text-slate-900 tabular-nums">
            18.2h / wk
          </div>
        </div>
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Peak Weekly Demand</div>
          <div className="text-xl font-extrabold font-mono text-rose-800 tabular-nums">
            27.2h (W15)
          </div>
        </div>
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Pacing Consistency</div>
          <div className="text-xl font-extrabold font-mono text-emerald-800 tabular-nums">
            88.4% On Schedule
          </div>
        </div>
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Fatigue Violations</div>
          <div className="text-xl font-extrabold font-mono text-slate-900 tabular-nums">
            3.8% Days &gt;6h
          </div>
        </div>
      </div>

      {/* Semester Weekly Workload Histogram */}
      <div className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              15-Week Term Workload Histogram: Average Study Hours Required Per Student
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Aggregated across 1,248 active Fall 2026 course schedules and syllabus deliverable dates.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-600" />
              <span className="text-slate-600 font-medium">Normal (&lt;20h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span className="text-slate-600 font-medium">Elevated (20–24h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              <span className="text-slate-600 font-medium">Crunch (&gt;25h)</span>
            </div>
          </div>
        </div>

        {/* CSS Bar Chart */}
        <div className="pt-6 flex items-end gap-1.5 sm:gap-2.5 h-56 border-b border-slate-200 pb-2">
          {weeks.map((item) => {
            const heightPercent = Math.min(100, (item.hours / 30) * 100);
            const isCrunch = item.hours >= 25;
            const isHeavy = item.hours >= 20 && item.hours < 25;

            return (
              <div
                key={item.week}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
                title={`${item.week}: ${item.hours}h (${item.status}) — ${item.note}`}
              >
                <span className="text-[10px] font-mono tabular-nums text-slate-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.hours}h
                </span>

                <div
                  className={`w-full rounded-t-lg transition-all duration-200 group-hover:brightness-110 ${
                    isCrunch
                      ? 'bg-rose-500 shadow-xs shadow-rose-500/20'
                      : isHeavy
                      ? 'bg-amber-500 shadow-xs shadow-amber-500/20'
                      : 'bg-sky-600 shadow-xs shadow-sky-600/20'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />

                <span className={`text-[10px] font-mono font-bold ${isCrunch ? 'text-rose-700' : 'text-slate-500'}`}>
                  {item.week}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
          <span>Week 1 (Aug 24)</span>
          <span className="font-bold text-slate-700">Week 8 Midterms (Oct 12)</span>
          <span>Week 15 Finals (Dec 14)</span>
        </div>
      </div>

      {/* Course Difficulty & Workload Alignment Table */}
      <div className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Course Difficulty Alignment: Catalog Expectations vs. Actual Logged Hours
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Identifies courses with chronic divergence between formal credit assumptions and actual student study investment.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4 text-center">Catalog Expectation</th>
                <th className="py-3 px-4 text-center">Actual Student Mean</th>
                <th className="py-3 px-4 text-center">Discrepancy</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Advisory Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courseBottlenecks.map((c) => {
                const isOver = c.actualReported > c.catalogExpected + 1;
                const statusBadge =
                  c.verdict === 'Heavy Strain'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : c.verdict === 'Moderate Strain'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200';

                return (
                  <tr key={c.code} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-extrabold text-slate-900">{c.code}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{c.title}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-slate-700 font-bold">
                      {c.catalogExpected.toFixed(1)}h / wk
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono tabular-nums font-extrabold text-slate-900">
                      {c.actualReported.toFixed(1)}h / wk
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono tabular-nums font-bold">
                      <span className={isOver ? 'text-rose-700' : 'text-slate-600'}>
                        {c.strainDelta}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md border ${statusBadge}`}>
                        {c.verdict}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium text-xs">
                      {c.remedy}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
