import { describe, it, expect } from 'vitest';
import { getPipSize, calculateSlPrice, calculateTpPrice, calculatePipsFromPrices } from '@/src/lib/calculations/pips';
import { formatTime24 } from '@/src/lib/formatting/date';
import { calculateRMultiple, calculateNetPnL } from '@/src/lib/calculations/trades';

describe('Trading Enhancements & Calculations', () => {
  describe('Pip Calculations & Pip Size', () => {
    it('identifies correct pip size for symbols', () => {
      expect(getPipSize('EURUSD')).toBe(0.0001);
      expect(getPipSize('GBPUSD')).toBe(0.0001);
      expect(getPipSize('USDJPY')).toBe(0.01);
      expect(getPipSize('EURJPY')).toBe(0.01);
      expect(getPipSize('XAUUSD')).toBe(0.1);
      expect(getPipSize('BTCUSD')).toBe(1.0);
    });

    it('calculates SL and TP prices for EURUSD long', () => {
      const sl = calculateSlPrice('long', 1.16500, 20, 'EURUSD');
      const tp = calculateTpPrice('long', 1.16500, 30, 'EURUSD');
      expect(sl).toBe(1.16300);
      expect(tp).toBe(1.16800);
    });

    it('calculates SL and TP prices for EURUSD short', () => {
      const sl = calculateSlPrice('short', 1.16500, 20, 'EURUSD');
      const tp = calculateTpPrice('short', 1.16500, 30, 'EURUSD');
      expect(sl).toBe(1.16700);
      expect(tp).toBe(1.16200);
    });

    it('calculates SL and TP prices for USDJPY long', () => {
      const sl = calculateSlPrice('long', 150.50, 25, 'USDJPY');
      const tp = calculateTpPrice('long', 150.50, 50, 'USDJPY');
      expect(sl).toBe(150.25);
      expect(tp).toBe(151.00);
    });

    it('calculates pips from prices correctly', () => {
      const pips = calculatePipsFromPrices(1.16500, 1.16300, 'EURUSD');
      expect(pips).toBe(20);
    });
  });

  describe('Planned Risk & Percentage Sync', () => {
    it('calculates percentage from dollar risk on $10,000 account', () => {
      const balance = 10000;
      const riskAmount = 100;
      const riskPct = (riskAmount / balance) * 100;
      expect(riskPct).toBe(1);
    });

    it('calculates dollar risk from percentage on $10,000 account', () => {
      const balance = 10000;
      const riskPct = 1.0;
      const riskAmount = balance * (riskPct / 100);
      expect(riskAmount).toBe(100);
    });

    it('calculates R multiple correctly', () => {
      const netPnL = 235;
      const riskAmount = 100;
      const r = calculateRMultiple(netPnL, riskAmount);
      expect(r).toBe(2.35);
    });

    it('handles zero or missing risk amount without NaN or Infinity', () => {
      expect(calculateRMultiple(235, 0)).toBeNull();
      expect(calculateRMultiple(235, null)).toBeNull();
      expect(calculateRMultiple(235, undefined)).toBeNull();
    });
  });

  describe('24-Hour Time Formatting', () => {
    it('formats time in 24-hour format (HH:mm) without AM/PM', () => {
      const date = new Date('2026-10-08T13:45:00Z');
      const formatted = formatTime24(date, 'UTC');
      expect(formatted).toMatch(/13:45/);
    });
  });

  describe('P&L without Swap/Fees', () => {
    it('calculates Net P&L correctly as Gross P&L minus Commission', () => {
      const gross = 500;
      const commission = 4.50;
      const net = calculateNetPnL(gross, commission);
      expect(net).toBe(495.50);
    });
  });
});
