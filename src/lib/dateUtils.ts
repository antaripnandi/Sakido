/**
 * Date Utilities for Sakido Academic Portal
 * Enforces ISO 8601 YYYY-MM-DD formatting and safe Date parsing across the codebase.
 */

const formatLocalISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayISO = () => formatLocalISODate(new Date());

/**
 * Normalizes any date string or Date object into a guaranteed YYYY-MM-DD string.
 */
export function normalizeToISODate(input: string | Date | null | undefined): string {
  if (!input) return todayISO();

  const d = input instanceof Date ? input : new Date(
    // DD-MM-YYYY or DD/MM/YYYY → rewrite to YYYY-MM-DD before parsing
    typeof input === 'string'
      ? input.replace(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/, '$3-$2-$1')
      : input
  );

  if (isNaN(d.getTime())) return todayISO();

  // If original was already YYYY-MM-DD (no time component), return as-is
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  return formatLocalISODate(d);
}

/**
 * Safely creates a JavaScript Date object from date (YYYY-MM-DD) and time (HH:mm) strings.
 * Returns null if the resulting date is invalid, preventing RangeError on .toISOString().
 */
export function safeCreateDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    const cleanDate = normalizeToISODate(dateStr);
    const cleanTime = (timeStr || '09:00').trim();

    // Ensure HH:mm format
    const timeParts = cleanTime.split(':');
    const hours = (timeParts[0] || '09').padStart(2, '0');
    const minutes = (timeParts[1] || '00').padStart(2, '0');

    const combinedStr = `${cleanDate}T${hours}:${minutes}:00`;
    const dt = new Date(combinedStr);

    if (isNaN(dt.getTime())) {
      return null;
    }

    return dt;
  } catch {
    return null;
  }
}
