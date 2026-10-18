import type {
  SupportedForexPair,
  ForexCandle,
  StructureBias,
  BiasDirection,
  SetupStatus,
  DataFreshness,
  ForexConfirmationRecord,
} from './forex-types';

/**
 * Returns the exact pip size for a currency pair.
 * JPY pairs: 0.01 (e.g. USD/JPY 154.20)
 * Non-JPY pairs: 0.0001 (e.g. EUR/USD 1.0850)
 */
export function getPipSize(pair: string): number {
  return pair.toUpperCase().includes('JPY') ? 0.01 : 0.0001;
}

/**
 * Converts a raw price difference to pips.
 */
export function priceDiffToPips(diff: number, pair: string): number {
  const pipSize = getPipSize(pair);
  return Number((diff / pipSize).toFixed(1));
}

/**
 * Formats a currency pair price with standard precision.
 * JPY pairs: 3 decimal places (e.g. 154.235)
 * Non-JPY pairs: 5 decimal places (e.g. 1.08524)
 */
export function formatPrice(price: number, pair: string): string {
  if (isNaN(price) || price === null || price === undefined) return '—';
  const decimals = pair.toUpperCase().includes('JPY') ? 3 : 5;
  return price.toFixed(decimals);
}

/**
 * Calculates Average Daily Range (ADR) using COMPLETED trading days only.
 * Returns null if fewer than the required completed trading days are available.
 * Never fabricates zero values for missing data.
 *
 * @param completedDailyCandles Array of completed daily candles, sorted newest first (index 0 is previous completed day)
 * @param period Number of completed days to average (5, 10, or 20)
 * @param pair Forex pair string for pip conversion
 */
export function calculateADR(
  completedDailyCandles: ForexCandle[],
  period: 5 | 10 | 20,
  pair: string
): number | null {
  if (!completedDailyCandles || completedDailyCandles.length < period) {
    return null;
  }

  const pipSize = getPipSize(pair);
  let sumPips = 0;

  for (let i = 0; i < period; i++) {
    const candle = completedDailyCandles[i];
    const range = candle.high - candle.low;
    if (range < 0 || isNaN(range)) return null;
    sumPips += range / pipSize;
  }

  return Number((sumPips / period).toFixed(1));
}

/**
 * Extracts Previous Day High (PDH) and Low (PDL) from completed daily candles.
 * Index 0 must be the last completed trading day.
 */
export function getPreviousDayLevels(completedDailyCandles: ForexCandle[]): {
  pdh: number | null;
  pdl: number | null;
} {
  if (!completedDailyCandles || completedDailyCandles.length === 0) {
    return { pdh: null, pdl: null };
  }
  const prevDay = completedDailyCandles[0];
  return {
    pdh: Number(prevDay.high),
    pdl: Number(prevDay.low),
  };
}

/**
 * Extracts Previous Week High (PWH) and Low (PWL) from completed daily candles.
 * Groups historical daily candles by ISO week or calendar week and retrieves
 * the highest high and lowest low of the preceding calendar week.
 */
export function getPreviousWeekLevels(completedDailyCandles: ForexCandle[]): {
  pwh: number | null;
  pwl: number | null;
} {
  if (!completedDailyCandles || completedDailyCandles.length < 5) {
    return { pwh: null, pwl: null };
  }

  // Find candles that belong to the previous full trading week.
  // Standard forex week has 5 trading days (Mon-Fri).
  // If we have at least 6 daily candles, days [1..5] or [5..9] correspond to the prior week depending on day of week.
  const now = new Date();
  const currentDayOfWeek = now.getUTCDay(); // 0 Sun, 1 Mon ... 6 Sat

  // Skip the current week's completed days to reach previous week
  // On Monday (1), 0 completed days this week; on Tuesday (2), 1 completed day this week, etc.
  const daysCompletedThisWeek = currentDayOfWeek === 0 ? 5 : Math.max(0, currentDayOfWeek - 1);
  const startIndex = Math.min(daysCompletedThisWeek, completedDailyCandles.length - 1);
  const prevWeekCandles = completedDailyCandles.slice(startIndex, startIndex + 5);

  if (prevWeekCandles.length === 0) {
    return { pwh: null, pwl: null };
  }

  let high = -Infinity;
  let low = Infinity;

  for (const c of prevWeekCandles) {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }

  return {
    pwh: high === -Infinity ? null : Number(high),
    pwl: low === Infinity ? null : Number(low),
  };
}

