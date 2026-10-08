import { describe, it, expect } from 'vitest';
import { parseCsvString } from '@/src/lib/imports/parser';
import { autoDetectColumnMapping } from '@/src/lib/imports/mapping';
import {
  parseDirection,
  parseDecimal,
  parseDateTime,
  normalizeCsvRow,
  generateTradeFingerprint,
} from '@/src/lib/imports/normalizer';
import { executeTradeImport } from '@/src/lib/imports/importer';
import type { ValidatedImportRow } from '@/src/types/import';

describe('CSV Trade Importer Engine', () => {
  const accountId = 'acc-test-12345';
  const userId = 'user-test-99999';

  describe('1. CSV Parsing & Quoted Values', () => {
    it('parses valid CSV correctly with detected headers and rows', () => {
      const csv = `Symbol,Side,Entry Time,Exit Time,Entry Price,Exit Price,Quantity\nNQ,BUY,2026-10-06 09:30:00,2026-10-06 09:45:00,18500,18525,2`;
      const result = parseCsvString(csv);

      expect(result.totalRows).toBe(1);
      expect(result.headers).toEqual([
        'Symbol',
        'Side',
        'Entry Time',
        'Exit Time',
        'Entry Price',
        'Exit Price',
        'Quantity',
      ]);
      expect(result.rows[0].Symbol).toBe('NQ');
      expect(result.rows[0].Side).toBe('BUY');
    });

    it('handles empty CSV input safely', () => {
      const result = parseCsvString('');
      expect(result.totalRows).toBe(0);
      expect(result.headers).toEqual([]);
    });

    it('handles malformed CSV without throwing exceptions', () => {
      const malformed = `Header1,Header2\nValue1,Value2,ExtraUnexpectedValue\nOnlyOneValue`;
      const result = parseCsvString(malformed);
      expect(result.totalRows).toBeGreaterThan(0);
    });

    it('handles quoted CSV values with embedded commas and whitespace', () => {
      const csv = `Symbol,Side,Entry Price,Quantity,Notes\nES,SELL,"$5,820.50",1,"Short breakdown, take profit at target, strict risk"`;
      const result = parseCsvString(csv);

      expect(result.totalRows).toBe(1);
      expect(result.rows[0]['Entry Price']).toBe('$5,820.50');
      expect(result.rows[0].Notes).toBe(
        'Short breakdown, take profit at target, strict risk'
      );
    });
  });

  describe('2. Column Mapping & Auto-Detection', () => {
    it('auto-detects common broker headers', () => {
      const headers = [
        'Ticker',
        'Direction',
        'Open Time',
        'Close Time',
        'Open Price',
        'Close Price',
        'Size',
        'Commission',
      ];
      const mapping = autoDetectColumnMapping(headers);

      expect(mapping.symbol).toBe('Ticker');
      expect(mapping.direction).toBe('Direction');
      expect(mapping.entry_time).toBe('Open Time');
      expect(mapping.exit_time).toBe('Close Time');
      expect(mapping.entry_price).toBe('Open Price');
      expect(mapping.exit_price).toBe('Close Price');
      expect(mapping.quantity).toBe('Size');
      expect(mapping.commission).toBe('Commission');
    });

    it('reports missing required columns', () => {
      const mapping = autoDetectColumnMapping(['RandomHeader1', 'RandomHeader2']);
      expect(mapping.symbol).toBeNull();
      expect(mapping.direction).toBeNull();
      expect(mapping.entry_price).toBeNull();
    });
  });

  describe('3. Normalization Rules', () => {
    it('normalizes BUY / SELL conventions', () => {
      expect(parseDirection('BUY')).toBe('long');
      expect(parseDirection('SELL')).toBe('short');
      expect(parseDirection('B')).toBe('long');
      expect(parseDirection('S')).toBe('short');
      expect(parseDirection('BOT')).toBe('long');
      expect(parseDirection('SLD')).toBe('short');
    });

    it('normalizes LONG / SHORT and CALL / PUT conventions', () => {
      expect(parseDirection('LONG')).toBe('long');
      expect(parseDirection('SHORT')).toBe('short');
      expect(parseDirection('CALL')).toBe('long');
      expect(parseDirection('PUT')).toBe('short');
      expect(parseDirection('1')).toBe('long');
      expect(parseDirection('-1')).toBe('short');
    });

    it('rejects ambiguous or unknown direction values', () => {
      expect(parseDirection('HOLD')).toBeNull();
      expect(parseDirection('DIVIDEND')).toBeNull();
      expect(parseDirection('UNKNOWN')).toBeNull();
      expect(parseDirection('')).toBeNull();
    });

    it('normalizes decimal numbers, currency signs, and negative parentheses', () => {
      expect(parseDecimal('$18,520.50')).toBe(18520.5);
      expect(parseDecimal('€ 1,234.56')).toBe(1234.56);
      expect(parseDecimal('(45.20)')).toBe(-45.2);
      expect(parseDecimal(' -12.5 ')).toBe(-12.5);
      expect(parseDecimal('invalid')).toBeNull();
    });

    it('normalizes various date/time formats into valid ISO 8601 strings', () => {
      const iso = parseDateTime('2026-10-06T14:30:00Z');
      expect(iso).toBe('2026-10-06T14:30:00.000Z');

      const usFormat = parseDateTime('10/06/2026 14:30:00');
      expect(usFormat).not.toBeNull();
      expect(new Date(usFormat!).getUTCFullYear()).toBe(2026);

      const timestamp = parseDateTime('1791297000'); // seconds
      expect(timestamp).not.toBeNull();
    });

    it('rejects invalid date strings', () => {
      expect(parseDateTime('not-a-date')).toBeNull();
      expect(parseDateTime('')).toBeNull();
    });
  });

  describe('4. Row Validation & Price/Date Sanity Checks', () => {
    const validMapping = {
      symbol: 'Symbol',
      direction: 'Side',
      entry_time: 'Entry Time',
      exit_time: 'Exit Time',
      entry_price: 'Entry Price',
      exit_price: 'Exit Price',
      quantity: 'Quantity',
      stop_loss: null,
      take_profit: null,
      commission: null,
      fees: null,
      swap: null,
      risk_amount: null,
      notes: null,
    };

    it('validates a completely correct trade row', () => {
      const raw = {
        Symbol: 'NQ',
        Side: 'BUY',
        'Entry Time': '2026-10-06 09:30:00',
        'Exit Time': '2026-10-06 09:45:00',
        'Entry Price': '18500.50',
        'Exit Price': '18550.00',
        Quantity: '2',
      };

      const result = normalizeCsvRow(raw, validMapping, accountId, 0);
      expect(result.status).toBe('valid');
      expect(result.errors).toHaveLength(0);
      expect(result.data?.symbol).toBe('NQ');
      expect(result.data?.direction).toBe('long');
      expect(result.data?.gross_pnl).toBe(99); // (18550 - 18500.5) * 2 = 99
      expect(result.data?.net_pnl).toBe(99);
    });

    it('rejects non-positive entry price', () => {
      const raw = {
        Symbol: 'NQ',
        Side: 'BUY',
        'Entry Time': '2026-10-06 09:30:00',
        'Entry Price': '-100',
        Quantity: '2',
      };

      const result = normalizeCsvRow(raw, validMapping, accountId, 0);
      expect(result.status).toBe('invalid');
      expect(result.errors.some((e) => e.includes('Entry price'))).toBe(true);
    });

    it('rejects when exit time precedes entry time', () => {
      const raw = {
        Symbol: 'ES',
        Side: 'SELL',
        'Entry Time': '2026-10-06 10:30:00',
        'Exit Time': '2026-10-06 09:30:00', // 1 hour earlier
        'Entry Price': '5800',
        'Exit Price': '5790',
        Quantity: '1',
      };

      const result = normalizeCsvRow(raw, validMapping, accountId, 0);
      expect(result.status).toBe('invalid');
      expect(result.errors).toContain('Exit time cannot be before entry time');
    });
  });

  describe('5. Duplicate Detection Fingerprinting', () => {
    it('generates deterministic fingerprint for duplicate matching', () => {
      const fp1 = generateTradeFingerprint(
        accountId,
        'AAPL',
        'long',
        '2026-10-06T14:30:00.000Z',
        '2026-10-06T15:00:00.000Z',
        225.5,
        228.0,
        100
      );

      const fp2 = generateTradeFingerprint(
        accountId,
        'aapl', // case difference
        'long',
        '2026-10-06T14:30:00.000Z',
        '2026-10-06T15:00:00.000Z',
        225.5,
        228.0,
        100
      );

      expect(fp1).toBe(fp2);
    });

    it('produces different fingerprints for different accounts, times, or sizes', () => {
      const fp1 = generateTradeFingerprint(
        accountId,
        'AAPL',
        'long',
        '2026-10-06T14:30:00.000Z',
        null,
        225.5,
        null,
        100
      );

      const fp2 = generateTradeFingerprint(
        'different-account',
        'AAPL',
        'long',
        '2026-10-06T14:30:00.000Z',
        null,
        225.5,
        null,
        100
      );

      expect(fp1).not.toBe(fp2);
    });
  });

  describe('6. Partial Invalid Imports & Execution Transaction', () => {
    it('processes mixed batch: imports valid, skips duplicates, and logs invalid rows', async () => {
      const rows: ValidatedImportRow[] = [
        // 1. Valid row
        {
          index: 0,
          raw: { Symbol: 'NQ' },
          status: 'valid',
          errors: [],
          fingerprint: 'fp-1',
          data: {
            symbol: 'NQ',
            direction: 'long',
            entry_time: '2026-10-06T09:30:00Z',
            exit_time: '2026-10-06T09:45:00Z',
            entry_price: 18500,
            exit_price: 18520,
            quantity: 2,
            stop_loss: 18480,
            take_profit: 18540,
            commission: 4,
            fees: 1,
            swap: 0,
            risk_amount: 40,
            status: 'closed',
            notes: 'Test trade 1',
            gross_pnl: 40,
            net_pnl: 35,
            r_multiple: 0.88,
          },
        },
        // 2. Duplicate row
        {
          index: 1,
          raw: { Symbol: 'NQ' },
          status: 'duplicate',
          errors: ['Trade already exists in this trading account'],
          fingerprint: 'fp-1',
          data: null,
        },
        // 3. Invalid row
        {
          index: 2,
          raw: { Symbol: 'BAD' },
          status: 'invalid',
          errors: ['Entry price must be greater than 0'],
          fingerprint: 'fp-bad',
          data: null,
        },
      ];

      const result = await executeTradeImport(userId, accountId, rows, {
        skipDuplicates: true,
      });

      expect(result.totalRows).toBe(3);
      expect(result.importedCount).toBe(1);
      expect(result.skippedDuplicatesCount).toBe(1);
      expect(result.invalidCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.importedTradeIds).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(3); // row index 2 + 1
    });
  });
});
