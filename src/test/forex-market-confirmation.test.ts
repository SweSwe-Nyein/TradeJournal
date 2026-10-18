import { describe, it, expect } from 'vitest';
import {
  getPipSize,
  priceDiffToPips,
  formatPrice,
  calculateADR,
  getPreviousDayLevels,
  getPreviousWeekLevels,
  getAsianSessionLevels,
  getCurrentSessionInfo,
  detectLiquiditySweep,
  calculateH1Bias,
  calculateM15Confirmation,
  determineFinalBiasAndSetup,
  getDataFreshnessStatus,
  normalizeTwelveDataCandles,
  buildForexConfirmationRecord,
} from '../lib/forex/forex-calculations';
import type { ForexCandle } from '../lib/forex/forex-types';
import { SUPPORTED_FOREX_PAIRS } from '../lib/forex/forex-types';

describe('Forex Instrument and Pip Calculations', () => {
  it('supports exactly the 8 required forex pairs', () => {
    expect(SUPPORTED_FOREX_PAIRS).toEqual([
      'AUD/USD',
      'NZD/USD',
      'GBP/USD',
      'USD/JPY',
      'AUD/JPY',
      'EUR/USD',
      'GBP/JPY',
      'NZD/JPY',
    ]);
  });

  it('correctly assigns pip sizes for JPY and non-JPY pairs', () => {
    expect(getPipSize('EUR/USD')).toBe(0.0001);
    expect(getPipSize('GBP/USD')).toBe(0.0001);
    expect(getPipSize('AUD/USD')).toBe(0.0001);
    expect(getPipSize('NZD/USD')).toBe(0.0001);

    expect(getPipSize('USD/JPY')).toBe(0.01);
    expect(getPipSize('GBP/JPY')).toBe(0.01);
    expect(getPipSize('AUD/JPY')).toBe(0.01);
    expect(getPipSize('NZD/JPY')).toBe(0.01);
  });

  it('converts raw price differences to pips accurately', () => {
    // EUR/USD: 1.08500 to 1.09250 = 0.0075 = 75.0 pips
    expect(priceDiffToPips(0.0075, 'EUR/USD')).toBe(75.0);

    // USD/JPY: 154.20 to 155.05 = 0.85 = 85.0 pips
    expect(priceDiffToPips(0.85, 'USD/JPY')).toBe(85.0);

    // Fractional pips rounding to 1 decimal place
    expect(priceDiffToPips(0.001234, 'GBP/USD')).toBe(12.3);
  });

  it('formats prices with domain-accurate precision', () => {
    expect(formatPrice(1.08524, 'EUR/USD')).toBe('1.08524');
    expect(formatPrice(154.235, 'USD/JPY')).toBe('154.235');
    expect(formatPrice(NaN, 'EUR/USD')).toBe('—');
  });
});

describe('ADR (Average Daily Range) Calculations', () => {
  // Generate 25 synthetic completed daily candles for EUR/USD
  const mockCompletedDays: ForexCandle[] = Array.from({ length: 25 }, (_, i) => ({
    datetime: `2026-09-${String(25 - i).padStart(2, '0')}`,
    open: 1.0800,
    high: 1.0800 + 0.0070 + (i % 3) * 0.0010, // daily ranges: 70, 80, 90 pips
    low: 1.0800,
    close: 1.0850,
  }));

  it('calculates ADR(5), ADR(10), and ADR(20) using completed days only', () => {
    const adr5 = calculateADR(mockCompletedDays, 5, 'EUR/USD');
    const adr10 = calculateADR(mockCompletedDays, 10, 'EUR/USD');
    const adr20 = calculateADR(mockCompletedDays, 20, 'EUR/USD');

    expect(adr5).toBeDefined();
    expect(adr5).toBeGreaterThan(60);
    expect(adr5).toBeLessThan(100);

    expect(adr10).toBeDefined();
    expect(adr20).toBeDefined();
    expect(typeof adr20).toBe('number');
  });

  it('returns null and clearly distinguishes unavailable data when completed days are insufficient', () => {
    const only3Days = mockCompletedDays.slice(0, 3);

    // 5-period requested with only 3 days available -> must be null, not 0!
    expect(calculateADR(only3Days, 5, 'EUR/USD')).toBeNull();
    expect(calculateADR(only3Days, 10, 'EUR/USD')).toBeNull();
    expect(calculateADR(only3Days, 20, 'EUR/USD')).toBeNull();
  });

  it('correctly calculates JPY pair ADR', () => {
    const jpyCandles: ForexCandle[] = Array.from({ length: 20 }, (_, i) => ({
      datetime: `2026-09-${String(20 - i).padStart(2, '0')}`,
      open: 154.0,
      high: 155.2, // 1.2 move = 120 pips
      low: 154.0,
      close: 154.8,
    }));

    const adr5 = calculateADR(jpyCandles, 5, 'USD/JPY');
    expect(adr5).toBe(120.0);
  });
});

