/**
 * Date Utilities for Sakido Academic Portal
 * Enforces ISO 8601 YYYY-MM-DD formatting and safe Date parsing across the codebase.
 */

/**
 * Normalizes any date string or Date object into a guaranteed YYYY-MM-DD string.
 */
export function normalizeToISODate(input: string | Date | null | undefined): string {
  if (!input) {
    return new Date().toISOString().split('T')[0];
  }

  if (input instanceof Date) {
    if (isNaN(input.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return input.toISOString().split('T')[0];
  }

  const str = String(input).trim();
  if (!str) {
    return new Date().toISOString().split('T')[0];
  }

  // Already YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // If string contains ISO time e.g. "2026-07-31T09:00:00"
  if (str.includes('T') && /^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split('T')[0];
  }

  // DD-MM-YYYY or DD/MM/YYYY format e.g. "31-07-2026" or "31/07/2026"
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = ddmmyyyyMatch[1].padStart(2, '0');
    const month = ddmmyyyyMatch[2].padStart(2, '0');
    const year = ddmmyyyyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback to JS Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  // Default to today if parsing fails completely
  return new Date().toISOString().split('T')[0];
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
