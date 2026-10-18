import {
  SUPPORTED_FOREX_PAIRS,
  type SupportedForexPair,
  type ForexCandle,
  type ForexConfirmationRecord,
  type ForexMarketConfirmationResponse,
} from './forex-types';
import {
  buildForexConfirmationRecord,
  getDataFreshnessStatus,
  getCurrentSessionInfo,
  normalizeTwelveDataCandles,
} from './forex-calculations';
import { createClient } from '../supabase/client';

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

interface CacheEntry {
  records: Record<SupportedForexPair, ForexConfirmationRecord>;
  lastUpdatedAt: string;
  dailyCandlesCache: Record<string, { candles: ForexCandle[]; dateKey: string }>;
}

const memoryCache: CacheEntry = {
  records: {} as Record<SupportedForexPair, ForexConfirmationRecord>,
  lastUpdatedAt: '',
  dailyCandlesCache: {},
};

let isCollectionRunning = false;
let collectionStartedAt = 0;
const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes max lock duration to prevent stuck locks

/**
 * Resolves the Twelve Data API Key from server-side environment variables.
 */
export function getTwelveDataApiKey(): string | null {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.TWELVE_DATA_API_KEY || null;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function fetchTimeSeriesBatch(
  symbols: SupportedForexPair[],
  interval: '1day' | '1h' | '15min',
  outputsize: number,
  apiKey: string,
  retries = 2
): Promise<Record<string, Array<Record<string, string>>>> {
  const symbolParam = symbols.join(',');
  const url = `${TWELVE_DATA_BASE_URL}/time_series?symbol=${encodeURIComponent(
    symbolParam
  )}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`;

  let attempt = 0;
  while (attempt <= retries) {
    attempt++;
    try {
      const res = await fetchWithTimeout(url);

      if (res.status === 429) {
        if (attempt <= retries) {
          await sleep(61000);
          continue;
        }
        throw new Error('Twelve Data API rate limit reached (HTTP 429)');
      }

      if (!res.ok) {
        throw new Error(`Twelve Data returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (data.status === 'error' || data.code === 429) {
        if (data.code === 429 && attempt <= retries) {
          await sleep(61000);
          continue;
        }
        throw new Error(data.message || `Twelve Data API error code ${data.code}`);
      }

      const results: Record<string, Array<Record<string, string>>> = {};

      if (symbols.length === 1) {
        const s = symbols[0];
        if (data.values && Array.isArray(data.values)) {
          results[s] = data.values;
        }
      } else {
        for (const s of symbols) {
          const item = data[s];
          if (item && item.values && Array.isArray(item.values)) {
            results[s] = item.values;
          }
        }
      }

      return results;
    } catch (err: unknown) {
      if (attempt > retries) {
        throw err;
      }
      await sleep(2000 * attempt);
    }
  }

  return {};
}

/**
 * Executes a full market data collection for all 8 supported Forex pairs.
 * Includes stale lock auto-recovery and safe try/finally lock release.
 * Never deletes or overwrites valid Supabase data with empty results on failure.
 */
export async function collectForexMarketData(
  options: { forceRefreshDaily?: boolean } = {}
): Promise<{
  success: boolean;
  records: ForexConfirmationRecord[];
  updatedCount: number;
  message: string;
}> {
  const now = Date.now();
  if (isCollectionRunning) {
    // Check if the lock is stale (> 2 minutes)
    if (now - collectionStartedAt > LOCK_TIMEOUT_MS) {
      console.warn('[TwiveDataService] Stale collection lock detected (> 2 min). Force clearing lock.');
      isCollectionRunning = false;
    } else {
      // If collection is genuinely running, fetch latest stored records from Supabase so frontend never gets empty pairs: []
      const latestStored = await getLatestMarketConfirmation();
      return {
        success: false,
        records: latestStored.pairs,
        updatedCount: 0,
        message: 'Collection already in progress',
      };
    }
  }

  const apiKey = getTwelveDataApiKey();
  if (!apiKey) {
    const latestStored = await getLatestMarketConfirmation();
    return {
      success: false,
      records: latestStored.pairs,
      updatedCount: 0,
      message: 'TWELVE_DATA_API_KEY environment variable is not configured',
    };
  }

  isCollectionRunning = true;
  collectionStartedAt = Date.now();

  try {
    const todayDateKey = new Date().toISOString().split('T')[0];
    const pairs = [...SUPPORTED_FOREX_PAIRS];
    const updatedRecords: ForexConfirmationRecord[] = [];

    // Step 1: Ensure Daily Candles
    const symbolsNeedingDaily = pairs.filter((p) => {
      const cached = memoryCache.dailyCandlesCache[p];
      return (
        options.forceRefreshDaily ||
        !cached ||
        cached.dateKey !== todayDateKey ||
        cached.candles.length < 20
      );
    });

    if (symbolsNeedingDaily.length > 0) {
      const chunks: SupportedForexPair[][] = [];
      for (let i = 0; i < symbolsNeedingDaily.length; i += 4) {
        chunks.push(symbolsNeedingDaily.slice(i, i + 4));
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (i > 0) {
          await sleep(3000);
        }
        try {
          const dailyBatch = await fetchTimeSeriesBatch(chunk, '1day', 26, apiKey);
          for (const [pair, rawValues] of Object.entries(dailyBatch)) {
            const candles = normalizeTwelveDataCandles(rawValues);
            if (candles.length > 0) {
              memoryCache.dailyCandlesCache[pair] = {
                candles,
                dateKey: todayDateKey,
              };
            }
          }
        } catch (dailyErr: unknown) {
          console.warn('Notice: Daily candle batch fetch issue:', dailyErr);
        }
      }
    }

    // Step 2: Fetch M15 Intraday Candles
    const m15Chunks: SupportedForexPair[][] = [];
    for (let i = 0; i < pairs.length; i += 4) {
      m15Chunks.push(pairs.slice(i, i + 4));
    }

    const allM15Data: Record<string, ForexCandle[]> = {};
    for (let i = 0; i < m15Chunks.length; i++) {
      const chunk = m15Chunks[i];
      if (i > 0) {
        await sleep(4000);
      }
      try {
        const m15Batch = await fetchTimeSeriesBatch(chunk, '15min', 48, apiKey);
        for (const [pair, rawValues] of Object.entries(m15Batch)) {
          allM15Data[pair] = normalizeTwelveDataCandles(rawValues);
        }
      } catch (m15Err: unknown) {
        console.warn('Notice: M15 candle batch fetch issue:', m15Err);
      }
    }

    // Step 3: Fetch H1 Intraday Candles
    const allH1Data: Record<string, ForexCandle[]> = {};
    const h1Chunks: SupportedForexPair[][] = [];
    for (let i = 0; i < pairs.length; i += 4) {
      h1Chunks.push(pairs.slice(i, i + 4));
    }

    for (let i = 0; i < h1Chunks.length; i++) {
      const chunk = h1Chunks[i];
      if (i > 0) {
        await sleep(3000);
      }
      try {
        const h1Batch = await fetchTimeSeriesBatch(chunk, '1h', 24, apiKey);
        for (const [pair, rawValues] of Object.entries(h1Batch)) {
          allH1Data[pair] = normalizeTwelveDataCandles(rawValues);
        }
      } catch (h1Err: unknown) {
        console.warn('Notice: H1 candle batch fetch issue:', h1Err);
      }
    }

    // Step 4: Build confirmation records for each pair
    for (const pair of pairs) {
      const dailyCandles =
        memoryCache.dailyCandlesCache[pair]?.candles || [];
      const m15Candles = allM15Data[pair] || [];
      const h1Candles = allH1Data[pair] || [];

      if (dailyCandles.length > 0 || m15Candles.length > 0) {
        const record = buildForexConfirmationRecord(
          pair,
          dailyCandles,
          m15Candles,
          h1Candles
        );
        memoryCache.records[pair] = record;
        updatedRecords.push(record);
      } else if (memoryCache.records[pair]) {
        const existing = memoryCache.records[pair];
        existing.dataFreshness = getDataFreshnessStatus(existing.lastUpdatedAt);
        updatedRecords.push(existing);
      }
    }

    // Step 5: Only persist if we successfully collected records. Never overwrite valid DB records with empty list.
    if (updatedRecords.length > 0) {
      memoryCache.lastUpdatedAt = new Date().toISOString();
      await persistRecordsToDatabase(updatedRecords);
    }

    const finalRecords =
      updatedRecords.length > 0
        ? updatedRecords
        : Object.values(memoryCache.records);

    return {
      success: finalRecords.length > 0,
      records: finalRecords,
      updatedCount: updatedRecords.length,
      message: `Successfully collected market confirmations for ${updatedRecords.length} pairs`,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown collection failure';
    const fallbackRecords = Object.values(memoryCache.records);
    return {
      success: false,
      records: fallbackRecords,
      updatedCount: 0,
      message,
    };
  } finally {
    isCollectionRunning = false;
    collectionStartedAt = 0;
  }
}

async function persistRecordsToDatabase(
  records: ForexConfirmationRecord[]
): Promise<void> {
  if (!records || records.length === 0) return;
  try {
    const supabase = createClient();
    const rows = records.map((r) => ({
      pair: r.pair,
      price: r.price,
      price_timestamp: r.priceTimestamp,
      adr_5: r.adr5,
      adr_10: r.adr10,
      adr_20: r.adr20,
      today_high: r.todayHigh,
      today_low: r.todayLow,
      today_range_pips: r.todayRangePips,
      adr_percentage: r.adrPercentage,
      pdh: r.pdh,
      pdl: r.pdl,
      pwh: r.pwh,
      pwl: r.pwl,
      asian_high: r.asianHigh,
      asian_low: r.asianLow,
      liquidity_sweep_status: r.liquiditySweepStatus,
      sweep_level: r.sweepLevel,
      sweep_timeframe: r.sweepTimeframe,
      h1_bias: r.h1Bias,
      m15_confirmation: r.m15Confirmation,
      final_bias: r.finalBias,
      setup_status: r.setupStatus,
      setup_reason: r.setupReason,
      data_freshness: r.dataFreshness,
      delta_status: r.deltaStatus,
      tick_volume: r.tickVolume,
      last_updated_at: r.lastUpdatedAt,
    }));

    const { error } = await supabase
      .from('forex_market_confirmation')
      .upsert(rows, { onConflict: 'pair' });

    if (error) {
      console.warn('Supabase market data sync notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase upsert exception caught:', err);
  }
}

/**
 * Retrieves latest stored confirmation records from Supabase independently of collection lock.
 */
export async function getLatestMarketConfirmation(): Promise<ForexMarketConfirmationResponse> {
  const sessionInfo = getCurrentSessionInfo();

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('forex_market_confirmation')
      .select('*')
      .order('pair');

    if (!error && data && data.length > 0) {
      const records: ForexConfirmationRecord[] = data.map((d: any) => ({
        pair: d.pair as SupportedForexPair,
        price: Number(d.price),
        priceTimestamp: d.price_timestamp,
        adr5: d.adr_5 !== null ? Number(d.adr_5) : null,
        adr10: d.adr_10 !== null ? Number(d.adr_10) : null,
        adr20: d.adr_20 !== null ? Number(d.adr_20) : null,
        todayHigh: Number(d.today_high),
        todayLow: Number(d.today_low),
        todayRangePips: Number(d.today_range_pips),
        adrPercentage: d.adr_percentage !== null ? Number(d.adr_percentage) : null,
        pdh: d.pdh !== null ? Number(d.pdh) : null,
        pdl: d.pdl !== null ? Number(d.pdl) : null,
        pwh: d.pwh !== null ? Number(d.pwh) : null,
        pwl: d.pwl !== null ? Number(d.pwl) : null,
        asianHigh: d.asian_high !== null ? Number(d.asian_high) : null,
        asianLow: d.asian_low !== null ? Number(d.asian_low) : null,
        liquiditySweepStatus: d.liquidity_sweep_status || 'None',
        sweepLevel: d.sweep_level !== null ? Number(d.sweep_level) : null,
        sweepTimeframe: d.sweep_timeframe || null,
        h1Bias: d.h1_bias || 'NEUTRAL',
        m15Confirmation: d.m15_confirmation || 'NONE',
        finalBias: d.final_bias || 'NEUTRAL',
        setupStatus: d.setup_status || 'NO SETUP',
        setupReason: d.setup_reason || '',
        dataFreshness: getDataFreshnessStatus(d.last_updated_at),
        deltaStatus: d.delta_status || 'N/A — unavailable from source',
        tickVolume: d.tick_volume !== null ? Number(d.tick_volume) : null,
        lastUpdatedAt: d.last_updated_at,
      }));

      for (const r of records) {
        memoryCache.records[r.pair] = r;
      }
      memoryCache.lastUpdatedAt =
        records[0]?.lastUpdatedAt || new Date().toISOString();

      const overallFreshness = getDataFreshnessStatus(
        memoryCache.lastUpdatedAt
      );

      return {
        pairs: records,
        lastUpdatedAt: memoryCache.lastUpdatedAt,
        dataFreshness: overallFreshness,
        activeSessions: sessionInfo.activeSessions,
        currentSessionDescription: sessionInfo.description,
        status: overallFreshness === 'LIVE' ? 'ok' : 'stale',
        source: 'Twelve Data',
        isCollecting: isCollectionRunning,
      };
    }
  } catch (err) {
    console.warn('Notice reading from Supabase:', err);
  }

  const cachedList = Object.values(memoryCache.records);
  const freshness = getDataFreshnessStatus(
    memoryCache.lastUpdatedAt || null
  );

  return {
    pairs: cachedList,
    lastUpdatedAt: memoryCache.lastUpdatedAt || null,
    dataFreshness: freshness,
    activeSessions: sessionInfo.activeSessions,
    currentSessionDescription: sessionInfo.description,
    status:
      cachedList.length > 0
        ? freshness === 'LIVE'
          ? 'ok'
          : 'stale'
        : 'no_data',
    source: 'Twelve Data',
    isCollecting: isCollectionRunning,
  };
}
