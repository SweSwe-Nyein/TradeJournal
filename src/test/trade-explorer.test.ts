import { describe, it, expect, beforeEach } from 'vitest';
import { TradeService } from '@/src/lib/services/trade-service';
import type { TradeFilters } from '@/src/types/trade';

describe('Trade Explorer & Trade Service Integration', () => {
  const userId = 'user-test-uuid-1';
  const otherUserId = 'user-test-uuid-2';
  const accountId = 'account-test-uuid-1';
  const accountId2 = 'account-test-uuid-2';

  beforeEach(() => {
    // Clear in-memory mock trade storage before each test
    const g = globalThis as unknown as { __mock_trades?: Record<string, unknown[]> };
    g.__mock_trades = {};
  });

  it('creates and retrieves a long winning trade with correct financial calculations', async () => {
    const res = await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'NQ',
      direction: 'long',
      entry_time: '2026-10-07T09:30:00Z',
      exit_time: '2026-10-07T10:00:00Z',
      entry_price: 18500,
      exit_price: 18550, // +50 pts * 2 = $100
      quantity: 2,
      stop_loss: 18475,
      take_profit: 18600,
      commission: 4,
      fees: 1,
      swap: 0,
      risk_amount: 50,
      status: 'closed',
      strategy: 'Break & Retest',
      tags: ['trend', 'breakout'],
      notes: 'Clean continuation above opening range',
    });

    expect(res.error).toBeNull();
    expect(res.data).not.toBeNull();
    if (res.data) {
      expect(res.data.gross_pnl).toBe(100);
      expect(res.data.net_pnl).toBe(95); // 100 - 4 - 1
      expect(res.data.r_multiple).toBe(1.9); // 95 / 50
      expect(res.data.symbol).toBe('NQ');
    }

    // Verify retrieval by ID
    const fetched = await TradeService.getTrade(userId, res.data!.id);
    expect(fetched.error).toBeNull();
    expect(fetched.data?.id).toBe(res.data!.id);
  });

  it('enforces user boundaries: user cannot access or delete another user trade', async () => {
    const res = await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'ES',
      direction: 'short',
      entry_time: '2026-10-07T10:00:00Z',
      exit_time: '2026-10-07T10:30:00Z',
      entry_price: 5800,
      exit_price: 5790,
      quantity: 1,
      commission: 2,
      fees: 0.5,
      swap: 0,
      status: 'closed',
    });

    const tradeId = res.data!.id;

    // Other user attempts to query the trade
    const otherFetch = await TradeService.getTrade(otherUserId, tradeId);
    expect(otherFetch.data).toBeNull();

    // Other user attempts to delete the trade
    await TradeService.deleteTrade(otherUserId, tradeId);

    // Verify trade still exists for the owner
    const ownerFetch = await TradeService.getTrade(userId, tradeId);
    expect(ownerFetch.data).not.toBeNull();
  });

  it('filters trades by outcome: winning, losing, and break-even', async () => {
    // Win
    await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'AAPL',
      direction: 'long',
      entry_time: '2026-10-05T09:30:00Z',
      exit_time: '2026-10-05T10:00:00Z',
      entry_price: 220,
      exit_price: 230,
      quantity: 10,
      commission: 0,
      fees: 0,
      swap: 0,
      status: 'closed',
    });

    // Loss
    await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'TSLA',
      direction: 'long',
      entry_time: '2026-10-06T09:30:00Z',
      exit_time: '2026-10-06T10:00:00Z',
      entry_price: 250,
      exit_price: 240,
      quantity: 10,
      commission: 0,
      fees: 0,
      swap: 0,
      status: 'closed',
    });

    // Break-even
    await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'MSFT',
      direction: 'long',
      entry_time: '2026-10-07T09:30:00Z',
      exit_time: '2026-10-07T10:00:00Z',
      entry_price: 420,
      exit_price: 420,
      quantity: 10,
      commission: 0,
      fees: 0,
      swap: 0,
      status: 'closed',
    });

    // Filter wins
    const wins = await TradeService.getTrades(userId, { pnl_outcome: 'win' });
    expect(wins.count).toBe(1);
    expect(wins.data[0].symbol).toBe('AAPL');

    // Filter losses
    const losses = await TradeService.getTrades(userId, { pnl_outcome: 'loss' });
    expect(losses.count).toBe(1);
    expect(losses.data[0].symbol).toBe('TSLA');

    // Filter break-even
    const be = await TradeService.getTrades(userId, { pnl_outcome: 'breakeven' });
    expect(be.count).toBe(1);
    expect(be.data[0].symbol).toBe('MSFT');
  });

  it('filters trades by strategy, tags, and mistakes', async () => {
    await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'NVDA',
      direction: 'long',
      entry_time: '2026-10-07T09:30:00Z',
      exit_time: '2026-10-07T10:00:00Z',
      entry_price: 130,
      exit_price: 135,
      quantity: 20,
      commission: 1,
      fees: 1,
      swap: 0,
      status: 'closed',
      strategy: 'VWAP Reversal',
      tags: ['earnings', 'tech'],
      mistakes: ['Exited Too Early'],
    });

    await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'AMD',
      direction: 'short',
      entry_time: '2026-10-07T10:30:00Z',
      exit_time: '2026-10-07T11:00:00Z',
      entry_price: 160,
      exit_price: 155,
      quantity: 20,
      commission: 1,
      fees: 1,
      swap: 0,
      status: 'closed',
      strategy: 'Gap Fill',
      tags: ['tech'],
    });

    // Filter by strategy
    const byStrat = await TradeService.getTrades(userId, { strategy: 'VWAP Reversal' });
    expect(byStrat.count).toBe(1);
    expect(byStrat.data[0].symbol).toBe('NVDA');

    // Filter by tag
    const byTag = await TradeService.getTrades(userId, { tag: 'earnings' });
    expect(byTag.count).toBe(1);
    expect(byTag.data[0].symbol).toBe('NVDA');

    // Filter by mistake
    const byMistake = await TradeService.getTrades(userId, { mistake: 'Exited Too Early' });
    expect(byMistake.count).toBe(1);
    expect(byMistake.data[0].symbol).toBe('NVDA');
  });

  it('searches trades by symbol and notes keyword', async () => {
    await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'QQQ',
      direction: 'long',
      entry_time: '2026-10-07T09:30:00Z',
      exit_time: '2026-10-07T10:00:00Z',
      entry_price: 490,
      exit_price: 495,
      quantity: 10,
      commission: 0,
      fees: 0,
      swap: 0,
      status: 'closed',
      notes: 'Key daily moving average support bounce',
    });

    await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'SPY',
      direction: 'long',
      entry_time: '2026-10-07T10:00:00Z',
      exit_time: '2026-10-07T10:30:00Z',
      entry_price: 575,
      exit_price: 578,
      quantity: 10,
      commission: 0,
      fees: 0,
      swap: 0,
      status: 'closed',
      notes: 'Resistance breakout into high volume node',
    });

    // Search by note keyword
    const searchNote = await TradeService.getTrades(userId, { search_query: 'moving average' });
    expect(searchNote.count).toBe(1);
    expect(searchNote.data[0].symbol).toBe('QQQ');

    // Search by symbol
    const searchSymbol = await TradeService.getTrades(userId, { search_query: 'SPY' });
    expect(searchSymbol.count).toBe(1);
    expect(searchSymbol.data[0].symbol).toBe('SPY');
  });

  it('sorts trades ascending and descending by net P&L and entry time', async () => {
    await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'TRADE_A',
      direction: 'long',
      entry_time: '2026-10-01T09:30:00Z',
      exit_time: '2026-10-01T10:00:00Z',
      entry_price: 100,
      exit_price: 150, // +$50 net
      quantity: 1,
      commission: 0,
      fees: 0,
      swap: 0,
      status: 'closed',
    });

    await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'TRADE_B',
      direction: 'long',
      entry_time: '2026-10-02T09:30:00Z',
      exit_time: '2026-10-02T10:00:00Z',
      entry_price: 100,
      exit_price: 300, // +$200 net
      quantity: 1,
      commission: 0,
      fees: 0,
      swap: 0,
      status: 'closed',
    });

    // Sort by net_pnl desc
    const sortedDesc = await TradeService.getTrades(userId, { sort_by: 'net_pnl', sort_order: 'desc' });
    expect(sortedDesc.data[0].symbol).toBe('TRADE_B');
    expect(sortedDesc.data[1].symbol).toBe('TRADE_A');

    // Sort by net_pnl asc
    const sortedAsc = await TradeService.getTrades(userId, { sort_by: 'net_pnl', sort_order: 'asc' });
    expect(sortedAsc.data[0].symbol).toBe('TRADE_A');
    expect(sortedAsc.data[1].symbol).toBe('TRADE_B');
  });

  it('paginates trades using limit and offset', async () => {
    for (let i = 1; i <= 5; i++) {
      await TradeService.createTrade(userId, {
        trading_account_id: accountId,
        symbol: `SYM_${i}`,
        direction: 'long',
        entry_time: `2026-10-0${i}T09:30:00Z`,
        exit_time: `2026-10-0${i}T10:00:00Z`,
        entry_price: 100,
        exit_price: 110,
        quantity: 1,
        commission: 0,
        fees: 0,
        swap: 0,
        status: 'closed',
      });
    }

    // Page 1: 2 items
    const page1 = await TradeService.getTrades(userId, { limit: 2, offset: 0, sort_by: 'entry_time', sort_order: 'asc' });
    expect(page1.data.length).toBe(2);
    expect(page1.count).toBe(5);
    expect(page1.data[0].symbol).toBe('SYM_1');
    expect(page1.data[1].symbol).toBe('SYM_2');

    // Page 2: 2 items
    const page2 = await TradeService.getTrades(userId, { limit: 2, offset: 2, sort_by: 'entry_time', sort_order: 'asc' });
    expect(page2.data.length).toBe(2);
    expect(page2.count).toBe(5);
    expect(page2.data[0].symbol).toBe('SYM_3');
    expect(page2.data[1].symbol).toBe('SYM_4');

    // Page 3: 1 item
    const page3 = await TradeService.getTrades(userId, { limit: 2, offset: 4, sort_by: 'entry_time', sort_order: 'asc' });
    expect(page3.data.length).toBe(1);
    expect(page3.count).toBe(5);
    expect(page3.data[0].symbol).toBe('SYM_5');
  });

  it('updates an existing trade and automatically recalculates gross P&L, net P&L, and R multiple', async () => {
    const created = await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'CL',
      direction: 'long',
      entry_time: '2026-10-07T09:30:00Z',
      exit_time: '2026-10-07T10:00:00Z',
      entry_price: 70,
      exit_price: 72, // +$2 * 100 = $200 gross
      quantity: 100,
      commission: 10,
      fees: 2,
      swap: 0,
      risk_amount: 100,
      status: 'closed',
    });

    expect(created.data?.gross_pnl).toBe(200);
    expect(created.data?.net_pnl).toBe(188); // 200 - 10 - 2
    expect(created.data?.r_multiple).toBe(1.88);

    // Now edit the trade: changed exit price to 74 and fees to 5
    const updated = await TradeService.updateTrade(userId, created.data!.id, {
      exit_price: 74, // +$4 * 100 = $400 gross
      fees: 5,
    });

    expect(updated.error).toBeNull();
    expect(updated.data).not.toBeNull();
    expect(updated.data?.gross_pnl).toBe(400);
    expect(updated.data?.net_pnl).toBe(385); // 400 - 10 - 5
    expect(updated.data?.r_multiple).toBe(3.85); // 385 / 100

    // Now edit again with manual gross P&L override to adjust for exchange conversion rate
    const overridden = await TradeService.updateTrade(userId, created.data!.id, {
      gross_pnl: 450.5, // user manual override
      commission: 15,
      fees: 5,
    });

    expect(overridden.error).toBeNull();
    expect(overridden.data?.gross_pnl).toBe(450.5);
    expect(overridden.data?.net_pnl).toBe(430.5); // 450.5 - 15 - 5
    expect(overridden.data?.r_multiple).toBe(4.31); // 430.5 / 100 = 4.305 rounded to 4.31
  });

  it('deletes a trade and removes it from query results', async () => {
    const trade = await TradeService.createTrade(userId, {
      trading_account_id: accountId,
      symbol: 'GC',
      direction: 'long',
      entry_time: '2026-10-07T09:30:00Z',
      exit_time: '2026-10-07T10:00:00Z',
      entry_price: 2650,
      exit_price: 2660,
      quantity: 1,
      commission: 2,
      fees: 1,
      swap: 0,
      status: 'closed',
    });

    const tradeId = trade.data!.id;

    // Verify it exists
    const beforeDel = await TradeService.getTrade(userId, tradeId);
    expect(beforeDel.data).not.toBeNull();

    // Delete it
    const delRes = await TradeService.deleteTrade(userId, tradeId);
    expect(delRes.success).toBe(true);

    // Verify it no longer exists
    const afterDel = await TradeService.getTrade(userId, tradeId);
    expect(afterDel.data).toBeNull();
  });
});
