import { TradeService } from './trade-service';
import { StrategyService } from './strategy-service';
import { TagService } from './tag-service';
import { MistakeService } from './mistake-service';
import type { CategoricalPerformanceMetrics } from '@/src/types/journal-metadata';
import type { TradeWithAccount } from '@/src/types/trade';

/**
 * Reusable analytics engine calculating performance metrics by strategy, tag, and mistake.
 * Modular and ready for equity curves, breakdown charts, and deep post-trade review.
 */
export class AnalyticsService {
  /**
   * Helper to aggregate financial metrics for any array of trade records.
   */
  public static aggregateTradeMetrics(
    id: string,
    name: string,
    trades: TradeWithAccount[],
    description?: string | null
  ): CategoricalPerformanceMetrics {
    let winCount = 0;
    let lossCount = 0;
    let breakevenCount = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let netPnl = 0;
    let totalR = 0;
    let rTradesCount = 0;
    let maxWin = 0;
    let maxLoss = 0;

    for (const t of trades) {
      const pnl = Number(t.net_pnl) || 0;
      netPnl += pnl;

      if (pnl > 0) {
        winCount++;
        grossProfit += pnl;
        if (pnl > maxWin) maxWin = pnl;
      } else if (pnl < 0) {
        lossCount++;
        grossLoss += Math.abs(pnl);
        if (pnl < maxLoss) maxLoss = pnl;
      } else {
        breakevenCount++;
      }

      if (t.r_multiple !== null && t.r_multiple !== undefined) {
        totalR += Number(t.r_multiple);
        rTradesCount++;
      }
    }

    const totalTrades = trades.length;
    const closedCount = winCount + lossCount + breakevenCount;
    const winRate = closedCount > 0 ? (winCount / closedCount) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999.99 : 0;
    const avgPnl = totalTrades > 0 ? netPnl / totalTrades : 0;
    const avgWin = winCount > 0 ? grossProfit / winCount : 0;
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;
    const avgRMultiple = rTradesCount > 0 ? totalR / rTradesCount : null;

    return {
      id,
      name,
      description: description ?? null,
      totalTrades,
      winCount,
      lossCount,
      breakevenCount,
      winRate: Math.round(winRate * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossLoss: Math.round(grossLoss * 100) / 100,
      netPnl: Math.round(netPnl * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      avgPnl: Math.round(avgPnl * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      avgRMultiple: avgRMultiple !== null ? Math.round(avgRMultiple * 100) / 100 : null,
      maxWin: Math.round(maxWin * 100) / 100,
      maxLoss: Math.round(maxLoss * 100) / 100,
    };
  }

  /**
   * Performance breakdown grouped by Strategy
   */
  public static async getPerformanceByStrategy(
    userId: string,
    tradingAccountId?: string
  ): Promise<{ data: CategoricalPerformanceMetrics[]; error: Error | null }> {
    if (!userId) return { data: [], error: new Error('User ID is required') };

    const [strategiesRes, tradesRes] = await Promise.all([
      StrategyService.listStrategies(userId),
      TradeService.getTrades(userId, {
        trading_account_id: tradingAccountId && tradingAccountId !== 'all' ? tradingAccountId : undefined,
        limit: 1000,
      }),
    ]);

    if (strategiesRes.error) return { data: [], error: strategiesRes.error };

    const strategies = strategiesRes.data;
    const trades = tradesRes.data;

    const metricsList: CategoricalPerformanceMetrics[] = strategies.map((strat) => {
      // Find trades that belong to this strategy either via relation or legacy name
      const matchedTrades = trades.filter((t) => {
        if (t.strategy_ids?.includes(strat.id)) return true;
        if (t.strategies?.some((s) => s.id === strat.id || s.name.toLowerCase() === strat.name.toLowerCase())) return true;
        if (t.strategy && t.strategy.toLowerCase() === strat.name.toLowerCase()) return true;
        return false;
      });

      return this.aggregateTradeMetrics(strat.id, strat.name, matchedTrades, strat.description);
    });

    // Also include untagged / unassigned trades if any
    const untaggedTrades = trades.filter((t) => {
      const hasStrat = (t.strategies && t.strategies.length > 0) || Boolean(t.strategy);
      return !hasStrat;
    });

    if (untaggedTrades.length > 0) {
      metricsList.push(
        this.aggregateTradeMetrics(
          'unassigned',
          'No Strategy Assigned',
          untaggedTrades,
          'Trades without an assigned playbook setup'
        )
      );
    }

    return { data: metricsList, error: null };
  }

  /**
   * Performance breakdown grouped by Tag
   */
  public static async getPerformanceByTag(
    userId: string,
    tradingAccountId?: string
  ): Promise<{ data: CategoricalPerformanceMetrics[]; error: Error | null }> {
    if (!userId) return { data: [], error: new Error('User ID is required') };

    const [tagsRes, tradesRes] = await Promise.all([
      TagService.listTags(userId),
      TradeService.getTrades(userId, {
        trading_account_id: tradingAccountId && tradingAccountId !== 'all' ? tradingAccountId : undefined,
        limit: 1000,
      }),
    ]);

    if (tagsRes.error) return { data: [], error: tagsRes.error };

    const tags = tagsRes.data;
    const trades = tradesRes.data;

    const metricsList: CategoricalPerformanceMetrics[] = tags.map((tag) => {
      const matchedTrades = trades.filter((t) => {
        if (t.tag_ids?.includes(tag.id)) return true;
        if (t.tags_list?.some((tl) => tl.id === tag.id || tl.name.toLowerCase() === tag.name.toLowerCase())) return true;
        if (t.tags && Array.isArray(t.tags) && t.tags.some((name) => name.toLowerCase() === tag.name.toLowerCase())) return true;
        return false;
      });

      return this.aggregateTradeMetrics(tag.id, tag.name, matchedTrades);
    });

    return { data: metricsList, error: null };
  }

  /**
   * Performance breakdown grouped by Mistake
   */
  public static async getPerformanceByMistake(
    userId: string,
    tradingAccountId?: string
  ): Promise<{ data: CategoricalPerformanceMetrics[]; error: Error | null }> {
    if (!userId) return { data: [], error: new Error('User ID is required') };

    const [mistakesRes, tradesRes] = await Promise.all([
      MistakeService.listMistakes(userId),
      TradeService.getTrades(userId, {
        trading_account_id: tradingAccountId && tradingAccountId !== 'all' ? tradingAccountId : undefined,
        limit: 1000,
      }),
    ]);

    if (mistakesRes.error) return { data: [], error: mistakesRes.error };

    const mistakes = mistakesRes.data;
    const trades = tradesRes.data;

    const metricsList: CategoricalPerformanceMetrics[] = mistakes.map((mistake) => {
      const matchedTrades = trades.filter((t) => {
        if (t.mistake_ids?.includes(mistake.id)) return true;
        if (t.mistakes_list?.some((ml) => ml.id === mistake.id || ml.name.toLowerCase() === mistake.name.toLowerCase())) return true;
        if (t.mistakes && Array.isArray(t.mistakes) && t.mistakes.some((name) => name.toLowerCase() === mistake.name.toLowerCase())) return true;
        return false;
      });

      return this.aggregateTradeMetrics(mistake.id, mistake.name, matchedTrades);
    });

    return { data: metricsList, error: null };
  }

  /**
   * Cost-of-mistakes comparative analysis
   * Compares trades with recorded mistakes vs clean execution trades
   */
  public static async getMistakeCostAnalysis(
    userId: string,
    tradingAccountId?: string
  ): Promise<{
    cleanTrades: CategoricalPerformanceMetrics;
    mistakeTrades: CategoricalPerformanceMetrics;
    totalMistakeCost: number;
    error: Error | null;
  }> {
    const tradesRes = await TradeService.getTrades(userId, {
      trading_account_id: tradingAccountId && tradingAccountId !== 'all' ? tradingAccountId : undefined,
      limit: 1000,
    });

    const trades = tradesRes.data;
    const tradesWithMistakes = trades.filter((t) => (t.mistakes && t.mistakes.length > 0) || (t.mistake_ids && t.mistake_ids.length > 0));
    const cleanTrades = trades.filter((t) => (!t.mistakes || t.mistakes.length === 0) && (!t.mistake_ids || t.mistake_ids.length === 0));

    const mistakeMetrics = this.aggregateTradeMetrics('mistakes', 'Trades with Mistakes', tradesWithMistakes);
    const cleanMetrics = this.aggregateTradeMetrics('clean', 'Disciplined / Clean Trades', cleanTrades);

    // Cost of mistakes: negative impact if mistake trades had losses or lower returns
    const totalMistakeCost = mistakeMetrics.netPnl < 0 ? Math.abs(mistakeMetrics.netPnl) : 0;

    return {
      cleanTrades: cleanMetrics,
      mistakeTrades: mistakeMetrics,
      totalMistakeCost,
      error: null,
    };
  }
}
