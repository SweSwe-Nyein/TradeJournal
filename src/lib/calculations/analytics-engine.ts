import type { TradeWithAccount } from '@/src/types/trade';
import { roundToDecimals } from './trades';
import { getLocalDateString } from './dashboard';

export type TradingSession = 'Asian' | 'London' | 'New York' | 'Other';

/**
 * Centralized trading session assignment based on trade entry time and timezone.
 * Standard hours (Local time):
 * - Asian: 00:00 - 08:00
 * - London: 08:00 - 16:00
 * - New York: 13:00 - 21:00 (New York Regular Session)
 */
export function getTradingSession(entryTime: string | Date, timezone: string = 'UTC'): TradingSession {
  try {
    const d = new Date(entryTime);
    if (isNaN(d.getTime())) return 'Other';

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const hourStr = formatter.format(d);
    const hour = parseInt(hourStr, 10);

    if (hour >= 0 && hour < 8) return 'Asian';
    if (hour >= 8 && hour < 14) return 'London';
    if (hour >= 14 && hour < 22) return 'New York';
    return 'Other';
  } catch {
    return 'Other';
  }
}

export function getDayOfWeek(dateInput: string | Date, timezone: string = 'UTC'): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Unknown';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
    });
    return formatter.format(d);
  } catch {
    return 'Unknown';
  }
}

export function getDurationBucket(entryTime: string | Date, exitTime: string | Date | null): string {
  if (!exitTime) return 'Active / Open';
  const start = new Date(entryTime).getTime();
  const end = new Date(exitTime).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return '< 5 min';

  const diffMinutes = (end - start) / (1000 * 60);

  if (diffMinutes < 5) return '< 5 min';
  if (diffMinutes < 15) return '5–15 min';
  if (diffMinutes < 60) return '15–60 min';
  if (diffMinutes < 240) return '1–4 hours';
  return '4+ hours';
}

export interface DetailedAnalyticsResult {
  netPnL: number;
  grossPnL: number;
  grossProfit: number;
  grossLoss: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  avgR: number | null;
  avgWinner: number;
  avgLoser: number;
  largestWinner: number;
  largestLoser: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  totalFees: number;
  avgTradeDurationMinutes: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  equityCurve: Array<{ date: string; equity: number; drawdown: number; drawdownPct: number }>;
  symbolAnalytics: Array<{
    symbol: string;
    trades: number;
    netPnl: number;
    winRate: number;
    profitFactor: number;
    expectancy: number;
    avgR: number | null;
    avgWinner: number;
    avgLoser: number;
  }>;
  strategyAnalytics: Array<{
    name: string;
    trades: number;
    netPnl: number;
    winRate: number;
    profitFactor: number;
    expectancy: number;
    avgR: number | null;
  }>;
  directionAnalytics: {
    long: { trades: number; pnl: number; winRate: number; profitFactor: number; expectancy: number; avgR: number | null };
    short: { trades: number; pnl: number; winRate: number; profitFactor: number; expectancy: number; avgR: number | null };
  };
  dayOfWeekAnalytics: Array<{ day: string; trades: number; pnl: number; winRate: number; avgPnl: number }>;
  sessionAnalytics: Array<{ session: TradingSession; trades: number; pnl: number; winRate: number; avgPnl: number }>;
  hourlyAnalytics: Array<{ hour: number; hourLabel: string; trades: number; pnl: number; winRate: number }>;
  durationAnalytics: Array<{ bucket: string; trades: number; pnl: number; winRate: number }>;
  streaks: {
    maxWinningStreak: number;
    maxLosingStreak: number;
    currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
  };
  bestTrades: TradeWithAccount[];
  worstTrades: TradeWithAccount[];
}

