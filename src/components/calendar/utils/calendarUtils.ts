/**
 * Time calculation utilities for calendar components
 */

export const parseTime = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const snapToQuarter = (min: number): number => Math.round(min / 15) * 15;

export const clientYToTime = (clientY: number, containerTop: number): string => {
  const offsetPx = clientY - containerTop;
  const minutesFromTop = (offsetPx / 52) * 60;
  const snappedMinutes = snapToQuarter(minutesFromTop);
  return minutesToTime(Math.max(0, Math.min(1440, snappedMinutes)));
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const startOfWeek = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  result.setDate(result.getDate() + diff);
  return result;
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export const formatDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Parse a date-only string ("YYYY-MM-DD") in local time.
 * `new Date("YYYY-MM-DD")` is parsed as UTC midnight, which shifts the day
 * index for users west of UTC (and across DST) when diffing against local
 * dates. Always use this helper for formatDate() output.
 */
export const parseDate = (value: string): Date => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Whole-day difference between two local dates, DST-safe (rounds). */
export const diffInDays = (a: Date, b: Date): number =>
  Math.round((a.getTime() - b.getTime()) / 86400000);
