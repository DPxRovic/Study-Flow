/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScheduledSession, Task, Subject, AvailabilitySlot } from '../types';

/**
 * Formats a date and time string ("YYYY-MM-DD", "HH:MM") into ICS iCalendar format "YYYYMMDDTHHMMSS"
 */
function formatIcsDateTime(dateStr: string, timeStr: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  const [h, m] = timeStr.split(':');
  const cleanTime = `${(h || '00').padStart(2, '0')}${(m || '00').padStart(2, '0')}00`;
  return `${cleanDate}T${cleanTime}`;
}

/**
 * Generates an RFC 5545 standard .ics iCalendar file string and triggers client download
 */
export function exportCalendarToICS({
  sessions,
  tasks,
  subjects,
  availability,
}: {
  sessions: ScheduledSession[];
  tasks: Task[];
  subjects: Subject[];
  availability: AvailabilitySlot[];
}): void {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudyFlow//Academic Planner Fall 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:StudyFlow Academic Schedule',
    'X-WR-TIMEZONE:America/New_York',
  ];

  // 1. Add Scheduled Study Sessions
  sessions.forEach((s) => {
    if (s.status === 'cancelled') return;
    const task = tasks.find((t) => t.id === s.taskId);
    const subject = subjects.find((sub) => sub.id === s.subjectId);

    const start = formatIcsDateTime(s.date, s.startTime);
    const end = formatIcsDateTime(s.date, s.endTime);
    const summary = `[StudyFlow] ${subject?.code || 'Study'}: ${task?.title || 'Study Session'}`;
    const description = `Study block for ${subject?.name || ''}. ${s.notes || ''} (Locked: ${s.locked ? 'Yes' : 'No'})`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${s.id}@studyflow.app`,
      `DTSTAMP:${formatIcsDateTime('2026-10-06', '12:00')}Z`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary.replace(/,/g, '\\,')}`,
      `DESCRIPTION:${description.replace(/,/g, '\\,')}`,
      `STATUS:${s.completed ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT'
    );
  });

  // 2. Add Task Deadlines
  tasks.forEach((t) => {
    const subject = subjects.find((sub) => sub.id === t.subjectId);
    const dueDate = new Date(t.dueDate);
    const dateStr = t.dueDate.split('T')[0];
    const timeStr = t.dueDate.includes('T') ? t.dueDate.split('T')[1].slice(0, 5) : '23:59';

    const start = formatIcsDateTime(dateStr, timeStr);
    const summary = `[DUE] ${subject?.code || ''}: ${t.title}`;
    const description = `Assignment deadline for ${subject?.name || ''}. Estimated: ${t.estimatedHours}h, Priority: ${t.priority.toUpperCase()}`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:due_${t.id}@studyflow.app`,
      `DTSTAMP:${formatIcsDateTime('2026-10-06', '12:00')}Z`,
      `DTSTART:${start}`,
      `DTEND:${start}`,
      `SUMMARY:${summary.replace(/,/g, '\\,')}`,
      `DESCRIPTION:${description.replace(/,/g, '\\,')}`,
      'PRIORITY:1',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');

  const icsContent = lines.join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'StudyFlow_Schedule_Fall2026.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