export function calculateDetailedAnalytics(
  trades: TradeWithAccount[],
  startingBalance: number = 0,
  timezone: string = 'UTC'
): DetailedAnalyticsResult {
  let netPnL = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalFees = 0;
  let winCount = 0;
  let lossCount = 0;
  let breakevenCount = 0;
  let totalR = 0;
  let rCount = 0;
  let winningPnLSum = 0;
  let losingPnLSum = 0;
  let largestWinner = 0;
  let largestLoser = 0;
  let totalDurationMs = 0;
  let durationCount = 0;

  // Sort trades chronologically
  const sortedTrades = [...trades].sort((a, b) => {
    const timeA = new Date(a.exit_time || a.entry_time).getTime();
    const timeB = new Date(b.exit_time || b.entry_time).getTime();
    return timeA - timeB;
  });

  let currentEquity = startingBalance;
  let peakEquity = startingBalance;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  const equityCurve: Array<{ date: string; equity: number; drawdown: number; drawdownPct: number }> = [];

  if (sortedTrades.length > 0) {
    const firstDate = getLocalDateString(sortedTrades[0].exit_time || sortedTrades[0].entry_time, timezone);
    equityCurve.push({
      date: firstDate,
      equity: startingBalance,
      drawdown: 0,
      drawdownPct: 0,
    });
  }

  // Maps for group aggregations
  const symbolMap: Record<string, TradeWithAccount[]> = {};
  const strategyMap: Record<string, TradeWithAccount[]> = {};
  const dayMap: Record<string, TradeWithAccount[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };
  const sessionMap: Record<TradingSession, TradeWithAccount[]> = {
    Asian: [],
    London: [],
    'New York': [],
    Other: [],
  };
  const hourlyMap: Record<number, TradeWithAccount[]> = {};
  for (let h = 0; h < 24; h++) hourlyMap[h] = [];

  const durationBucketMap: Record<string, TradeWithAccount[]> = {
    '< 5 min': [],
    '5–15 min': [],
    '15–60 min': [],
    '1–4 hours': [],
    '4+ hours': [],
  };

  // Streaks calculation variables
  let maxWinningStreak = 0;
  let maxLosingStreak = 0;
  let currentStreakCount = 0;
  let currentStreakType: 'win' | 'loss' | 'none' = 'none';

  let longTrades: TradeWithAccount[] = [];
  let shortTrades: TradeWithAccount[] = [];

  for (const t of sortedTrades) {
    const pnl = Number(t.net_pnl) || 0;
    const fees = (Number(t.commission) || 0) + (Number(t.fees) || 0) + (Number(t.swap) || 0);
    netPnL += pnl;
    totalFees += fees;
    currentEquity += pnl;

    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const drop = peakEquity - currentEquity;
    const dropPct = peakEquity > 0 ? (drop / peakEquity) * 100 : 0;
    if (drop > maxDrawdown) {
      maxDrawdown = drop;
      maxDrawdownPct = dropPct;
    }

    const tradeDate = getLocalDateString(t.exit_time || t.entry_time, timezone);
    equityCurve.push({
      date: tradeDate,
      equity: roundToDecimals(currentEquity, 2),
      drawdown: roundToDecimals(drop, 2),
      drawdownPct: roundToDecimals(dropPct, 2),
    });

    // Win / Loss / Breakeven
    if (pnl > 0) {
      winCount++;
      grossProfit += pnl;
      winningPnLSum += pnl;
      if (pnl > largestWinner) largestWinner = pnl;

      if (currentStreakType === 'win') {
        currentStreakCount++;
      } else {
        currentStreakType = 'win';
        currentStreakCount = 1;
      }
      if (currentStreakCount > maxWinningStreak) maxWinningStreak = currentStreakCount;
    } else if (pnl < 0) {
      lossCount++;
      const absLoss = Math.abs(pnl);
      grossLoss += absLoss;
      losingPnLSum += absLoss;
      if (pnl < largestLoser) largestLoser = pnl;

      if (currentStreakType === 'loss') {
        currentStreakCount++;
      } else {
        currentStreakType = 'loss';
        currentStreakCount = 1;
      }
      if (currentStreakCount > maxLosingStreak) maxLosingStreak = currentStreakCount;
    } else {
      breakevenCount++;
      currentStreakType = 'none';
      currentStreakCount = 0;
    }

    if (t.r_multiple !== null && t.r_multiple !== undefined && Number.isFinite(t.r_multiple)) {
      totalR += Number(t.r_multiple);
      rCount++;
    }

    // Duration
    if (t.exit_time && t.entry_time) {
      const s = new Date(t.entry_time).getTime();
      const e = new Date(t.exit_time).getTime();
      if (!isNaN(s) && !isNaN(e) && e > s) {
        totalDurationMs += e - s;
        durationCount++;
      }
    }

    // Symbol grouping
    const sym = (t.symbol || 'UNKNOWN').toUpperCase();
    if (!symbolMap[sym]) symbolMap[sym] = [];
    symbolMap[sym].push(t);

    // Strategy grouping
    let stratName = 'No Strategy';
    if (t.strategies && t.strategies.length > 0) {
      stratName = t.strategies[0].name;
    } else if (t.strategy) {
      stratName = t.strategy;
    }
    if (!strategyMap[stratName]) strategyMap[stratName] = [];
    strategyMap[stratName].push(t);

    // Direction grouping
    if (t.direction === 'long') longTrades.push(t);
    else if (t.direction === 'short') shortTrades.push(t);

    // Day of week
    const day = getDayOfWeek(t.exit_time || t.entry_time, timezone);
    if (dayMap[day]) dayMap[day].push(t);

    // Session
    const session = getTradingSession(t.entry_time, timezone);
    sessionMap[session].push(t);

    // Hour of day
    try {
      const hour = new Date(t.entry_time).getHours();
      if (hourlyMap[hour]) hourlyMap[hour].push(t);
    } catch {}

    // Duration bucket
    const bucket = getDurationBucket(t.entry_time, t.exit_time);
    if (durationBucketMap[bucket]) durationBucketMap[bucket].push(t);
  }

  const totalTrades = sortedTrades.length;
  const closedCount = winCount + lossCount + breakevenCount;
  const winRate = closedCount > 0 ? (winCount / closedCount) * 100 : 0;
  const grossPnL = grossProfit - grossLoss;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999.99 : 0;
  const expectancy = totalTrades > 0 ? netPnL / totalTrades : 0;
  const avgR = rCount > 0 ? totalR / rCount : null;
  const avgWinner = winCount > 0 ? winningPnLSum / winCount : 0;
  const avgLoser = lossCount > 0 ? losingPnLSum / lossCount : 0;
  const avgTradeDurationMinutes = durationCount > 0 ? totalDurationMs / durationCount / (1000 * 60) : 0;

  // Helper for helper aggregate
  const aggregateSubset = (subset: TradeWithAccount[]) => {
    let subNet = 0;
    let subWins = 0;
    let subLosses = 0;
    let subBe = 0;
    let subGrossProfit = 0;
    let subGrossLoss = 0;
    let subRSum = 0;
    let subRCount = 0;
    let subWinPnl = 0;
    let subLossPnl = 0;

    for (const st of subset) {
      const p = Number(st.net_pnl) || 0;
      subNet += p;
      if (p > 0) {
        subWins++;
        subGrossProfit += p;
        subWinPnl += p;
      } else if (p < 0) {
        subLosses++;
        subGrossLoss += Math.abs(p);
        subLossPnl += Math.abs(p);
      } else {
        subBe++;
      }
      if (st.r_multiple !== null && st.r_multiple !== undefined && Number.isFinite(st.r_multiple)) {
        subRSum += Number(st.r_multiple);
        subRCount++;
      }
    }
    const subClosed = subWins + subLosses + subBe;
    const subWinRate = subClosed > 0 ? (subWins / subClosed) * 100 : 0;
    const subPf = subGrossLoss > 0 ? subGrossProfit / subGrossLoss : subGrossProfit > 0 ? 999.99 : 0;
    const subExp = subset.length > 0 ? subNet / subset.length : 0;
    const subAvgR = subRCount > 0 ? subRSum / subRCount : null;
    const subAvgWinner = subWins > 0 ? subWinPnl / subWins : 0;
    const subAvgLoser = subLosses > 0 ? subLossPnl / subLosses : 0;

    return {
      trades: subset.length,
      netPnl: roundToDecimals(subNet, 2),
      pnl: roundToDecimals(subNet, 2),
      winRate: roundToDecimals(subWinRate, 1),
      profitFactor: roundToDecimals(subPf, 2),
      expectancy: roundToDecimals(subExp, 2),
      avgR: subAvgR !== null ? roundToDecimals(subAvgR, 2) : null,
      avgWinner: roundToDecimals(subAvgWinner, 2),
      avgLoser: roundToDecimals(subAvgLoser, 2),
    };
  };

  // Symbol analytics
  const symbolAnalytics = Object.entries(symbolMap)
    .map(([symbol, stList]) => ({
      symbol,
      ...aggregateSubset(stList),
    }))
    .sort((a, b) => b.netPnl - a.netPnl);

  // Strategy analytics
  const strategyAnalytics = Object.entries(strategyMap)
    .map(([name, stList]) => {
      const agg = aggregateSubset(stList);
      return {
        name,
        trades: agg.trades,
        netPnl: agg.netPnl,
        winRate: agg.winRate,
        profitFactor: agg.profitFactor,
        expectancy: agg.expectancy,
        avgR: agg.avgR,
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);

  // Direction analytics
  const longAgg = aggregateSubset(longTrades);
  const shortAgg = aggregateSubset(shortTrades);
  const directionAnalytics = {
    long: longAgg,
    short: shortAgg,
  };

  // Day of week analytics
  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayOfWeekAnalytics = daysOrder.map((day) => {
    const list = dayMap[day] || [];
    const agg = aggregateSubset(list);
    const avgPnl = list.length > 0 ? agg.netPnl / list.length : 0;
    return {
      day,
      trades: list.length,
      pnl: agg.netPnl,
      winRate: agg.winRate,
      avgPnl: roundToDecimals(avgPnl, 2),
    };
  });

  // Session analytics
  const sessionsOrder: TradingSession[] = ['Asian', 'London', 'New York', 'Other'];
  const sessionAnalytics = sessionsOrder.map((session) => {
    const list = sessionMap[session] || [];
    const agg = aggregateSubset(list);
    const avgPnl = list.length > 0 ? agg.netPnl / list.length : 0;
    return {
      session,
      trades: list.length,
      pnl: agg.netPnl,
      winRate: agg.winRate,
      avgPnl: roundToDecimals(avgPnl, 2),
    };
  });

  // Hourly analytics
  const hourlyAnalytics = Object.entries(hourlyMap)
    .map(([hrStr, list]) => {
      const hour = parseInt(hrStr, 10);
      const agg = aggregateSubset(list);
      const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
      return {
        hour,
        hourLabel,
        trades: list.length,
        pnl: agg.netPnl,
        winRate: agg.winRate,
      };
    })
    .sort((a, b) => a.hour - b.hour);

  // Duration bucket analytics
  const durationBucketsOrder = ['< 5 min', '5–15 min', '15–60 min', '1–4 hours', '4+ hours'];
  const durationAnalytics = durationBucketsOrder.map((bucket) => {
    const list = durationBucketMap[bucket] || [];
    const agg = aggregateSubset(list);
    return {
      bucket,
      trades: list.length,
      pnl: agg.netPnl,
      winRate: agg.winRate,
    };
  });

  // Best / Worst trades (Top 5 / Worst 5 by net_pnl)
  const sortedByPnlDesc = [...sortedTrades].sort((a, b) => (Number(b.net_pnl) || 0) - (Number(a.net_pnl) || 0));
  const bestTrades = sortedByPnlDesc.slice(0, 5);
  const worstTrades = [...sortedByPnlDesc].reverse().slice(0, 5);

  return {
    netPnL: roundToDecimals(netPnL, 2),
    grossPnL: roundToDecimals(grossPnL, 2),
    grossProfit: roundToDecimals(grossProfit, 2),
    grossLoss: roundToDecimals(grossLoss, 2),
    winRate: roundToDecimals(winRate, 2),
    profitFactor: roundToDecimals(profitFactor, 2),
    expectancy: roundToDecimals(expectancy, 2),
    avgR: avgR !== null ? roundToDecimals(avgR, 2) : null,
    avgWinner: roundToDecimals(avgWinner, 2),
    avgLoser: roundToDecimals(avgLoser, 2),
    largestWinner: roundToDecimals(largestWinner, 2),
    largestLoser: roundToDecimals(largestLoser, 2),
    totalTrades,
    winningTrades: winCount,
    losingTrades: lossCount,
    breakevenTrades: breakevenCount,
    totalFees: roundToDecimals(totalFees, 2),
    avgTradeDurationMinutes: roundToDecimals(avgTradeDurationMinutes, 1),
    maxDrawdown: roundToDecimals(maxDrawdown, 2),
    maxDrawdownPct: roundToDecimals(maxDrawdownPct, 2),
    equityCurve,
    symbolAnalytics,
    strategyAnalytics,
    directionAnalytics,
    dayOfWeekAnalytics,
    sessionAnalytics,
    hourlyAnalytics,
    durationAnalytics,
    streaks: {
      maxWinningStreak,
      maxLosingStreak,
      currentStreak: {
        type: currentStreakType,
        count: currentStreakCount,
      },
    },
    bestTrades,
    worstTrades,
  };
}
