export interface WeekDayDescriptor {
  date: string;
  dateObject: Date;
  dayOfWeek: number;
  name: string;
  fullName: string;
  fullDate: string;
  isToday: boolean;
}

/** Formats a Date as a local-calendar YYYY-MM-DD value without UTC rollover. */
export function toLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses a YYYY-MM-DD value as local midnight. */
export function fromLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Returns Monday through Sunday for the local week containing the anchor date. */
export function getLocalWeekDays(anchor = new Date()): WeekDayDescriptor[] {
  const todayKey = toLocalDateKey(anchor);
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const offsetFromMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offsetFromMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const dateObject = new Date(monday);
    dateObject.setDate(monday.getDate() + index);

    return {
      date: toLocalDateKey(dateObject),
      dateObject,
      dayOfWeek: dateObject.getDay(),
      name: dateObject.toLocaleDateString(undefined, { weekday: 'short' }),
      fullName: dateObject.toLocaleDateString(undefined, { weekday: 'long' }),
      fullDate: dateObject.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      isToday: toLocalDateKey(dateObject) === todayKey,
    };
  });
}

export function formatLongLocalDate(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatCurrentWeekLabel(anchor = new Date()): string {
  const [start, , , , , , end] = getLocalWeekDays(anchor);
  const startLabel = start.dateObject.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const endLabel = end.dateObject.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return `${startLabel}–${endLabel}`;
}
