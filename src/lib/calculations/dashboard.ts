import type { TradeWithAccount } from '@/src/types/trade';
import { roundToDecimals } from './trades';

export type DateRangeType = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export interface EquityPoint {
  date: string;
  equity: number;
  pnl: number;
  cumulativePnL: number;
}

export interface DailyPnLPoint {
  date: string;
  pnl: number;
  tradesCount: number;
}

export interface SymbolPerformance {
  symbol: string;
  trades: number;
  netPnl: number;
  winRate: number;
}

export interface DashboardMetricsResult {
  netPnL: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  totalTrades: number;
  closedTradesCount: number;
  avgR: number | null;
  avgWinner: number;
  avgLoser: number;
  maxWin: number;
  maxLoss: number;
  equityCurve: EquityPoint[];
  dailyPnL: DailyPnLPoint[];
  longVsShort: {
    long: { trades: number; pnl: number; winRate: number };
    short: { trades: number; pnl: number; winRate: number };
  };
  symbolPerformance: SymbolPerformance[];
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

/**
  * Get local calendar date string (YYYY-MM-DD) respecting timezone.
  */
export function getLocalDateString(dateInput: string | Date, timezone: string = 'UTC'): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    return new Date(dateInput).toISOString().split('T')[0];
  }
}

/**
  * Filter trades by date range and timezone.
  */
export function filterTradesByDateRange(
  trades: TradeWithAccount[],
  range: DateRangeType,
  customStart?: string,
  customEnd?: string,
  timezone: string = 'UTC'
): TradeWithAccount[] {
  if (!trades || trades.length === 0) return [];
  if (range === 'all') return trades;

  const now = new Date();
  const todayStr = getLocalDateString(now, timezone);

  return trades.filter((t) => {
    const tradeDateStr = getLocalDateString(t.exit_time || t.entry_time, timezone);
    if (!tradeDateStr) return false;

    if (range === 'today') {
      return tradeDateStr === todayStr;
    }

    if (range === 'week') {
      // Current week (Monday to Sunday)
      const d = new Date(now);
      const day = d.getDay();
      const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diffToMon));
      const monStr = getLocalDateString(monday, timezone);
      return tradeDateStr >= monStr && tradeDateStr <= todayStr;
    }

    if (range === 'month') {
      // Current month (YYYY-MM)
      const currentMonthPrefix = todayStr.substring(0, 7);
      return tradeDateStr.startsWith(currentMonthPrefix);
    }

    if (range === 'year') {
      // Current year (YYYY)
      const currentYearPrefix = todayStr.substring(0, 4);
      return tradeDateStr.startsWith(currentYearPrefix);
    }

    if (range === 'custom') {
      if (customStart && tradeDateStr < customStart) return false;
      if (customEnd && tradeDateStr > customEnd) return false;
      return true;
    }

    return true;
  });
}

/**
  * Calculate comprehensive dashboard performance metrics.
  */