/**
 * Computes Asian session High and Low from intraday (M15 / H1) candles.
 * Asian Session is defined in UTC from 00:00:00 to 08:00:00 (Tokyo trading window).
 */
export function getAsianSessionLevels(intradayCandles: ForexCandle[]): {
  asianHigh: number | null;
  asianLow: number | null;
} {
  if (!intradayCandles || intradayCandles.length === 0) {
    return { asianHigh: null, asianLow: null };
  }

  // Filter candles that fall between 00:00 and 08:00 UTC
  // We look for the most recent Asian session (either today's, or yesterday's if today's has not begun)
  const asianCandles: ForexCandle[] = [];

  for (const candle of intradayCandles) {
    const d = new Date(candle.datetime);
    if (isNaN(d.getTime())) continue;

    const utcHour = d.getUTCHours();
    if (utcHour >= 0 && utcHour < 8) {
      asianCandles.push(candle);
    }
  }

  if (asianCandles.length === 0) {
    return { asianHigh: null, asianLow: null };
  }

  // Get the date of the most recent candle in asianCandles
  const latestAsianDate = new Date(asianCandles[0].datetime).toISOString().split('T')[0];
  const targetDayAsianCandles = asianCandles.filter(
    (c) => new Date(c.datetime).toISOString().split('T')[0] === latestAsianDate
  );

  let high = -Infinity;
  let low = Infinity;

  for (const c of targetDayAsianCandles) {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }

  return {
    asianHigh: high === -Infinity ? null : Number(high),
    asianLow: low === Infinity ? null : Number(low),
  };
}

/**
 * Returns current session info and active market windows.
 * Asian: 00:00 - 08:00 UTC (Tokyo)
 * London: 08:00 - 16:30 UTC
 * New York: 13:00 - 21:00 UTC
 * London & New York Overlap: 13:00 - 16:30 UTC
 */
export function getCurrentSessionInfo(date: Date = new Date()): {
  activeSessions: string[];
  description: string;
  isCollectionActive: boolean;
  isLondonOrNyActive: boolean;
} {
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const dayOfWeek = date.getUTCDay(); // 0 = Sun, 6 = Sat

  // Weekend check: forex closes Friday 21:00 UTC, opens Sunday 21:00 UTC
  const isWeekend =
    dayOfWeek === 6 ||
    (dayOfWeek === 0 && utcHours < 21) ||
    (dayOfWeek === 5 && utcHours > 21.5);

  const activeSessions: string[] = [];

  if (!isWeekend) {
    if (utcHours >= 0 && utcHours < 8) {
      activeSessions.push('Asian');
    }
    if (utcHours >= 8 && utcHours < 16.5) {
      activeSessions.push('London');
    }
    if (utcHours >= 13 && utcHours < 21) {
      activeSessions.push('New York');
    }
  }

  let description = 'Market Closed (Weekend)';
  if (!isWeekend) {
    if (activeSessions.includes('London') && activeSessions.includes('New York')) {
      description = 'London & New York Overlap (Peak Volatility)';
    } else if (activeSessions.includes('London')) {
      description = 'London Session Active';
    } else if (activeSessions.includes('New York')) {
      description = 'New York Session Active';
    } else if (activeSessions.includes('Asian')) {
      description = 'Asian Session Active (Tokyo)';
    } else {
      description = 'Off-Peak / Inter-Session Bridge';
    }
  }

  // Collection is active during London and New York sessions including overlap
  const isLondonOrNyActive =
    !isWeekend &&
    utcHours >= 8 &&
    utcHours <= 21.5;

  return {
    activeSessions,
    description,
    isCollectionActive: isLondonOrNyActive,
    isLondonOrNyActive,
  };
}

/**
 * Identifies if a liquidity sweep has occurred.
 * A sweep occurs when price penetrates a key liquidity pool (Asian H/L, PDH/PDL, PWH/PWL)
 * but fails to close beyond it, exhibiting rejection or an immediate reversal.
 */
