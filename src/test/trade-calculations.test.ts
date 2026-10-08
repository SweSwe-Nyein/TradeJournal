import { describe, it, expect } from 'vitest';
import {
  calculateGrossPnL,
  calculateNetPnL,
  calculateRMultiple,
  calculateTradeMetrics,
} from '@/src/lib/calculations/trades';
import { roundToDecimals } from '@/src/lib/calculations/rounding';

describe('Trade Calculation Engine', () => {
  describe('Forex Calculations (USDJPY)', () => {
    it('calculates USDJPY correctly with standard lots', () => {
       // Long 19 lots = 1,900,000 units.
       // 158.222 to 158.294 (7.2 pips)
       // Expected: 7.2 pips * 19 lots * ((0.01 / 158.294) * 100,000)
       // PipValue = $6.317
       // Gross = 7.2 * 19 * 6.317 = $864.19
       const metrics = calculateTradeMetrics({
         symbol: 'USDJPY',
         direction: 'long',
         entry_price: 158.222,
         exit_price: 158.294,
         quantity: 19,
         commission: 0,
       });

       expect(metrics.gross_pnl).toBeCloseTo(864.19, 0);
    });
  });

  describe('Long Trades', () => {
    it('calculates a long winning trade correctly', () => {
      // Bought 100 shares at $150, sold at $155
      const gross = calculateGrossPnL('AAPL', 'long', 150, 155, 100);
      expect(gross).toBe(500);

      const net = calculateNetPnL(gross, 2, 1, 0);
      expect(net).toBe(497);

      const r = calculateRMultiple(net, 250); // Risked $250
      expect(r).toBe(1.99); // 497 / 250 = 1.988 rounded to 1.99
    });

    it('calculates a long losing trade correctly', () => {
      // Bought 50 shares at $200, sold at $190 (stopped out)
      const gross = calculateGrossPnL('AAPL', 'long', 200, 190, 50);
      expect(gross).toBe(-500);

      const net = calculateNetPnL(gross, 5, 2.5, 0);
      expect(net).toBe(-507.5);

      const r = calculateRMultiple(net, 500); // Risked $500
      expect(r).toBe(-1.02); // -507.5 / 500 = -1.015 rounded to -1.02
    });
  });

  describe('Short Trades', () => {
    it('calculates a short winning trade correctly', () => {
      // Shorted 2 futures contracts at 18000, covered at 17950 (50 pts profit per contract)
      const gross = calculateGrossPnL('AAPL', 'short', 18000, 17950, 2);
      expect(gross).toBe(100);

      const net = calculateNetPnL(gross, 8, 4, 0);
      expect(net).toBe(88);

      const r = calculateRMultiple(net, 50); // Risked 25 pts ($50)
      expect(r).toBe(1.76); // 88 / 50 = 1.76
    });

    it('calculates a short losing trade correctly', () => {
      // Shorted 10 shares at $100, covered at $110 (adverse move)
      const gross = calculateGrossPnL('AAPL', 'short', 100, 110, 10);
      expect(gross).toBe(-100);

      const net = calculateNetPnL(gross, 1.5, 0.5, 0);
      expect(net).toBe(-102);

      const r = calculateRMultiple(net, 100);
      expect(r).toBe(-1.02);
    });
  });

  // ... (fees, R-Multiple tests) ...
  // Unified calculateTradeMetrics & Edge Cases
  describe('Unified calculateTradeMetrics & Edge Cases', () => {
    it('calculates open positions without exit price', () => {
      const metrics = calculateTradeMetrics({
        symbol: 'AAPL',
        direction: 'long',
        entry_price: 100,
        exit_price: null,
        quantity: 10,
        commission: 2,
        fees: 1,
      });

      expect(metrics.gross_pnl).toBe(0);
      expect(metrics.net_pnl).toBe(-3); // commission + fees paid upfront
      expect(metrics.r_multiple).toBeNull();
    });

    it('handles zero quantity or invalid entry price gracefully', () => {
      expect(calculateGrossPnL('AAPL', 'long', 100, 105, 0)).toBe(0);
      expect(calculateGrossPnL('AAPL', 'long', 0, 105, 10)).toBe(0);
      expect(calculateGrossPnL('AAPL', 'long', NaN, 105, 10)).toBe(0);
    });

    it('preserves decimal accuracy with roundToDecimals', () => {
      // 0.1 + 0.2 floating point anomaly
      expect(roundToDecimals(0.1 + 0.2, 2)).toBe(0.3);
      expect(roundToDecimals(1234.56789, 4)).toBe(1234.5679);
      expect(roundToDecimals(NaN, 2)).toBe(0);
      expect(roundToDecimals(Infinity, 2)).toBe(0);
    });
  });
});
