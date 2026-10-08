import { describe, it, expect } from 'vitest';
import { calculateDashboardMetrics, filterTradesByDateRange } from '@/src/lib/calculations/dashboard';
import type { TradeWithAccount } from '@/src/types/trade';

describe('Dashboard Calculation Engine & Metrics', () => {
  const mockTrades = [
    {
      id: 't1',
      user_id: 'u1',
      trading_account_id: 'acc1',
      symbol: 'NQ',
      direction: 'long',
      entry_price: 18000,
      exit_price: 18100,
      quantity: 2,
      net_pnl: 200,
      r_multiple: 2.0,
      exit_time: '2026-10-01T10:00:00Z',
      entry_time: '2026-10-01T09:30:00Z',
      status: 'closed',
      created_at: '2026-10-01T09:00:00Z',
      updated_at: '2026-10-01T10:00:00Z',
    },
    {
      id: 't2',
      user_id: 'u1',
      trading_account_id: 'acc1',
      symbol: 'ES',
      direction: 'short',
      entry_price: 5800,
      exit_price: 5820,
      quantity: 1,
      net_pnl: -100,
      r_multiple: -1.0,
      exit_time: '2026-10-02T11:00:00Z',
      entry_time: '2026-10-02T10:30:00Z',
      status: 'closed',
      created_at: '2026-10-02T09:00:00Z',
      updated_at: '2026-10-02T11:00:00Z',
    },
    {
      id: 't3',
      user_id: 'u1',
      trading_account_id: 'acc1',
      symbol: 'NQ',
      direction: 'long',
      entry_price: 18100,
      exit_price: 18250,
      quantity: 2,
      net_pnl: 300,
      r_multiple: 3.0,
      exit_time: '2026-10-03T14:00:00Z',
      entry_time: '2026-10-03T13:00:00Z',
      status: 'closed',
      created_at: '2026-10-03T09:00:00Z',
      updated_at: '2026-10-03T14:00:00Z',
    },
  ] as unknown as TradeWithAccount[];

  it('calculates correct Net P&L and Win Rate', () => {
    const metrics = calculateDashboardMetrics(mockTrades, 50000);
    expect(metrics.netPnL).toBe(400); // 200 - 100 + 300
    expect(metrics.totalTrades).toBe(3);
    expect(metrics.winRate).toBe(66.67); // 2 wins out of 3
  });

  it('calculates correct Profit Factor without Infinity', () => {
    const metrics = calculateDashboardMetrics(mockTrades, 50000);
    // Gross profit = 200 + 300 = 500. Gross loss = 100. Profit factor = 500 / 100 = 5.0
    expect(metrics.profitFactor).toBe(5);
  });

  it('handles zero loss gracefully for profit factor without Infinity', () => {
    const winningOnly = [
      { ...mockTrades[0], net_pnl: 150 },
      { ...mockTrades[2], net_pnl: 250 },
    ] as unknown as TradeWithAccount[];
    const metrics = calculateDashboardMetrics(winningOnly, 10000);
    expect(metrics.profitFactor).toBe(999.99);
    expect(Number.isFinite(metrics.profitFactor)).toBe(true);
  });

  it('calculates correct Expectancy and Average Winner / Loser', () => {
    const metrics = calculateDashboardMetrics(mockTrades, 50000);
    expect(metrics.expectancy).toBe(133.33); // 400 / 3
    expect(metrics.avgWinner).toBe(250); // (200 + 300) / 2
    expect(metrics.avgLoser).toBe(100); // 100 / 1
  });

  it('calculates Max Drawdown correctly from equity curve', () => {
    const metrics = calculateDashboardMetrics(mockTrades, 50000);
    // Starting 50000 -> +200 = 50200 -> -100 = 50100 (drop of 100 from peak 50200) -> +300 = 50400.
    expect(metrics.maxDrawdown).toBe(100);
  });

  it('builds equity curve and daily P&L correctly', () => {
    const metrics = calculateDashboardMetrics(mockTrades, 50000);
    expect(metrics.equityCurve.length).toBe(4); // 1 initial + 3 trades
    expect(metrics.equityCurve[3].equity).toBe(50400);
    expect(metrics.dailyPnL.length).toBe(3);
  });

  it('filters trades by date range correctly', () => {
    const filtered = filterTradesByDateRange(mockTrades, 'custom', '2026-10-01', '2026-10-01', 'UTC');
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('t1');
  });
});
