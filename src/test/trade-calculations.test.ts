import { describe, it, expect } from 'vitest';
import {
  calculateGrossPnL,
  calculateNetPnL,
  calculateRMultiple,
  calculateTradeMetrics,
  roundToDecimals,
} from '@/src/lib/calculations/trades';

describe('Trade Calculation Engine', () => {
  describe('Long Trades', () => {
    it('calculates a long winning trade correctly', () => {
      // Bought 100 shares at $150, sold at $155
      const gross = calculateGrossPnL('long', 150, 155, 100);
      expect(gross).toBe(500);

      const net = calculateNetPnL(gross, 2, 1, 0);
      expect(net).toBe(497);

      const r = calculateRMultiple(net, 250); // Risked $250
      expect(r).toBe(1.99); // 497 / 250 = 1.988 rounded to 1.99
    });

    it('calculates a long losing trade correctly', () => {
      // Bought 50 shares at $200, sold at $190 (stopped out)
      const gross = calculateGrossPnL('long', 200, 190, 50);
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
      const gross = calculateGrossPnL('short', 18000, 17950, 2);
      expect(gross).toBe(100);

      const net = calculateNetPnL(gross, 8, 4, 0);
      expect(net).toBe(88);

      const r = calculateRMultiple(net, 50); // Risked 25 pts ($50)
      expect(r).toBe(1.76); // 88 / 50 = 1.76
    });

    it('calculates a short losing trade correctly', () => {
      // Shorted 10 shares at $100, covered at $110 (adverse move)
      const gross = calculateGrossPnL('short', 100, 110, 10);
      expect(gross).toBe(-100);

      const net = calculateNetPnL(gross, 1.5, 0.5, 0);
      expect(net).toBe(-102);

      const r = calculateRMultiple(net, 100);
      expect(r).toBe(-1.02);
    });
  });

  describe('Fees, Commission, and Swap Handling', () => {
    it('deducts fees correctly', () => {
      const gross = 1000;
      const net = calculateNetPnL(gross, 0, 15.25, 0);
      expect(net).toBe(984.75);
    });

    it('deducts commission correctly', () => {
      const gross = 1000;
      const net = calculateNetPnL(gross, 24.5, 0, 0);
      expect(net).toBe(975.5);
    });

    it('deducts swap (overnight financing) correctly', () => {
      // Negative swap cost
      const gross = 500;
      const net = calculateNetPnL(gross, 0, 0, 12.3);
      expect(net).toBe(487.7);
    });

    it('handles negative swap credit (positive earnings from carry)', () => {
      const gross = 500;
      const net = calculateNetPnL(gross, 0, 0, -5.0); // credit swap
      expect(net).toBe(505);
    });

    it('deducts combined commission, fees, and swap', () => {
      const gross = 2500;
      const net = calculateNetPnL(gross, 10, 5.5, 3.25);
      expect(net).toBe(2481.25);
    });
  });

  describe('R-Multiple Calculations & Safety', () => {
    it('calculates expected R multiple for target hit', () => {
      const r = calculateRMultiple(600, 200);
      expect(r).toBe(3);
    });

    it('returns null when risk amount is missing (null or undefined)', () => {
      expect(calculateRMultiple(500, null)).toBeNull();
      expect(calculateRMultiple(500, undefined)).toBeNull();
    });

    it('returns null when risk amount is zero (preventing division by zero / Infinity)', () => {
      const r = calculateRMultiple(500, 0);
      expect(r).toBeNull();
      expect(r).not.toBe(Infinity);
    });

    it('returns null when risk amount is negative', () => {
      expect(calculateRMultiple(500, -100)).toBeNull();
    });

    it('never produces NaN or Infinity for non-finite inputs', () => {
      expect(calculateRMultiple(NaN, 100)).toBeNull();
      expect(calculateRMultiple(100, NaN)).toBeNull();
      expect(calculateRMultiple(Infinity, 100)).toBeNull();
      expect(calculateRMultiple(100, Infinity)).toBeNull();
    });
  });

  describe('Unified calculateTradeMetrics & Edge Cases', () => {
    it('calculates open positions without exit price', () => {
      const metrics = calculateTradeMetrics({
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
      expect(calculateGrossPnL('long', 100, 105, 0)).toBe(0);
      expect(calculateGrossPnL('long', 0, 105, 10)).toBe(0);
      expect(calculateGrossPnL('long', NaN, 105, 10)).toBe(0);
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
