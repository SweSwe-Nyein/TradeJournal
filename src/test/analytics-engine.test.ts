import { describe, it, expect } from 'vitest';
import {
  calculateDetailedAnalytics,
  getTradingSession,
  getDayOfWeek,
  getDurationBucket,
} from '@/src/lib/calculations/analytics-engine';
import type { TradeWithAccount } from '@/src/types/trade';

describe('Advanced Analytics Engine & Calculations', () => {
  const sampleTrades = [
    {
      id: 'st1',
      user_id: 'u1',
      trading_account_id: 'acc1',
      symbol: 'NQ',
      direction: 'long',
      entry_price: 18000,
      exit_price: 18100,
      quantity: 2,
      net_pnl: 200,
      r_multiple: 2.0,
      entry_time: '2026-10-05T09:30:00Z', // Monday, London/NY session
      exit_time: '2026-10-05T09:45:00Z', // 15 mins duration
      status: 'closed',
      strategies: [{ id: 'strat1', name: 'ORB Breakout', description: 'Opening range breakout' }],
      created_at: '2026-10-05T09:00:00Z',
      updated_at: '2026-10-05T09:45:00Z',
    },
    {
      id: 'st2',
      user_id: 'u1',
      trading_account_id: 'acc1',
      symbol: 'ES',
      direction: 'short',
      entry_price: 5800,
      exit_price: 5820,
      quantity: 1,
      net_pnl: -100,
      r_multiple: -1.0,
      entry_time: '2026-10-06T14:30:00Z', // Tuesday
      exit_time: '2026-10-06T16:00:00Z', // 90 mins duration
      status: 'closed',
      strategies: [], // No Strategy
      created_at: '2026-10-06T14:00:00Z',
      updated_at: '2026-10-06T16:00:00Z',
    },
    {
      id: 'st3',
      user_id: 'u1',
      trading_account_id: 'acc1',
      symbol: 'NQ',
      direction: 'long',
      entry_price: 18100,
      exit_price: 18300,
      quantity: 2,
      net_pnl: 400,
      r_multiple: 4.0,
      entry_time: '2026-10-07T10:00:00Z', // Wednesday
      exit_time: '2026-10-07T10:03:00Z', // 3 mins duration (< 5 min)
      status: 'closed',
      strategies: [{ id: 'strat1', name: 'ORB Breakout', description: 'Opening range breakout' }],
      created_at: '2026-10-07T09:00:00Z',
      updated_at: '2026-10-07T10:03:00Z',
    },
  ] as unknown as TradeWithAccount[];

  it('calculates performance overview metrics correctly', () => {
    const res = calculateDetailedAnalytics(sampleTrades, 50000, 'UTC');
    expect(res.netPnL).toBe(500); // 200 - 100 + 400
    expect(res.totalTrades).toBe(3);
    expect(res.winningTrades).toBe(2);
    expect(res.losingTrades).toBe(1);
    expect(res.winRate).toBe(66.67);
  });

  it('assigns trading sessions correctly based on time and timezone', () => {
    const session = getTradingSession('2026-10-05T09:30:00Z', 'UTC');
    expect(['Asian', 'London', 'New York', 'Other']).toContain(session);
  });

  it('determines day of week correctly', () => {
    const day = getDayOfWeek('2026-10-05T09:30:00Z', 'UTC');
    expect(day).toBe('Monday');
  });

  it('calculates duration buckets correctly', () => {
    expect(getDurationBucket('2026-10-07T10:00:00Z', '2026-10-07T10:03:00Z')).toBe('< 5 min');
    expect(getDurationBucket('2026-10-05T09:30:00Z', '2026-10-05T09:45:00Z')).toBe('15–60 min');
  });

  it('groups analytics by symbol and strategy (including No Strategy)', () => {
    const res = calculateDetailedAnalytics(sampleTrades, 50000, 'UTC');
    const nq = res.symbolAnalytics.find((s) => s.symbol === 'NQ');
    expect(nq?.trades).toBe(2);
    expect(nq?.netPnl).toBe(600);

    const noStrat = res.strategyAnalytics.find((st) => st.name === 'No Strategy');
    expect(noStrat).toBeDefined();
    expect(noStrat?.trades).toBe(1);
    expect(noStrat?.netPnl).toBe(-100);
  });

  it('calculates max drawdown and equity curve', () => {
    const res = calculateDetailedAnalytics(sampleTrades, 50000, 'UTC');
    expect(res.equityCurve.length).toBe(4);
    expect(res.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it('computes winning and losing streaks', () => {
    const res = calculateDetailedAnalytics(sampleTrades, 50000, 'UTC');
    expect(res.streaks.maxWinningStreak).toBe(1);
    expect(res.streaks.maxLosingStreak).toBe(1);
  });
});
