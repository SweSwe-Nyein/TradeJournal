import { describe, it, expect } from 'vitest';
import {
  BANGKOK_TIMEZONE,
  BANGKOK_OFFSET_STRING,
  parseStoredTimestampToBangkok,
  formatBangkokDate,
  formatBangkokTime24,
  formatBangkokDateTime,
  convertBangkokInputToDatabaseISO,
  getNowInBangkok,
} from '@/src/lib/formatting/timezone';
import { formatDate, formatTime24, formatDateTime } from '@/src/lib/formatting/date';

describe('Thailand Standard Time (Asia/Bangkok - UTC+7) Parsing & Formatting', () => {
  describe('Constants and Defaults', () => {
    it('defines standard Bangkok timezone and UTC+7 offset', () => {
      expect(BANGKOK_TIMEZONE).toBe('Asia/Bangkok');
      expect(BANGKOK_OFFSET_STRING).toBe('+07:00');
    });

    it('returns valid current Bangkok parts', () => {
      const nowParts = getNowInBangkok();
      expect(nowParts.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(nowParts.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    });
  });

  describe('Bug Reproduction & Fix: Parsing Stored Timestamps Without Double Offset', () => {
    it('correctly parses entry time Oct 8, 2026, 14:15 without shifting by +7 hours to 21:15', () => {
      // Prior bug: new Date("2026-10-08T14:15:00Z").getHours() returned 21 in UTC+7 (14 + 7)
      const storedEntry = '2026-10-08T14:15:00Z';
      const parsed = parseStoredTimestampToBangkok(storedEntry);

      expect(parsed.date).toBe('2026-10-08');
      expect(parsed.time).toBe('14:15');
      expect(parsed.time).not.toBe('21:15');
    });

    it('correctly parses exit time Oct 9, 2026, 21:45 without shifting to 04:45 next day', () => {
      // Prior bug: 21:45 UTC shifted to 04:45 next day while date remained or shifted to 10/08
      const storedExit = '2026-10-09T21:45:00Z';
      const parsed = parseStoredTimestampToBangkok(storedExit);

      expect(parsed.date).toBe('2026-10-09');
      expect(parsed.time).toBe('21:45');
      expect(parsed.time).not.toBe('04:45');
    });

    it('correctly parses explicit +07:00 ISO timestamps', () => {
      const stored = '2026-10-08T14:15:00+07:00';
      const parsed = parseStoredTimestampToBangkok(stored);

      expect(parsed.date).toBe('2026-10-08');
      expect(parsed.time).toBe('14:15');
    });

    it('correctly parses space-separated PostgreSQL timestamptz strings', () => {
      const stored = '2026-10-08 14:15:00';
      const parsed = parseStoredTimestampToBangkok(stored);

      expect(parsed.date).toBe('2026-10-08');
      expect(parsed.time).toBe('14:15');
    });

    it('handles null and undefined gracefully by falling back to current Bangkok time', () => {
      const parsedNull = parseStoredTimestampToBangkok(null);
      const parsedUndef = parseStoredTimestampToBangkok(undefined);

      expect(parsedNull.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(parsedNull.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(parsedUndef.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Accurate Bangkok Date & 24h Time Formatting', () => {
    it('formats date field in MM/DD/YYYY format accurately', () => {
      expect(formatBangkokDate('2026-10-08T14:15:00Z', 'MM/DD/YYYY')).toBe('10/08/2026');
      expect(formatBangkokDate('2026-10-09T21:45:00Z', 'MM/DD/YYYY')).toBe('10/09/2026');
    });

    it('formats date field in YYYY-MM-DD format accurately', () => {
      expect(formatBangkokDate('2026-10-08T14:15:00Z', 'YYYY-MM-DD')).toBe('2026-10-08');
      expect(formatBangkokDate('2026-10-09T21:45:00Z', 'YYYY-MM-DD')).toBe('2026-10-09');
    });

    it('formats date field in medium readable format accurately', () => {
      expect(formatBangkokDate('2026-10-08T14:15:00Z', 'medium')).toBe('Oct 8, 2026');
      expect(formatBangkokDate('2026-10-09T21:45:00Z', 'medium')).toBe('Oct 9, 2026');
    });

    it('formats 24-hour time field (HH:mm) accurately', () => {
      expect(formatBangkokTime24('2026-10-08T14:15:00Z')).toBe('14:15');
      expect(formatBangkokTime24('2026-10-09T21:45:00Z')).toBe('21:45');
    });

    it('formats combined date and time with optional timezone label', () => {
      expect(formatBangkokDateTime('2026-10-08T14:15:00Z', false)).toBe('Oct 8, 2026, 14:15');
      expect(formatBangkokDateTime('2026-10-08T14:15:00Z', true)).toBe('Oct 8, 2026, 14:15 (UTC+7)');
    });
  });

  describe('Form Submission: Converting Bangkok Input to Database Format', () => {
    it('converts Bangkok user input into ISO string with explicit +07:00 offset', () => {
      const entryIso = convertBangkokInputToDatabaseISO('2026-10-08', '14:15');
      const exitIso = convertBangkokInputToDatabaseISO('2026-10-09', '21:45');

      expect(entryIso).toBe('2026-10-08T14:15:00+07:00');
      expect(exitIso).toBe('2026-10-09T21:45:00+07:00');
    });

    it('supports converting Bangkok user input into UTC ISO string if requested', () => {
      // 14:15 in Bangkok (UTC+7) is 07:15 UTC
      const entryUtc = convertBangkokInputToDatabaseISO('2026-10-08', '14:15', true);
      expect(entryUtc).toBe('2026-10-08T07:15:00.000Z');

      // 21:45 in Bangkok (UTC+7) is 14:45 UTC
      const exitUtc = convertBangkokInputToDatabaseISO('2026-10-09', '21:45', true);
      expect(exitUtc).toBe('2026-10-09T14:45:00.000Z');
    });

    it('ensures chronological order is maintained between entry and exit timestamps', () => {
      const entryIso = convertBangkokInputToDatabaseISO('2026-10-08', '14:15');
      const exitIso = convertBangkokInputToDatabaseISO('2026-10-09', '21:45');

      const entryMs = new Date(entryIso).getTime();
      const exitMs = new Date(exitIso).getTime();

      expect(exitMs).toBeGreaterThan(entryMs);
    });
  });

  describe('Roundtrip Stability (Multi-Edit Verification)', () => {
    it('preserves exact date and time over repeated edit and submit cycles without offset drift', () => {
      let currentDate = '2026-10-08';
      let currentTime = '14:15';

      // Simulate opening the edit modal, saving, re-opening, re-saving 10 consecutive times
      for (let cycle = 1; cycle <= 10; cycle++) {
        // 1. Submit form (user input -> DB ISO)
        const dbString = convertBangkokInputToDatabaseISO(currentDate, currentTime);

        // 2. Open edit modal (DB ISO -> form inputs)
        const parsed = parseStoredTimestampToBangkok(dbString);
        currentDate = parsed.date;
        currentTime = parsed.time;

        // Verify no shift occurred on this cycle
        expect(currentDate).toBe('2026-10-08');
        expect(currentTime).toBe('14:15');
      }
    });

    it('preserves exit date and time over repeated edit and submit cycles', () => {
      let currentDate = '2026-10-09';
      let currentTime = '21:45';

      for (let cycle = 1; cycle <= 10; cycle++) {
        const dbString = convertBangkokInputToDatabaseISO(currentDate, currentTime);
        const parsed = parseStoredTimestampToBangkok(dbString);
        currentDate = parsed.date;
        currentTime = parsed.time;

        expect(currentDate).toBe('2026-10-09');
        expect(currentTime).toBe('21:45');
      }
    });
  });

  describe('Integration with Central date.ts Formatting Functions', () => {
    it('formatDate formats Bangkok timestamps consistently', () => {
      expect(formatDate('2026-10-08T14:15:00Z')).toBe('Oct 8, 2026');
      expect(formatDate('2026-10-09T21:45:00Z')).toBe('Oct 9, 2026');
    });

    it('formatTime24 formats Bangkok timestamps into 24h by default', () => {
      expect(formatTime24('2026-10-08T14:15:00Z')).toBe('14:15');
      expect(formatTime24('2026-10-09T21:45:00Z')).toBe('21:45');
    });

    it('formatDateTime formats Bangkok timestamp with 24h time', () => {
      expect(formatDateTime('2026-10-08T14:15:00Z')).toBe('Oct 8, 2026, 14:15');
    });
  });
});