describe('Session Boundaries and Timezone Handling', () => {
  it('correctly identifies London and New York session status', () => {
    // 09:30 UTC Tuesday -> London active, NY not active
    const londonOnly = new Date('2026-10-13T09:30:00Z');
    const londonInfo = getCurrentSessionInfo(londonOnly);
    expect(londonInfo.activeSessions).toContain('London');
    expect(londonInfo.activeSessions).not.toContain('New York');
    expect(londonInfo.isLondonOrNyActive).toBe(true);

    // 14:30 UTC Tuesday -> London & NY Overlap active
    const overlapTime = new Date('2026-10-13T14:30:00Z');
    const overlapInfo = getCurrentSessionInfo(overlapTime);
    expect(overlapInfo.activeSessions).toContain('London');
    expect(overlapInfo.activeSessions).toContain('New York');
    expect(overlapInfo.description).toContain('Overlap');
    expect(overlapInfo.isLondonOrNyActive).toBe(true);

    // 03:00 UTC Tuesday -> Asian active
    const asianTime = new Date('2026-10-13T03:00:00Z');
    const asianInfo = getCurrentSessionInfo(asianTime);
    expect(asianInfo.activeSessions).toContain('Asian');
    expect(asianInfo.isLondonOrNyActive).toBe(false);

    // Saturday 12:00 UTC -> Market closed
    const weekendTime = new Date('2026-10-17T12:00:00Z');
    const weekendInfo = getCurrentSessionInfo(weekendTime);
    expect(weekendInfo.isLondonOrNyActive).toBe(false);
    expect(weekendInfo.description).toContain('Closed');
  });

  it('extracts Asian session High and Low from UTC 00:00-08:00 candles', () => {
    const intradayCandles: ForexCandle[] = [
      { datetime: '2026-10-14T02:00:00Z', open: 1.082, high: 1.0865, low: 1.0815, close: 1.085 },
      { datetime: '2026-10-14T05:00:00Z', open: 1.085, high: 1.087, low: 1.0805, close: 1.084 },
      // Candle outside Asian session (10:00 UTC London)
      { datetime: '2026-10-14T10:00:00Z', open: 1.084, high: 1.092, low: 1.079, close: 1.091 },
    ];

    const { asianHigh, asianLow } = getAsianSessionLevels(intradayCandles);
    expect(asianHigh).toBe(1.087);
    expect(asianLow).toBe(1.0805);
  });
});

describe('Liquidity Sweep and Institutional Bias Classification', () => {
  it('detects an Asian High liquidity sweep on M15', () => {
    const levels = {
      asianHigh: 1.0870,
      asianLow: 1.0810,
      pdh: 1.0890,
      pdl: 1.0780,
      pwh: null,
      pwl: null,
    };

    // M15 candle spiked to 1.0875 (> 1.0870) but closed back down at 1.0862
    const m15Candles: ForexCandle[] = [
      { datetime: '2026-10-14T09:15:00Z', open: 1.0860, high: 1.0875, low: 1.0855, close: 1.0862 },
    ];
    const h1Candles: ForexCandle[] = [];

    const sweep = detectLiquiditySweep(1.0862, m15Candles, h1Candles, levels);
    expect(sweep.status).toBe('Swept Asian High (M15)');
    expect(sweep.sweepType).toBe('BUY_SIDE');
    expect(sweep.level).toBe(1.0870);
  });

  it('detects a PDL (Previous Day Low) sweep on M15', () => {
    const levels = {
      asianHigh: 1.0870,
      asianLow: 1.0810,
      pdh: 1.0890,
      pdl: 1.0800,
      pwh: null,
      pwl: null,
    };

    // M15 candle spiked down to 1.0792 (< 1.0800) but closed back up at 1.0808
    const m15Candles: ForexCandle[] = [
      { datetime: '2026-10-14T13:30:00Z', open: 1.0810, high: 1.0815, low: 1.0792, close: 1.0808 },
    ];
    const h1Candles: ForexCandle[] = [];

    const sweep = detectLiquiditySweep(1.0808, m15Candles, h1Candles, levels);
    expect(sweep.status).toBe('Swept PDL (M15)');
    expect(sweep.sweepType).toBe('SELL_SIDE');
    expect(sweep.level).toBe(1.0800);
  });

  it('evaluates H1 structure as BULLISH when making Higher Highs and Higher Lows', () => {
    const bullishH1: ForexCandle[] = [
      { datetime: '2026-10-14T14:00:00Z', open: 1.086, high: 1.092, low: 1.085, close: 1.091 },
      { datetime: '2026-10-14T13:00:00Z', open: 1.084, high: 1.088, low: 1.083, close: 1.086 },
      { datetime: '2026-10-14T12:00:00Z', open: 1.081, high: 1.085, low: 1.080, close: 1.084 },
      { datetime: '2026-10-14T11:00:00Z', open: 1.078, high: 1.082, low: 1.077, close: 1.081 },
      { datetime: '2026-10-14T10:00:00Z', open: 1.075, high: 1.079, low: 1.074, close: 1.078 },
      { datetime: '2026-10-14T09:00:00Z', open: 1.072, high: 1.076, low: 1.071, close: 1.075 },
    ];

    expect(calculateH1Bias(bullishH1)).toBe('BULLISH');
  });

  it('evaluates H1 structure as BEARISH when making Lower Lows and Lower Highs', () => {
    const bearishH1: ForexCandle[] = [
      { datetime: '2026-10-14T14:00:00Z', open: 1.072, high: 1.074, low: 1.068, close: 1.069 },
      { datetime: '2026-10-14T13:00:00Z', open: 1.075, high: 1.077, low: 1.071, close: 1.072 },
      { datetime: '2026-10-14T12:00:00Z', open: 1.078, high: 1.080, low: 1.074, close: 1.075 },
      { datetime: '2026-10-14T11:00:00Z', open: 1.082, high: 1.084, low: 1.077, close: 1.078 },
      { datetime: '2026-10-14T10:00:00Z', open: 1.086, high: 1.088, low: 1.081, close: 1.082 },
      { datetime: '2026-10-14T09:00:00Z', open: 1.090, high: 1.092, low: 1.085, close: 1.086 },
    ];

    expect(calculateH1Bias(bearishH1)).toBe('BEARISH');
  });

  it('identifies M15 Bullish Rejection and synthesizes READY LONG final bias after sell-side sweep', () => {
    const sweep = {
      status: 'Swept Asian Low (M15)',
      level: 1.0810,
      timeframe: 'M15',
      sweepType: 'SELL_SIDE' as const,
    };

    const { finalBias, setupStatus, setupReason } = determineFinalBiasAndSetup(
      'EUR/USD',
      1.0825,
      'BULLISH',
      'BULLISH MSS',
      sweep,
      45.0,
      { asianHigh: 1.087, asianLow: 1.081, pdh: 1.089, pdl: 1.078 }
    );

    expect(finalBias).toBe('LONG');
    expect(setupStatus).toBe('READY');
    expect(setupReason).toContain('Swept Asian Low');
  });

  it('identifies MONITORING when daily range is exhausted (>= 90% ADR)', () => {
    const sweep = { status: 'None', level: null, timeframe: null, sweepType: 'NONE' as const };
    const { setupStatus, setupReason } = determineFinalBiasAndSetup(
      'EUR/USD',
      1.0850,
      'BULLISH',
      'NONE',
      sweep,
      94.2, // 94.2% ADR consumed
      { asianHigh: 1.087, asianLow: 1.081, pdh: 1.089, pdl: 1.078 }
    );

    expect(setupStatus).toBe('MONITORING');
    expect(setupReason).toContain('exhausted');
  });
});

