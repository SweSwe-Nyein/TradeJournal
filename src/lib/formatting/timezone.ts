/**
 * Thailand Standard Time (Asia/Bangkok - UTC+7) Formatting and Parsing Utilities
 * 
 * Standardizes all trade timestamp parsing, storing, and displaying so that
 * date and time inputs do not suffer from double-applying timezone offsets
 * or accidental multi-hour shifts across form opens and saves.
 */

export const BANGKOK_TIMEZONE = 'Asia/Bangkok';
export const BANGKOK_OFFSET_HOURS = 7;
export const BANGKOK_OFFSET_STRING = '+07:00';

export interface BangkokDateTimeParts {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24-hour format)
}

/**
 * Returns current date (YYYY-MM-DD) and 24h time (HH:mm) in Asia/Bangkok (UTC+7).
 */
export function getNowInBangkok(): BangkokDateTimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGKOK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const p: Record<string, string> = {};
  parts.forEach((part) => {
    p[part.type] = part.value;
  });

  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}

/**
 * Parses a stored timestamp (ISO string, PostgreSQL timestamptz, or Date)
 * into { date: 'YYYY-MM-DD', time: 'HH:mm' } WITHOUT double-applying timezone offsets.
 *
 * When an entry was stored like "2026-10-08T14:15:00Z" or "2026-10-08T14:15:00+07:00",
 * parsing directly preserves the exact intended wall-clock date and time (14:15)
 * rather than allowing JavaScript's Date constructor to re-apply +7 hours (which would
 * erroneously shift 14:15 to 21:15 or exit 21:45 to 04:45).
 */
export function parseStoredTimestampToBangkok(
  timestamp: string | Date | null | undefined
): BangkokDateTimeParts {
  if (!timestamp) {
    return getNowInBangkok();
  }

  if (typeof timestamp === 'string') {
    const trimmed = timestamp.trim();
    // Direct match for standard ISO / PostgreSQL formats: YYYY-MM-DD[T or space]HH:mm
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
    if (match) {
      return {
        date: match[1],
        time: match[2],
      };
    }
  }

  // Fallback for Date objects or non-ISO strings using explicit Asia/Bangkok timeZone
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(d.getTime())) {
    return getNowInBangkok();
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGKOK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const p: Record<string, string> = {};
  parts.forEach((part) => {
    p[part.type] = part.value;
  });

  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}

/**
 * Formats a date accurately in Asia/Bangkok time zone.
 * Supported formats:
 * - 'YYYY-MM-DD': e.g. "2026-10-08"
 * - 'MM/DD/YYYY': e.g. "10/08/2026"
 * - 'medium': e.g. "Oct 8, 2026"
 */
export function formatBangkokDate(
  dateInput: string | Date | null | undefined,
  format: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'medium' = 'medium'
): string {
  if (!dateInput) return '—';
  const { date } = parseStoredTimestampToBangkok(dateInput);
  if (!date || date.length !== 10) return '—';

  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return '—';

  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }

  if (format === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  }

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const mIndex = parseInt(month, 10) - 1;
  const dNum = parseInt(day, 10);
  const mName = monthNames[mIndex] || month;

  return `${mName} ${dNum}, ${year}`;
}

/**
 * Formats a timestamp into 24-hour time (HH:mm) in Asia/Bangkok time zone.
 * e.g. "14:15" or "21:45"
 */
export function formatBangkokTime24(
  dateInput: string | Date | null | undefined
): string {
  if (!dateInput) return '—';
  const { time } = parseStoredTimestampToBangkok(dateInput);
  return time || '—';
}

/**
 * Formats both Date and Time in Asia/Bangkok time zone.
 * e.g. "Oct 8, 2026, 14:15" or "Oct 8, 2026, 14:15 (UTC+7)"
 */
export function formatBangkokDateTime(
  dateInput: string | Date | null | undefined,
  includeTzLabel: boolean = false
): string {
  if (!dateInput) return '—';
  const dateFormatted = formatBangkokDate(dateInput, 'medium');
  const timeFormatted = formatBangkokTime24(dateInput);
  if (dateFormatted === '—' || timeFormatted === '—') return '—';

  const base = `${dateFormatted}, ${timeFormatted}`;
  return includeTzLabel ? `${base} (UTC+7)` : base;
}

/**
 * Converts user's Bangkok (UTC+7) form inputs (date + time) into database format.
 *
 * Example:
 *   date: "2026-10-08", time: "14:15"
 *   -> "2026-10-08T14:15:00+07:00"
 *
 * If asUtc is true:
 *   -> "2026-10-08T07:15:00.000Z"
 */
export function convertBangkokInputToDatabaseISO(
  date: string,
  time: string,
  asUtc: boolean = false
): string {
  const cleanDate = (date || '').trim() || getNowInBangkok().date;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const validTime = timeRegex.test((time || '').trim()) ? time.trim() : '09:30';
  const fullWithOffset = `${cleanDate}T${validTime}:00${BANGKOK_OFFSET_STRING}`;

  if (asUtc) {
    const d = new Date(fullWithOffset);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  return fullWithOffset;
}
