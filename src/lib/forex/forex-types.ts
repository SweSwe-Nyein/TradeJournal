export const SUPPORTED_FOREX_PAIRS = [
  'AUD/USD',
  'NZD/USD',
  'GBP/USD',
  'USD/JPY',
  'AUD/JPY',
  'EUR/USD',
  'GBP/JPY',
  'NZD/JPY',
] as const;

export type SupportedForexPair = typeof SUPPORTED_FOREX_PAIRS[number];

export type BiasDirection = 'LONG' | 'SHORT' | 'NEUTRAL' | 'INSUFFICIENT DATA';
export type StructureBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'INSUFFICIENT DATA';
export type SetupStatus = 'READY' | 'MONITORING' | 'NO SETUP' | 'INSUFFICIENT DATA';
export type DataFreshness = 'LIVE' | 'STALE' | 'OUTDATED' | 'UNAVAILABLE';

export interface ForexCandle {
  datetime: string; // ISO string or Twelve Data formatted YYYY-MM-DD HH:mm:ss
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ForexSessionWindow {
  name: 'Asian' | 'London' | 'New York';
  displayName: string;
  startUtcHour: number;
  endUtcHour: number;
  timezone: string;
}

export interface ForexConfirmationRecord {
  pair: SupportedForexPair;
  price: number;
  priceTimestamp: string;
  adr5: number | null;
  adr10: number | null;
  adr20: number | null;
  todayHigh: number;
  todayLow: number;
  todayRangePips: number;
  adrPercentage: number | null;
  pdh: number | null;
  pdl: number | null;
  pwh: number | null;
  pwl: number | null;
  asianHigh: number | null;
  asianLow: number | null;
  liquiditySweepStatus: string;
  sweepLevel: number | null;
  sweepTimeframe: string | null;
  h1Bias: StructureBias;
  m15Confirmation: string;
  finalBias: BiasDirection;
  setupStatus: SetupStatus;
  setupReason: string;
  dataFreshness: DataFreshness;
  deltaStatus: string;
  tickVolume: number | null;
  lastUpdatedAt: string;
  rawMeta?: Record<string, unknown> | null;
}

export interface ForexMarketConfirmationResponse {
  pairs: ForexConfirmationRecord[];
  lastUpdatedAt: string | null;
  dataFreshness: DataFreshness;
  activeSessions: string[];
  currentSessionDescription: string;
  status: 'ok' | 'stale' | 'no_data' | 'rate_limited' | 'error';
  source: string;
  message?: string;
  isCollecting?: boolean;
}
