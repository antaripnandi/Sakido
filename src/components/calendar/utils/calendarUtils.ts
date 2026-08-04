/**
 * Time and Date calculation utilities for Sakido Calendar components.
 * Includes local-midnight normalization to ensure 100% accurate day index matching.
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
  result.setHours(0, 0, 0, 0);
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
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

/** Whole-day difference between two local dates, DST-safe (rounds). */
export const diffInDays = (a: Date, b: Date): number => {
  const aMidnight = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bMidnight = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((aMidnight.getTime() - bMidnight.getTime()) / 86400000);
};

export const format12Hour = (timeStr?: string): string => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h}${ampm}` : `${h}:${m.toString().padStart(2, '0')}${ampm}`;
};

export const formatFriendlyDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