export function detectLiquiditySweep(
  currentPrice: number,
  m15Candles: ForexCandle[],
  h1Candles: ForexCandle[],
  levels: {
    asianHigh: number | null;
    asianLow: number | null;
    pdh: number | null;
    pdl: number | null;
    pwh: number | null;
    pwl: number | null;
  }
): {
  status: string;
  level: number | null;
  timeframe: string | null;
  sweepType: 'BUY_SIDE' | 'SELL_SIDE' | 'NONE';
} {
  const { asianHigh, asianLow, pdh, pdl, pwh, pwl } = levels;
  const recentM15 = m15Candles ? m15Candles.slice(0, 8) : [];
  const recentH1 = h1Candles ? h1Candles.slice(0, 4) : [];

  // Check M15 sweeps (most granular confirmation)
  // 1. Asian High sweep
  if (asianHigh !== null) {
    for (const c of recentM15) {
      if (c.high > asianHigh && c.close <= asianHigh) {
        return {
          status: 'Swept Asian High (M15)',
          level: asianHigh,
          timeframe: 'M15',
          sweepType: 'BUY_SIDE',
        };
      }
    }
  }

  // 2. Asian Low sweep
  if (asianLow !== null) {
    for (const c of recentM15) {
      if (c.low < asianLow && c.close >= asianLow) {
        return {
          status: 'Swept Asian Low (M15)',
          level: asianLow,
          timeframe: 'M15',
          sweepType: 'SELL_SIDE',
        };
      }
    }
  }

  // 3. PDH sweep
  if (pdh !== null) {
    for (const c of recentM15) {
      if (c.high > pdh && c.close <= pdh) {
        return {
          status: 'Swept PDH (M15)',
          level: pdh,
          timeframe: 'M15',
          sweepType: 'BUY_SIDE',
        };
      }
    }
  }

  // 4. PDL sweep
  if (pdl !== null) {
    for (const c of recentM15) {
      if (c.low < pdl && c.close >= pdl) {
        return {
          status: 'Swept PDL (M15)',
          level: pdl,
          timeframe: 'M15',
          sweepType: 'SELL_SIDE',
        };
      }
    }
  }

  // 5. PWH sweep
  if (pwh !== null) {
    for (const c of recentH1) {
      if (c.high > pwh && c.close <= pwh) {
        return {
          status: 'Swept PWH (H1)',
          level: pwh,
          timeframe: 'H1',
          sweepType: 'BUY_SIDE',
        };
      }
    }
  }

  // 6. PWL sweep
  if (pwl !== null) {
    for (const c of recentH1) {
      if (c.low < pwl && c.close >= pwl) {
        return {
          status: 'Swept PWL (H1)',
          level: pwl,
          timeframe: 'H1',
          sweepType: 'SELL_SIDE',
        };
      }
    }
  }

  return {
    status: 'None',
    level: null,
    timeframe: null,
    sweepType: 'NONE',
  };
}

/**
 * Calculates H1 Market Structure Bias from recent H1 candles.
 * Examines swing highs and swing lows over the last 12-24 H1 periods.
 */
export function calculateH1Bias(h1Candles: ForexCandle[]): StructureBias {
  if (!h1Candles || h1Candles.length < 5) {
    return 'INSUFFICIENT DATA';
  }

  // Use up to 16 recent H1 candles (newest at index 0)
  const window = h1Candles.slice(0, 16);
  const closes = window.map((c) => c.close);

  // Calculate short 8-period EMA and slope
  let ema = closes[closes.length - 1];
  const k = 2 / (8 + 1);
  for (let i = closes.length - 2; i >= 0; i--) {
    ema = closes[i] * k + ema * (1 - k);
  }

  const currentClose = closes[0];
  const oldClose = closes[Math.min(8, closes.length - 1)];

  // Swing high / low comparison
  const highestRecent = Math.max(...window.slice(0, 6).map((c) => c.high));
  const highestPast = Math.max(...window.slice(6, 12).map((c) => c.high));
  const lowestRecent = Math.min(...window.slice(0, 6).map((c) => c.low));
  const lowestPast = Math.min(...window.slice(6, 12).map((c) => c.low));

  if (highestRecent > highestPast && lowestRecent >= lowestPast && currentClose > ema) {
    return 'BULLISH';
  }

  if (lowestRecent < lowestPast && highestRecent <= highestPast && currentClose < ema) {
    return 'BEARISH';
  }

  // Trending momentum check
  if (currentClose > oldClose && currentClose > ema) {
    return 'BULLISH';
  }
  if (currentClose < oldClose && currentClose < ema) {
    return 'BEARISH';
  }

  return 'NEUTRAL';
}

