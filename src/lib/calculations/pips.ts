import type { TradeDirection } from '@/src/types/trade';

/**
 * Returns the standard pip size for a given trading symbol.
 * - JPY pairs: 0.01
 * - Gold / XAU: 0.1
 * - Crypto (BTC, ETH): 1.0
 * - Normal Forex pairs: 0.0001
 */
export function getPipSize(symbol: string): number {
  const upper = (symbol || '').trim().toUpperCase();
  if (!upper) return 0.0001;
  if (upper.includes('JPY') || upper.startsWith('USDJPY') || upper.endsWith('JPY')) {
    return 0.01;
  }
  if (upper.includes('XAU') || upper.includes('GOLD')) {
    return 0.1;
  }
  if (upper.includes('BTC') || upper.includes('ETH')) {
    return 1.0;
  }
  return 0.0001;
}

/**
 * Calculates absolute Stop Loss price from entry price, stop loss pips, and direction.
 */
export function calculateSlPrice(
  direction: TradeDirection,
  entryPrice: number,
  stopLossPips: number,
  symbol: string
): number | null {
  if (!Number.isFinite(entryPrice) || !Number.isFinite(stopLossPips) || stopLossPips < 0) {
    return null;
  }
  const pipSize = getPipSize(symbol);
  const diff = stopLossPips * pipSize;
  const price = direction === 'long' ? entryPrice - diff : entryPrice + diff;
  return Number(Math.max(0, price).toFixed(5));
}

/**
 * Calculates absolute Take Profit price from entry price, take profit pips, and direction.
 */
export function calculateTpPrice(
  direction: TradeDirection,
  entryPrice: number,
  takeProfitPips: number,
  symbol: string
): number | null {
  if (!Number.isFinite(entryPrice) || !Number.isFinite(takeProfitPips) || takeProfitPips < 0) {
    return null;
  }
  const pipSize = getPipSize(symbol);
  const diff = takeProfitPips * pipSize;
  const price = direction === 'long' ? entryPrice + diff : entryPrice - diff;
  return Number(Math.max(0, price).toFixed(5));
}

/**
 * Calculates pip distance from entry price to absolute price.
 */
export function calculatePipsFromPrices(
  entryPrice: number,
  targetPrice: number | null | undefined,
  symbol: string
): number | null {
  if (
    entryPrice === null ||
    entryPrice === undefined ||
    targetPrice === null ||
    targetPrice === undefined ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(targetPrice)
  ) {
    return null;
  }
  const pipSize = getPipSize(symbol);
  if (pipSize <= 0) return 0;
  const diff = Math.abs(targetPrice - entryPrice);
  const pips = diff / pipSize;
  return Number(pips.toFixed(1));
}