export function calculateDashboardMetrics(
  trades: TradeWithAccount[],
  startingBalance: number = 0
): DashboardMetricsResult {
  let netPnL = 0;
  let winCount = 0;
  let lossCount = 0;
  let breakevenCount = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalR = 0;
  let rCount = 0;
  let maxWin = 0;
  let maxLoss = 0;
  let winningPnLSum = 0;
  let losingPnLSum = 0;

  let longTradesCount = 0;
  let longNetPnL = 0;
  let longWinCount = 0;
  let shortTradesCount = 0;
  let shortNetPnL = 0;
  let shortWinCount = 0;

  const symbolMap: Record<string, { trades: number; netPnl: number; wins: number }> = {};
  const dailyMap: Record<string, { pnl: number; count: number }> = {};

  // Sort trades chronologically by exit_time or entry_time for equity curve & streaks
  const sortedTrades = [...trades].sort((a, b) => {
    const timeA = new Date(a.exit_time || a.entry_time).getTime();
    const timeB = new Date(b.exit_time || b.entry_time).getTime();
    return timeA - timeB;
  });

  let currentEquity = startingBalance;
  let peakEquity = startingBalance;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  const equityCurve: EquityPoint[] = [];

  // Initial equity point before trades
  if (sortedTrades.length > 0) {
    const firstDate = getLocalDateString(sortedTrades[0].exit_time || sortedTrades[0].entry_time);
    equityCurve.push({
      date: firstDate,
      equity: startingBalance,
      pnl: 0,
      cumulativePnL: 0,
    });
  }

  let cumulativePnL = 0;
  let currentConsecutiveWins = 0;
  let currentConsecutiveLosses = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;

  for (const t of sortedTrades) {
    const pnl = Number(t.net_pnl) || 0;
    netPnL += pnl;
    cumulativePnL += pnl;
    currentEquity += pnl;

    // Track peak equity and drawdown
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const drop = peakEquity - currentEquity;
    if (drop > maxDrawdown) {
      maxDrawdown = drop;
      maxDrawdownPct = peakEquity > 0 ? (drop / peakEquity) * 100 : 0;
    }

    const tradeDate = getLocalDateString(t.exit_time || t.entry_time);

    // Equity curve point
    equityCurve.push({
      date: tradeDate,
      equity: roundToDecimals(currentEquity, 2),
      pnl: roundToDecimals(pnl, 2),
      cumulativePnL: roundToDecimals(cumulativePnL, 2),
    });

    // Daily PnL aggregation
    if (!dailyMap[tradeDate]) {
      dailyMap[tradeDate] = { pnl: 0, count: 0 };
    }
    dailyMap[tradeDate].pnl += pnl;
    dailyMap[tradeDate].count += 1;

    // Symbol aggregation
    const sym = (t.symbol || 'UNKNOWN').toUpperCase();
    if (!symbolMap[sym]) {
      symbolMap[sym] = { trades: 0, netPnl: 0, wins: 0 };
    }
    symbolMap[sym].trades += 1;
    symbolMap[sym].netPnl += pnl;

    // Win / Loss classification
    if (pnl > 0) {
      winCount++;
      grossProfit += pnl;
      winningPnLSum += pnl;
      if (pnl > maxWin) maxWin = pnl;
      symbolMap[sym].wins += 1;

      currentConsecutiveWins++;
      currentConsecutiveLosses = 0;
      if (currentConsecutiveWins > maxConsecutiveWins) maxConsecutiveWins = currentConsecutiveWins;
    } else if (pnl < 0) {
      lossCount++;
      const absLoss = Math.abs(pnl);
      grossLoss += absLoss;
      losingPnLSum += absLoss;
      if (pnl < maxLoss) maxLoss = pnl;

      currentConsecutiveLosses++;
      currentConsecutiveWins = 0;
      if (currentConsecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentConsecutiveLosses;
    } else {
      breakevenCount++;
      currentConsecutiveWins = 0;
      currentConsecutiveLosses = 0;
    }

    // Direction breakdown
    if (t.direction === 'long') {
      longTradesCount++;
      longNetPnL += pnl;
      if (pnl > 0) longWinCount++;
    } else if (t.direction === 'short') {
      shortTradesCount++;
      shortNetPnL += pnl;
      if (pnl > 0) shortWinCount++;
    }

    // R multiple
    if (t.r_multiple !== null && t.r_multiple !== undefined && Number.isFinite(t.r_multiple)) {
      totalR += Number(t.r_multiple);
      rCount++;
    }
  }

  const totalTrades = sortedTrades.length;
  const closedTradesCount = winCount + lossCount + breakevenCount;
  const winRate = closedTradesCount > 0 ? (winCount / closedTradesCount) * 100 : 0;
  
  // Profit factor calculation (safe handling of grossLoss === 0)
  let profitFactor = 0;
  if (grossLoss > 0) {
    profitFactor = grossProfit / grossLoss;
  } else if (grossProfit > 0) {
    profitFactor = 999.99; // capped high value when no losing trades exist
  } else {
    profitFactor = 0;
  }

  const expectancy = totalTrades > 0 ? netPnL / totalTrades : 0;
  const avgR = rCount > 0 ? totalR / rCount : null;
  const avgWinner = winCount > 0 ? winningPnLSum / winCount : 0;
  const avgLoser = lossCount > 0 ? losingPnLSum / lossCount : 0;

  // Daily PnL array sorted by date
  const dailyPnL: DailyPnLPoint[] = Object.entries(dailyMap)
    .map(([date, data]) => ({
      date,
      pnl: roundToDecimals(data.pnl, 2),
      tradesCount: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Symbol performance list
  const symbolPerformance: SymbolPerformance[] = Object.entries(symbolMap)
    .map(([symbol, data]) => ({
      symbol,
      trades: data.trades,
      netPnl: roundToDecimals(data.netPnl, 2),
      winRate: data.trades > 0 ? roundToDecimals((data.wins / data.trades) * 100, 1) : 0,
    }))
    .sort((a, b) => b.netPnl - a.netPnl);

  return {
    netPnL: roundToDecimals(netPnL, 2),
    winRate: roundToDecimals(winRate, 2),
    profitFactor: roundToDecimals(profitFactor, 2),
    expectancy: roundToDecimals(expectancy, 2),
    maxDrawdown: roundToDecimals(maxDrawdown, 2),
    maxDrawdownPct: roundToDecimals(maxDrawdownPct, 2),
    totalTrades,
    closedTradesCount,
    avgR: avgR !== null ? roundToDecimals(avgR, 2) : null,
    avgWinner: roundToDecimals(avgWinner, 2),
    avgLoser: roundToDecimals(avgLoser, 2),
    maxWin: roundToDecimals(maxWin, 2),
    maxLoss: roundToDecimals(maxLoss, 2),
    equityCurve,
    dailyPnL,
    longVsShort: {
      long: {
        trades: longTradesCount,
        pnl: roundToDecimals(longNetPnL, 2),
        winRate: longTradesCount > 0 ? roundToDecimals((longWinCount / longTradesCount) * 100, 1) : 0,
      },
      short: {
        trades: shortTradesCount,
        pnl: roundToDecimals(shortNetPnL, 2),
        winRate: shortTradesCount > 0 ? roundToDecimals((shortWinCount / shortTradesCount) * 100, 1) : 0,
      },
    },
    symbolPerformance,
    maxConsecutiveWins,
    maxConsecutiveLosses,
  };
}
