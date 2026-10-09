import { roundToDecimals } from './rounding';

export type AssetClass = 'forex' | 'commodity' | 'index' | 'crypto' | 'stock';

export function getAssetClass(symbol: string): AssetClass {
  const sym = symbol.toUpperCase();
  if (['XAUUSD', 'XAGUSD'].includes(sym)) return 'commodity';
  if (['WTI', 'XTIUSD'].includes(sym)) return 'commodity';
  if (['US30', 'NAS100', 'SPX500', 'GER40'].includes(sym)) return 'index';
  if (['BTCUSD', 'ETHUSD'].includes(sym)) return 'crypto';
  if (['AAPL', 'TSLA', 'AMZN', 'GOOGL', 'MSFT'].includes(sym)) return 'stock';
  return 'forex';
}

export function getPipSize(symbol: string): number {
  const sym = symbol.toUpperCase();
  if (sym.includes('JPY')) return 0.01;
  const assetClass = getAssetClass(symbol);
  if (assetClass === 'commodity' && sym === 'XAUUSD') return 0.1;
  if (assetClass === 'index' || assetClass === 'stock') return 1;
  return 0.0001;
}

export function getPipValue(symbol: string, price: number, usdJpyRate: number = 158.0): number {
  const sym = symbol.toUpperCase();
  const assetClass = getAssetClass(symbol);

  if (assetClass === 'forex') {
    if (sym === 'USDJPY') return (0.01 / price) * 100000;
    if (sym.endsWith('JPY')) return (0.01 / usdJpyRate) * 100000; // Cross-JPY: Convert using USDJPY rate
    return 10; // Standard USD quote
  }
  
  if (assetClass === 'commodity') {
    if (sym === 'XAUUSD') return 10; // $10 per pip
    if (['WTI', 'XTIUSD'].includes(sym)) return 10; // Based on $1/bbl
  }

  if (assetClass === 'index' || assetClass === 'stock' || assetClass === 'crypto') return 1;

  return 10; // Default fallback
}

export function calculateGrossPnL(
  symbol: string,
  direction: 'long' | 'short',
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  usdJpyRate?: number
): number {
  const pipSize = getPipSize(symbol);
  // Use provided rate or fallback to 158.0
  const rate = usdJpyRate || 158.0;
  const pipValue = getPipValue(symbol, exitPrice, rate);

  const priceDelta = direction === 'long' ? exitPrice - entryPrice : entryPrice - exitPrice;
  const pipsGained = priceDelta / pipSize;
  const grossPL = pipsGained * quantity * pipValue;
  
  return roundToDecimals(grossPL, 2);
}

export function calculateNetPnL(
  grossPL: number,
  commission: number,
  fees: number,
  swap: number
): number {
  return roundToDecimals(grossPL - commission - fees - swap, 2);
}

export function calculateRMultiple(
  netPL: number,
  riskAmount: number
): number | null {
  if (riskAmount <= 0) return null;
  return roundToDecimals(netPL / riskAmount, 2);
}
