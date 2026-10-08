import { describe, it, expect, beforeEach } from 'vitest';
import { StrategyService } from '@/src/lib/services/strategy-service';
import { TagService } from '@/src/lib/services/tag-service';
import { MistakeService } from '@/src/lib/services/mistake-service';
import { TradeJunctionService } from '@/src/lib/services/trade-junction-service';
import { TradeService } from '@/src/lib/services/trade-service';
import { AnalyticsService } from '@/src/lib/services/analytics-service';

describe('Strategy, Tag, and Mistake System', () => {
  const userA = 'user-test-alex-uuid';
  const userB = 'user-test-bob-uuid';
  const accountA = 'acc-test-a-1';

  beforeEach(() => {
    // Clear mock in-memory stores before each test
    const g = globalThis as unknown as {
      __mock_strategies?: Record<string, unknown>;
      __mock_tags?: Record<string, unknown>;
      __mock_mistakes?: Record<string, unknown>;
      __mock_junctions?: Record<string, unknown>;
      __mock_trades?: Record<string, unknown>;
    };
    g.__mock_strategies = {};
    g.__mock_tags = {};
    g.__mock_mistakes = {};
    g.__mock_junctions = {};
    g.__mock_trades = {};
  });

  describe('1. Strategies Management', () => {
    it('creates and lists user strategies', async () => {
      const createRes = await StrategyService.createStrategy(userA, {
        name: 'Opening Range Breakout',
        description: 'First 5-minute bar breakout with volume spike',
      });

      expect(createRes.error).toBeNull();
      expect(createRes.data).toBeDefined();
      expect(createRes.data?.name).toBe('Opening Range Breakout');
      expect(createRes.data?.user_id).toBe(userA);

      const listRes = await StrategyService.listStrategies(userA);
      expect(listRes.data.length).toBeGreaterThanOrEqual(1);
      expect(listRes.data.some((s) => s.name === 'Opening Range Breakout')).toBe(true);
    });

    it('edits an existing strategy', async () => {
      const created = await StrategyService.createStrategy(userA, {
        name: 'VWAP Bounce',
        description: 'Initial notes',
      });
      expect(created.data).toBeDefined();

      const updateRes = await StrategyService.updateStrategy(userA, created.data!.id, {
        name: 'VWAP Mean Reversion',
        description: 'Updated criteria: 2 standard deviation band touch',
      });

      expect(updateRes.error).toBeNull();
      expect(updateRes.data?.name).toBe('VWAP Mean Reversion');
      expect(updateRes.data?.description).toBe('Updated criteria: 2 standard deviation band touch');
    });

    it('deletes an existing strategy', async () => {
      const created = await StrategyService.createStrategy(userA, {
        name: 'Temp Strategy',
      });
      expect(created.data).toBeDefined();

      const deleteRes = await StrategyService.deleteStrategy(userA, created.data!.id);
      expect(deleteRes.success).toBe(true);

      const listRes = await StrategyService.listStrategies(userA);
      expect(listRes.data.some((s) => s.id === created.data!.id)).toBe(false);
    });

    it('enforces user scoping (User A cannot modify or delete User B strategy)', async () => {
      const stratB = await StrategyService.createStrategy(userB, {
        name: 'Bob Secret Strategy',
      });

      // User A attempts to edit User B's strategy
      const editAttempt = await StrategyService.updateStrategy(userA, stratB.data!.id, {
        name: 'Hacked Strategy',
      });
      expect(editAttempt.data).toBeNull();

      // User A attempts to delete User B's strategy
      await StrategyService.deleteStrategy(userA, stratB.data!.id);
      const bobList = await StrategyService.listStrategies(userB);
      expect(bobList.data.some((s) => s.name === 'Bob Secret Strategy')).toBe(true);
    });
  });

  describe('2. Tags and Mistakes Management', () => {
    it('creates, lists, and deletes custom execution tags', async () => {
      const tag = await TagService.createTag(userA, 'High Conviction');
      expect(tag.error).toBeNull();
      expect(tag.data?.name).toBe('High Conviction');

      const list = await TagService.listTags(userA);
      expect(list.data.some((t) => t.name === 'High Conviction')).toBe(true);

      const del = await TagService.deleteTag(userA, tag.data!.id);
      expect(del.success).toBe(true);
      const afterDel = await TagService.listTags(userA);
      expect(afterDel.data.some((t) => t.id === tag.data!.id)).toBe(false);
    });

    it('creates, lists, and deletes execution mistakes', async () => {
      const mistake = await MistakeService.createMistake(userA, 'Revenge trading');
      expect(mistake.error).toBeNull();
      expect(mistake.data?.name).toBe('Revenge trading');

      const list = await MistakeService.listMistakes(userA);
      expect(list.data.some((m) => m.name === 'Revenge trading')).toBe(true);

      const del = await MistakeService.deleteMistake(userA, mistake.data!.id);
      expect(del.success).toBe(true);
    });
  });

  describe('3. Multi-Strategy, Tag, and Mistake Trade Assignment', () => {
    it('allows a trade to belong to multiple strategies, tags, and mistakes', async () => {
      const strat1 = await StrategyService.createStrategy(userA, { name: 'Breakout' });
      const strat2 = await StrategyService.createStrategy(userA, { name: 'Supply Zone' });
      const tag1 = await TagService.createTag(userA, 'A+');
      const tag2 = await TagService.createTag(userA, 'NY Session');
      const mistake1 = await MistakeService.createMistake(userA, 'Late entry');

      const tradeRes = await TradeService.createTrade(userA, {
        trading_account_id: accountA,
        symbol: 'NQ',
        direction: 'long',
        entry_time: '2026-10-08T09:30:00Z',
        exit_time: '2026-10-08T10:00:00Z',
        entry_price: 18500,
        exit_price: 18550,
        quantity: 2,
        commission: 4,
        fees: 1,
        swap: 0,
        status: 'closed',
        // Pass multiple strategy, tag, and mistake IDs/names
        strategy_ids: [strat1.data!.id, strat2.data!.id],
        strategies: [strat1.data!.name, strat2.data!.name],
        tag_ids: [tag1.data!.id, tag2.data!.id],
        tags: [tag1.data!.name, tag2.data!.name],
        mistake_ids: [mistake1.data!.id],
        mistakes: [mistake1.data!.name],
      } as any);

      expect(tradeRes.error).toBeNull();
      expect(tradeRes.data).toBeDefined();

      const createdTrade = tradeRes.data!;
      expect(createdTrade.strategies?.length).toBe(2);
      expect(createdTrade.strategies?.map((s) => s.name)).toContain('Breakout');
      expect(createdTrade.strategies?.map((s) => s.name)).toContain('Supply Zone');
      expect(createdTrade.tags?.length).toBe(2);
      expect(createdTrade.tags).toContain('A+');
      expect(createdTrade.mistakes?.length).toBe(1);
      expect(createdTrade.mistakes).toContain('Late entry');

      // Fetch trade directly
      const fetched = await TradeService.getTrade(userA, createdTrade.id);
      expect(fetched.data?.strategies?.length).toBe(2);
      expect(fetched.data?.tags?.length).toBe(2);
      expect(fetched.data?.mistakes?.length).toBe(1);
    });

    it('updates assigned strategies, tags, and mistakes on a trade', async () => {
      const strat = await StrategyService.createStrategy(userA, { name: 'Initial Setup' });
      const tradeRes = await TradeService.createTrade(userA, {
        trading_account_id: accountA,
        symbol: 'ES',
        direction: 'short',
        entry_time: '2026-10-08T14:00:00Z',
        exit_time: '2026-10-08T14:30:00Z',
        entry_price: 5200,
        exit_price: 5180,
        quantity: 1,
        commission: 2,
        fees: 0,
        swap: 0,
        status: 'closed',
        strategy_ids: [strat.data!.id],
        strategies: [strat.data!.name],
        tags: ['B'],
        mistakes: [],
      } as any);

      const trade = tradeRes.data!;
      expect(trade.strategies?.length).toBe(1);

      // Add a mistake and extra strategy during review
      const newStrat = await StrategyService.createStrategy(userA, { name: 'Trend Continuation' });
      const updateRes = await TradeService.updateTrade(userA, trade.id, {
        strategy_ids: [strat.data!.id, newStrat.data!.id],
        strategies: [strat.data!.name, newStrat.data!.name],
        tags: ['A', 'High conviction'],
        mistakes: ['Early exit'],
      } as any);

      expect(updateRes.error).toBeNull();
      expect(updateRes.data?.strategies?.length).toBe(2);
      expect(updateRes.data?.tags).toContain('High conviction');
      expect(updateRes.data?.mistakes).toContain('Early exit');
    });
  });

  describe('4. Trades Filtering by Strategy, Tag, and Mistake', () => {
    it('filters trades by strategy name or id', async () => {
      const orb = await StrategyService.createStrategy(userA, { name: 'ORB' });
      const vwap = await StrategyService.createStrategy(userA, { name: 'VWAP' });

      await TradeService.createTrade(userA, {
        trading_account_id: accountA,
        symbol: 'AAPL',
        direction: 'long',
        entry_time: '2026-10-08T09:30:00Z',
        exit_time: '2026-10-08T10:00:00Z',
        entry_price: 220,
        exit_price: 225,
        quantity: 10,
        status: 'closed',
        strategy_ids: [orb.data!.id],
        strategies: ['ORB'],
        strategy: 'ORB',
      } as any);

      await TradeService.createTrade(userA, {
        trading_account_id: accountA,
        symbol: 'TSLA',
        direction: 'short',
        entry_time: '2026-10-08T11:00:00Z',
        exit_time: '2026-10-08T11:30:00Z',
        entry_price: 240,
        exit_price: 235,
        quantity: 10,
        status: 'closed',
        strategy_ids: [vwap.data!.id],
        strategies: ['VWAP'],
        strategy: 'VWAP',
      } as any);

      // Query ORB trades
      const orbTrades = await TradeService.getTrades(userA, { strategy: 'ORB' });
      expect(orbTrades.data.length).toBe(1);
      expect(orbTrades.data[0].symbol).toBe('AAPL');

      // Query VWAP trades
      const vwapTrades = await TradeService.getTrades(userA, { strategy: 'VWAP' });
      expect(vwapTrades.data.length).toBe(1);
      expect(vwapTrades.data[0].symbol).toBe('TSLA');
    });

    it('filters trades by tag and mistake', async () => {
      await TradeService.createTrade(userA, {
        trading_account_id: accountA,
        symbol: 'NVDA',
        direction: 'long',
        entry_time: '2026-10-08T09:30:00Z',
        exit_time: '2026-10-08T10:00:00Z',
        entry_price: 120,
        exit_price: 115,
        quantity: 20,
        status: 'closed',
        tags: ['London'],
        mistakes: ['FOMO'],
      } as any);

      await TradeService.createTrade(userA, {
        trading_account_id: accountA,
        symbol: 'MSFT',
        direction: 'long',
        entry_time: '2026-10-08T10:30:00Z',
        exit_time: '2026-10-08T11:00:00Z',
        entry_price: 410,
        exit_price: 415,
        quantity: 10,
        status: 'closed',
        tags: ['NY'],
        mistakes: ['Early exit'],
      } as any);

      // Tag filter
      const londonTrades = await TradeService.getTrades(userA, { tag: 'London' });
      expect(londonTrades.data.length).toBe(1);
      expect(londonTrades.data[0].symbol).toBe('NVDA');

      // Mistake filter
      const fomoTrades = await TradeService.getTrades(userA, { mistake: 'FOMO' });
      expect(fomoTrades.data.length).toBe(1);
      expect(fomoTrades.data[0].symbol).toBe('NVDA');
    });
  });

  describe('5. Analytics Preparation (Performance by Strategy, Tag, Mistake)', () => {
    it('calculates performance metrics grouped by strategy', async () => {
      const orb = await StrategyService.createStrategy(userA, { name: 'ORB Setup' });

      // Trade 1: Win $100
      await TradeService.createTrade(userA, {
        trading_account_id: accountA,
        symbol: 'NQ',
        direction: 'long',
        entry_time: '2026-10-08T09:30:00Z',
        exit_time: '2026-10-08T10:00:00Z',
        entry_price: 18500,
        exit_price: 18550,
        quantity: 2, // 100 gross
        commission: 0,
        fees: 0,
        swap: 0,
        risk_amount: 50,
        status: 'closed',
        strategy_ids: [orb.data!.id],
        strategies: [orb.data!.name],
      } as any);

      // Trade 2: Loss -$40
      await TradeService.createTrade(userA, {
        trading_account_id: accountA,
        symbol: 'NQ',
        direction: 'long',
        entry_time: '2026-10-08T10:30:00Z',
        exit_time: '2026-10-08T11:00:00Z',
        entry_price: 18550,
        exit_price: 18530,
        quantity: 2, // -40 gross
        commission: 0,
        fees: 0,
        swap: 0,
        risk_amount: 50,
        status: 'closed',
        strategy_ids: [orb.data!.id],
        strategies: [orb.data!.name],
      } as any);

      const perfRes = await AnalyticsService.getPerformanceByStrategy(userA);
      expect(perfRes.error).toBeNull();

      const orbStats = perfRes.data.find((p) => p.name === 'ORB Setup');
      expect(orbStats).toBeDefined();
      expect(orbStats?.totalTrades).toBe(2);
      expect(orbStats?.winCount).toBe(1);
      expect(orbStats?.lossCount).toBe(1);
      expect(orbStats?.winRate).toBe(50);
      expect(orbStats?.netPnl).toBe(60); // 100 - 40
      expect(orbStats?.profitFactor).toBe(2.5); // 100 / 40
    });

    it('calculates mistake cost analysis and impact on trading performance', async () => {
      // 1 disciplined trade (+ $150)
      await TradeService.createTrade(userA, {
        trading_account_id: accountA,
        symbol: 'ES',
        direction: 'long',
        entry_time: '2026-10-08T09:30:00Z',
        exit_time: '2026-10-08T10:00:00Z',
        entry_price: 5200,
        exit_price: 5215,
        quantity: 10,
        status: 'closed',
        mistakes: [],
      } as any);

      // 1 mistake trade (- $200 with Overtrading)
      await TradeService.createTrade(userA, {
        trading_account_id: accountA,
        symbol: 'ES',
        direction: 'short',
        entry_time: '2026-10-08T11:30:00Z',
        exit_time: '2026-10-08T12:00:00Z',
        entry_price: 5210,
        exit_price: 5230,
        quantity: 10,
        status: 'closed',
        mistakes: ['Overtrading'],
      } as any);

      const costAnalysis = await AnalyticsService.getMistakeCostAnalysis(userA);
      expect(costAnalysis.error).toBeNull();
      expect(costAnalysis.cleanTrades.netPnl).toBe(150);
      expect(costAnalysis.mistakeTrades.netPnl).toBe(-200);
      expect(costAnalysis.totalMistakeCost).toBe(200);
    });
  });
});