/**
 * Identifies M15 structural confirmation.
 * Looks for Market Structure Shifts (MSS) or pinbar rejection wicks.
 */
export function calculateM15Confirmation(
  m15Candles: ForexCandle[],
  sweepType: 'BUY_SIDE' | 'SELL_SIDE' | 'NONE'
): string {
  if (!m15Candles || m15Candles.length < 4) {
    return 'NONE';
  }

  const c0 = m15Candles[0]; // most recent candle
  const c1 = m15Candles[1]; // previous completed M15
  const c2 = m15Candles[2];

  const c1Range = c1.high - c1.low;
  if (c1Range <= 0) return 'NONE';

  const c1LowerWick = Math.min(c1.open, c1.close) - c1.low;
  const c1UpperWick = c1.high - Math.max(c1.open, c1.close);

  // Bullish rejection pinbar (lower wick >= 50% of range)
  if (c1LowerWick / c1Range >= 0.5 && c0.close > c1.low) {
    return 'BULLISH REJECTION';
  }

  // Bearish rejection pinbar (upper wick >= 50% of range)
  if (c1UpperWick / c1Range >= 0.5 && c0.close < c1.high) {
    return 'BEARISH REJECTION';
  }

  // Bullish Market Structure Shift (MSS):
  // If price swept sell-side liquidity or broke above the swing high of c2
  if (c0.close > Math.max(c1.high, c2.high) && c0.close > c0.open) {
    return 'BULLISH MSS';
  }

  // Bearish Market Structure Shift (MSS):
  // If price swept buy-side liquidity or broke below the swing low of c2
  if (c0.close < Math.min(c1.low, c2.low) && c0.close < c0.open) {
    return 'BEARISH MSS';
  }

  // If sell-side sweep occurred, look for bullish displacement
  if (sweepType === 'SELL_SIDE' && c0.close > c0.open) {
    return 'BULLISH MSS';
  }

  // If buy-side sweep occurred, look for bearish displacement
  if (sweepType === 'BUY_SIDE' && c0.close < c0.open) {
    return 'BEARISH MSS';
  }

  return 'NONE';
}

/**
 * Synthesizes final bias, setup status, and human-readable setup reason.
 */
