import {
  BANGKOK_TIMEZONE,
  formatBangkokDate,
  formatBangkokTime24,
  formatBangkokDateTime,
  parseStoredTimestampToBangkok,
  convertBangkokInputToDatabaseISO,
  getNowInBangkok,
  type BangkokDateTimeParts,
} from './timezone';

export {
  BANGKOK_TIMEZONE,
  formatBangkokDate,
  formatBangkokTime24,
  formatBangkokDateTime,
  parseStoredTimestampToBangkok,
  convertBangkokInputToDatabaseISO,
  getNowInBangkok,
  type BangkokDateTimeParts,
};

/**
 * Formats a date string or Date object with custom Intl options,
 * defaulting to the standardized Thailand Time (Asia/Bangkok) time zone.
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
  timezone: string = BANGKOK_TIMEZONE
): string {
  if (!dateInput) return '—';
  
  // If string has a direct date component and options are standard short month/day/year:
  if (typeof dateInput === 'string' && options.month === 'short' && options.day === 'numeric' && options.year === 'numeric') {
    return formatBangkokDate(dateInput, 'medium');
  }

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: timezone,
  }).format(date);
}

/**
 * Formats a timestamp into 24-hour time (HH:mm),
 * defaulting to the standardized Thailand Time (Asia/Bangkok) time zone.
 */
export function formatTime24(
  dateInput: string | Date | null | undefined,
  timezone: string = BANGKOK_TIMEZONE
): string {
  if (!dateInput) return '—';
  if (timezone === BANGKOK_TIMEZONE) {
    return formatBangkokTime24(dateInput);
  }
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(date);
}

/**
 * Formats both date and time into a readable string,
 * defaulting to the standardized Thailand Time (Asia/Bangkok) time zone.
 */
export function formatDateTime(
  dateInput: string | Date | null | undefined,
  timezone: string = BANGKOK_TIMEZONE
): string {
  if (!dateInput) return '—';
  if (timezone === BANGKOK_TIMEZONE) {
    return formatBangkokDateTime(dateInput);
  }
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(date);
}
