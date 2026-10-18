/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, AlertTriangle, CheckCircle2, Clock, Calendar, ArrowRight } from 'lucide-react';
import { Subject, Task, ScheduledSession, SubjectWorkloadStatus } from '../../types';
import { SUBJECT_CATEGORY_STYLES } from '../../theme/tokens';
import { Link } from 'react-router-dom';

interface SubjectAttentionMatrixProps {
  subjects: Subject[];
  tasks: Task[];
  sessions: ScheduledSession[];
}

export function SubjectAttentionMatrix({
  subjects,
  tasks,
  sessions,
}: SubjectAttentionMatrixProps) {
  // Compute detailed status for each subject
  const subjectStatuses: SubjectWorkloadStatus[] = subjects.map((subject) => {
    const subjectTasks = tasks.filter((t) => t.subjectId === subject.id);
    const completedTasks = subjectTasks.filter((t) => t.status === 'completed');
    const remainingTasks = subjectTasks.filter((t) => t.status !== 'completed');

    const estimatedHours = subjectTasks.reduce((acc, t) => acc + t.estimatedHours, 0);
    const remainingHours = remainingTasks.reduce((acc, t) => acc + t.remainingHours, 0);
    const completedHours = Math.max(0, estimatedHours - remainingHours);

    // Sessions for this subject
    const subjectSessions = sessions.filter((s) => s.subjectId === subject.id);
    const loggedWeeklyHours = subjectSessions
      .filter((s) => s.completed)
      .reduce((acc, s) => acc + s.durationMinutes / 60, 0);
    const scheduledWeeklyHours = subjectSessions
      .filter((s) => !s.completed && s.status !== 'cancelled')
      .reduce((acc, s) => acc + s.durationMinutes / 60, 0);

    // Attention rule evaluation
    const hasUrgentDeadline = remainingTasks.some((t) => {
      const diffHours = (new Date(t.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
      return diffHours <= 48 && t.remainingHours > 0;
    });

    const isSeverelyUnderallocated =
      remainingHours > 3.0 && scheduledWeeklyHours < 1.0;

    let attentionLevel: 'healthy' | 'on_track' | 'needs_attention' = 'healthy';
    let attentionReason: string | undefined = undefined;

    if (hasUrgentDeadline) {
      attentionLevel = 'needs_attention';
      attentionReason = 'Deliverable due within 48h with remaining study hours';
    } else if (isSeverelyUnderallocated) {
      attentionLevel = 'needs_attention';
      attentionReason = `${remainingHours.toFixed(1)}h backlog with <1h scheduled`;
    } else if (loggedWeeklyHours + scheduledWeeklyHours >= subject.weeklyTargetHours * 0.7) {
      attentionLevel = 'healthy';
      attentionReason = 'Target weekly hours well-paced';
    } else {
      attentionLevel = 'on_track';
      attentionReason = 'Pacing steady for term deliverables';
    }

    return {
      subject,
      totalTasks: subjectTasks.length,
      completedTasks: completedTasks.length,
      remainingTasks: remainingTasks.length,
      estimatedHours,
      completedHours,
      remainingHours,
      targetWeeklyHours: subject.weeklyTargetHours,
      scheduledWeeklyHours,
      loggedWeeklyHours,
      attentionLevel,
      attentionReason,
    };
  });

  return (
    <div className="surface-base rounded-2xl p-5 sm:p-6 shadow-2xs border border-slate-200/90 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600" />
            <span>Course Attention & Credit Workload Alignment</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Explicitly answers: Which courses are falling behind and which need study blocks scheduled?
          </p>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {subjects.length} Enrolled Courses · {subjects.reduce((a, s) => a + s.credits, 0)} Total Credits
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {subjectStatuses.map((item) => {
          const style = SUBJECT_CATEGORY_STYLES[item.subject.colorKey];
          const totalPlannedOrLogged = item.loggedWeeklyHours + item.scheduledWeeklyHours;
          const targetPercentage = Math.min(
            100,
            Math.round((totalPlannedOrLogged / item.targetWeeklyHours) * 100)
          );

          return (
            <div
              key={item.subject.id}
              className="py-4 first:pt-2 last:pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Course Title and Metadata */}
              <div className="space-y-1.5 min-w-[240px]">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${style.dot} shrink-0`} />
                  <span className="font-extrabold text-sm text-slate-900">
                    {item.subject.code}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-xs text-slate-600 font-medium truncate max-w-[180px]">
                    {item.subject.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{item.subject.credits} credit hours</span>
                  <span aria-hidden="true">·</span>
                  <span>Target: {item.targetWeeklyHours}h/wk</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{item.remainingTasks} active task{item.remainingTasks !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Workload Progress Bar */}
              <div className="flex-1 max-w-md space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Weekly Pacing: <strong className="text-slate-800 font-mono tabular-nums">{totalPlannedOrLogged.toFixed(1)}h</strong> / {item.targetWeeklyHours}h
                  </span>
                  <span className="font-mono tabular-nums font-bold text-slate-700">
                    {targetPercentage}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                  <div
                    className={`h-full rounded-full ${style.accentBar} transition-all duration-300`}
                    style={{ width: `${targetPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Logged: {item.loggedWeeklyHours.toFixed(1)}h</span>
                  <span>Scheduled: {item.scheduledWeeklyHours.toFixed(1)}h</span>
                  <span>Backlog: {item.remainingHours.toFixed(1)}h</span>
                </div>
              </div>

              {/* Attention Status & CTA */}
              <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                <div className="text-right">
                  {item.attentionLevel === 'needs_attention' ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Needs Attention</span>
                    </div>
                  ) : item.attentionLevel === 'on_track' ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-850">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>On Track</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Healthy Balance</span>
                    </div>
                  )}
                  {item.attentionReason && (
                    <div className="text-[11px] text-slate-500 font-medium max-w-[200px] truncate">
                      {item.attentionReason}
                    </div>
                  )}
                </div>

                <Link
                  to="/schedule"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                  title={`View schedule for ${item.subject.code}`}
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