export function determineFinalBiasAndSetup(
  pair: string,
  price: number,
  h1Bias: StructureBias,
  m15Confirmation: string,
  sweep: {
    status: string;
    level: number | null;
    timeframe: string | null;
    sweepType: 'BUY_SIDE' | 'SELL_SIDE' | 'NONE';
  },
  adrPercentage: number | null,
  levels: {
    asianHigh: number | null;
    asianLow: number | null;
    pdh: number | null;
    pdl: number | null;
  }
): {
  finalBias: BiasDirection;
  setupStatus: SetupStatus;
  setupReason: string;
} {
  if (h1Bias === 'INSUFFICIENT DATA') {
    return {
      finalBias: 'INSUFFICIENT DATA',
      setupStatus: 'INSUFFICIENT DATA',
      setupReason: 'Awaiting sufficient candle history from provider',
    };
  }

  const isBullishM15 =
    m15Confirmation === 'BULLISH MSS' || m15Confirmation === 'BULLISH REJECTION';
  const isBearishM15 =
    m15Confirmation === 'BEARISH MSS' || m15Confirmation === 'BEARISH REJECTION';

  // High probability setups: Liquidity Sweep + Confirmatory M15 Shift
  if (sweep.sweepType === 'SELL_SIDE' && isBullishM15) {
    return {
      finalBias: 'LONG',
      setupStatus: 'READY',
      setupReason: `${sweep.status} + ${m15Confirmation} confluence`,
    };
  }

  if (sweep.sweepType === 'BUY_SIDE' && isBearishM15) {
    return {
      finalBias: 'SHORT',
      setupStatus: 'READY',
      setupReason: `${sweep.status} + ${m15Confirmation} confluence`,
    };
  }

  // Trend Continuation setups: H1 Bias + M15 Alignment
  if (h1Bias === 'BULLISH' && isBullishM15) {
    return {
      finalBias: 'LONG',
      setupStatus: 'READY',
      setupReason: `H1 Bullish Structure + ${m15Confirmation}`,
    };
  }

  if (h1Bias === 'BEARISH' && isBearishM15) {
    return {
      finalBias: 'SHORT',
      setupStatus: 'READY',
      setupReason: `H1 Bearish Structure + ${m15Confirmation}`,
    };
  }

  // Monitoring states:
  // Sweep occurred but no M15 confirmation yet
  if (sweep.sweepType === 'SELL_SIDE') {
    return {
      finalBias: 'LONG',
      setupStatus: 'MONITORING',
      setupReason: `${sweep.status}; monitoring for M15 shift`,
    };
  }

  if (sweep.sweepType === 'BUY_SIDE') {
    return {
      finalBias: 'SHORT',
      setupStatus: 'MONITORING',
      setupReason: `${sweep.status}; monitoring for M15 shift`,
    };
  }

  // Range Exhaustion monitoring
  if (adrPercentage !== null && adrPercentage >= 90) {
    return {
      finalBias: 'NEUTRAL',
      setupStatus: 'MONITORING',
      setupReason: `Daily range exhausted (${adrPercentage.toFixed(0)}% ADR(20) consumed)`,
    };
  }

  // Approaching key liquidity level
  const pipSize = getPipSize(pair);
  if (levels.asianHigh !== null && levels.asianHigh - price > 0 && (levels.asianHigh - price) / pipSize <= 10) {
    return {
      finalBias: 'NEUTRAL',
      setupStatus: 'MONITORING',
      setupReason: 'Approaching Asian High liquidity (< 10 pips)',
    };
  }
  if (levels.asianLow !== null && price - levels.asianLow > 0 && (price - levels.asianLow) / pipSize <= 10) {
    return {
      finalBias: 'NEUTRAL',
      setupStatus: 'MONITORING',
      setupReason: 'Approaching Asian Low liquidity (< 10 pips)',
    };
  }

  // Default No Setup / Neutral
  return {
    finalBias: 'NEUTRAL',
    setupStatus: 'NO SETUP',
    setupReason: h1Bias === 'NEUTRAL' ? 'Range bound / Consolidating' : `H1 ${h1Bias}; awaiting trigger`,
  };
}

/**
 * Computes data freshness status based on the last successful update timestamp.
 */
export function getDataFreshnessStatus(lastUpdatedTimestamp: string | null): DataFreshness {
  if (!lastUpdatedTimestamp) return 'UNAVAILABLE';

  const updateTime = new Date(lastUpdatedTimestamp).getTime();
  if (isNaN(updateTime)) return 'UNAVAILABLE';

  const elapsedMinutes = (Date.now() - updateTime) / (1000 * 60);

  if (elapsedMinutes <= 20) return 'LIVE';
  if (elapsedMinutes <= 60) return 'STALE';
  return 'OUTDATED';
}

/**
 * Converts Twelve Data raw candles to standard ForexCandle objects.
 */
export function normalizeTwelveDataCandles(rawValues: Array<Record<string, string | undefined>>): ForexCandle[] {
  if (!Array.isArray(rawValues)) return [];

  return rawValues
    .map((v) => ({
      datetime: v.datetime || '',
      open: parseFloat(v.open || ''),
      high: parseFloat(v.high || ''),
      low: parseFloat(v.low || ''),
      close: parseFloat(v.close || ''),
      volume: v.volume ? parseFloat(v.volume) : undefined,
    }))
    .filter(
      (c) =>
        Boolean(c.datetime) &&
        !isNaN(c.open) &&
        !isNaN(c.high) &&
        !isNaN(c.low) &&
        !isNaN(c.close)
    );
}

/**
 * Builds the complete confirmation record for a single pair given daily and intraday candles.
 */
