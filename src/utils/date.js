import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import 'dayjs/locale/id.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.extend(customParseFormat);
dayjs.locale('id');

const DEFAULT_TZ = 'Asia/Makassar';

/**
 * Get current date/time in user timezone
 */
export function now(tz = DEFAULT_TZ) {
  return dayjs().tz(tz);
}

/**
 * Get start of today in user timezone
 */
export function startOfToday(tz = DEFAULT_TZ) {
  return dayjs().tz(tz).startOf('day');
}

/**
 * Get end of today in user timezone
 */
export function endOfToday(tz = DEFAULT_TZ) {
  return dayjs().tz(tz).endOf('day');
}

/**
 * Get start of this week (Monday) in user timezone
 */
export function startOfThisWeek(tz = DEFAULT_TZ) {
  return dayjs().tz(tz).startOf('isoWeek');
}

/**
 * Get end of this week (Sunday) in user timezone
 */
export function endOfThisWeek(tz = DEFAULT_TZ) {
  return dayjs().tz(tz).endOf('isoWeek');
}

/**
 * Get start of this month in user timezone
 */
export function startOfThisMonth(tz = DEFAULT_TZ) {
  return dayjs().tz(tz).startOf('month');
}

/**
 * Get end of this month in user timezone
 */
export function endOfThisMonth(tz = DEFAULT_TZ) {
  return dayjs().tz(tz).endOf('month');
}

/**
 * Get start of previous month
 */
export function startOfLastMonth(tz = DEFAULT_TZ) {
  return dayjs().tz(tz).subtract(1, 'month').startOf('month');
}

/**
 * Get end of previous month
 */
export function endOfLastMonth(tz = DEFAULT_TZ) {
  return dayjs().tz(tz).subtract(1, 'month').endOf('month');
}

/**
 * Format date for display
 */
export function formatDate(date, format = 'DD MMMM YYYY') {
  return dayjs(date).tz(DEFAULT_TZ).format(format);
}

/**
 * Format date with time
 */
export function formatDateTime(date) {
  return dayjs(date).tz(DEFAULT_TZ).format('DD MMM YYYY HH:mm');
}

/**
 * Parse date string ke Date object
 * Mendukung format: "1 Jan 2024", "01/01/2024", "2024-01-01", "kemarin", "hari ini"
 */
export function parseDate(text, tz = DEFAULT_TZ) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  if (lower === 'hari ini' || lower === 'today') {
    return dayjs().tz(tz).toDate();
  }
  if (lower === 'kemarin' || lower === 'yesterday') {
    return dayjs().tz(tz).subtract(1, 'day').toDate();
  }
  if (lower === 'lusa' || lower === '2 hari lalu') {
    return dayjs().tz(tz).subtract(2, 'day').toDate();
  }

  // Try various formats
  const formats = [
    'YYYY-MM-DD',
    'DD/MM/YYYY',
    'DD-MM-YYYY',
    'D MMMM YYYY',
    'D MMM YYYY',
    'DD MMMM YYYY',
    'DD MMM YYYY',
  ];

  for (const fmt of formats) {
    const parsed = dayjs(text, fmt, 'id', true);
    if (parsed.isValid()) {
      return parsed.tz(tz, true).toDate();
    }
  }

  // Fallback: native Date parsing
  const native = new Date(text);
  if (!isNaN(native.getTime())) {
    return native;
  }

  return null;
}

export { dayjs };