describe('Data Freshness and Normalization', () => {
  it('correctly categorizes data freshness based on elapsed time', () => {
    const now = Date.now();
    const tenMinAgo = new Date(now - 10 * 60 * 1000).toISOString();
    const fortyMinAgo = new Date(now - 40 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(now - 120 * 60 * 1000).toISOString();

    expect(getDataFreshnessStatus(tenMinAgo)).toBe('LIVE');
    expect(getDataFreshnessStatus(fortyMinAgo)).toBe('STALE');
    expect(getDataFreshnessStatus(twoHoursAgo)).toBe('OUTDATED');
    expect(getDataFreshnessStatus(null)).toBe('UNAVAILABLE');
  });

  it('normalizes Twelve Data raw string values into valid numeric ForexCandle objects', () => {
    const rawTwelveDataValues = [
      { datetime: '2026-10-15 14:00:00', open: '1.0852', high: '1.0890', low: '1.0840', close: '1.0875', volume: '1420' },
      { datetime: '2026-10-15 13:00:00', open: 'invalid', high: 'NaN', low: '1.0800', close: '1.0850' }, // corrupted
    ];

    const normalized = normalizeTwelveDataCandles(rawTwelveDataValues);
    expect(normalized.length).toBe(1);
    expect(normalized[0].open).toBe(1.0852);
    expect(normalized[0].high).toBe(1.0890);
    expect(normalized[0].volume).toBe(1420);
  });

  it('safely handles empty candles without crashing', () => {
    const record = buildForexConfirmationRecord('EUR/USD', [], [], []);
    expect(record.pair).toBe('EUR/USD');
    expect(record.finalBias).toBe('INSUFFICIENT DATA');
    expect(record.setupStatus).toBe('INSUFFICIENT DATA');
    expect(record.dataFreshness).toBe('UNAVAILABLE');
    expect(record.deltaStatus).toBe('N/A — unavailable from source');
  });
});

describe('Forex Collection Lock and Fallback', () => {
  it('collectForexMarketData handles missing API key gracefully without clearing records', async () => {
    const originalKey = process.env.TWELVE_DATA_API_KEY;
    delete process.env.TWELVE_DATA_API_KEY;

    const { collectForexMarketData } = await import('../lib/forex/twelve-data-service');
    const result = await collectForexMarketData();

    expect(result.success).toBe(false);
    expect(result.message).toContain('TWELVE_DATA_API_KEY');
    expect(Array.isArray(result.records)).toBe(true);

    if (originalKey) {
      process.env.TWELVE_DATA_API_KEY = originalKey;
    }
  });
});