export function buildForexConfirmationRecord(
  pair: SupportedForexPair,
  dailyCandles: ForexCandle[],
  m15Candles: ForexCandle[],
  h1Candles: ForexCandle[],
  providerTimestamp?: string
): ForexConfirmationRecord {
  // If no candles are available at all
  if (!dailyCandles || dailyCandles.length === 0 || !m15Candles || m15Candles.length === 0) {
    const nowIso = new Date().toISOString();
    return {
      pair,
      price: 0,
      priceTimestamp: nowIso,
      adr5: null,
      adr10: null,
      adr20: null,
      todayHigh: 0,
      todayLow: 0,
      todayRangePips: 0,
      adrPercentage: null,
      pdh: null,
      pdl: null,
      pwh: null,
      pwl: null,
      asianHigh: null,
      asianLow: null,
      liquiditySweepStatus: 'None',
      sweepLevel: null,
      sweepTimeframe: null,
      h1Bias: 'INSUFFICIENT DATA',
      m15Confirmation: 'NONE',
      finalBias: 'INSUFFICIENT DATA',
      setupStatus: 'INSUFFICIENT DATA',
      setupReason: 'Awaiting candle data from Twelve Data',
      dataFreshness: 'UNAVAILABLE',
      deltaStatus: 'N/A — unavailable from source',
      tickVolume: null,
      lastUpdatedAt: nowIso,
    };
  }

  // Daily candles: index 0 is currently in-progress day, index 1..N are completed historical days
  const currentDayCandle = dailyCandles[0];
  const completedDaily = dailyCandles.slice(1);

  // Latest intraday candle
  const latestM15 = m15Candles[0];
  const currentPrice = latestM15 ? latestM15.close : currentDayCandle.close;
  const priceTimestamp = providerTimestamp || (latestM15 ? latestM15.datetime : currentDayCandle.datetime);

  // Today's high and low from current day candle
  const todayHigh = currentDayCandle.high;
  const todayLow = currentDayCandle.low;
  const todayRangePips = priceDiffToPips(todayHigh - todayLow, pair);

  // ADR calculations on completed days
  const adr5 = calculateADR(completedDaily, 5, pair);
  const adr10 = calculateADR(completedDaily, 10, pair);
  const adr20 = calculateADR(completedDaily, 20, pair);

  // % ADR(20)
  const adrPercentage =
    adr20 !== null && adr20 > 0
      ? Number(((todayRangePips / adr20) * 100).toFixed(1))
      : null;

  // Previous Day Levels
  const { pdh, pdl } = getPreviousDayLevels(completedDaily);

  // Previous Week Levels
  const { pwh, pwl } = getPreviousWeekLevels(completedDaily);

  // Asian Session Levels
  const { asianHigh, asianLow } = getAsianSessionLevels(m15Candles);

  // Liquidity Sweep Detection
  const sweep = detectLiquiditySweep(currentPrice, m15Candles, h1Candles, {
    asianHigh,
    asianLow,
    pdh,
    pdl,
    pwh,
    pwl,
  });

  // H1 Structure Bias
  const h1Bias = calculateH1Bias(h1Candles);

  // M15 Confirmation
  const m15Confirmation = calculateM15Confirmation(m15Candles, sweep.sweepType);

  // Final Bias & Setup
  const { finalBias, setupStatus, setupReason } = determineFinalBiasAndSetup(
    pair,
    currentPrice,
    h1Bias,
    m15Confirmation,
    sweep,
    adrPercentage,
    { asianHigh, asianLow, pdh, pdl }
  );

  const nowIso = new Date().toISOString();

  return {
    pair,
    price: currentPrice,
    priceTimestamp,
    adr5,
    adr10,
    adr20,
    todayHigh,
    todayLow,
    todayRangePips,
    adrPercentage,
    pdh,
    pdl,
    pwh,
    pwl,
    asianHigh,
    asianLow,
    liquiditySweepStatus: sweep.status,
    sweepLevel: sweep.level,
    sweepTimeframe: sweep.timeframe,
    h1Bias,
    m15Confirmation,
    finalBias,
    setupStatus,
    setupReason,
    dataFreshness: 'LIVE',
    deltaStatus: 'N/A — unavailable from source',
    tickVolume: latestM15?.volume ?? null,
    lastUpdatedAt: nowIso,
  };
}
