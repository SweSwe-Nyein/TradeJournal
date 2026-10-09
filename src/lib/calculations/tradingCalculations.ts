import { roundToDecimals } from './rounding';

export type AssetClass = 'forex' | 'commodity' | 'index' | 'crypto' | 'stock';

export function getAssetClass(symbol: string): AssetClass {
  const sym = (symbol || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  if (!sym) return 'stock';
  if (['XAUUSD', 'XAGUSD', 'GOLD', 'SILVER'].includes(sym)) return 'commodity';
  if (['WTI', 'XTIUSD', 'USOIL', 'BRENT', 'CL'].includes(sym)) return 'commodity';
  if (
    ['US30', 'NAS100', 'SPX500', 'GER40', 'NQ', 'ES', 'YM', 'RTY', 'DAX', 'DOW'].includes(sym) ||
    sym.startsWith('NQ') ||
    sym.startsWith('ES')
  ) {
    return 'index';
  }
  if (['BTCUSD', 'ETHUSD', 'SOLUSD', 'BTC', 'ETH'].includes(sym)) return 'crypto';

  // Standard 6-character forex pairs composed of standard currencies
  const forexCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'SEK', 'NOK', 'SGD', 'HKD', 'ZAR', 'TRY', 'MXN', 'CNH'];
  if (sym.length === 6) {
    const base = sym.substring(0, 3);
    const quote = sym.substring(3, 6);
    if (forexCurrencies.includes(base) && forexCurrencies.includes(quote)) {
      return 'forex';
    }
  }

  return 'stock';
}

export function getPipSize(symbol: string): number {
  const sym = (symbol || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  const assetClass = getAssetClass(symbol);
  if (assetClass === 'forex') {
    if (sym.includes('JPY')) return 0.01;
    return 0.0001;
  }
  if (assetClass === 'commodity' && (sym === 'XAUUSD' || sym === 'GOLD')) return 0.1;
  return 1;
}

export function getPipValue(symbol: string, price: number, usdJpyRate: number = 158.0): number {
  const sym = (symbol || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  const assetClass = getAssetClass(symbol);

  if (assetClass === 'forex') {
    if (sym === 'USDJPY') return (0.01 / price) * 100000;
    if (sym.endsWith('JPY')) return (0.01 / usdJpyRate) * 100000; // Cross-JPY: Convert using USDJPY rate
    return 10; // Standard USD quote
  }
  
  if (assetClass === 'commodity') {
    if (sym === 'XAUUSD' || sym === 'GOLD') return 10; // $10 per pip (0.10 move per 100oz)
    return 1;
  }

  if (assetClass === 'index' || assetClass === 'stock' || assetClass === 'crypto') return 1;

  return 1;
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
