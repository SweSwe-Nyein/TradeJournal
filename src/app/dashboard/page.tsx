import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/src/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { useAuth } from '@/src/hooks/useAuth';
import { useTradingAccounts } from '@/src/hooks/useTradingAccounts';
import { TradeService } from '@/src/lib/services/trade-service';
import { GoalList } from '@/src/components/goals/goal-list';
import type { TradeWithAccount } from '@/src/types/trade';
import {
  calculateDashboardMetrics,
  filterTradesByDateRange,
  type DateRangeType,
} from '@/src/lib/calculations/dashboard';
import { formatCurrency, formatPercentage } from '@/src/lib/formatting/currency';
import {
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Filter,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    isLoading: accountsLoading,
  } = useTradingAccounts();

  const [trades, setTrades] = useState<TradeWithAccount[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Date Range state
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Timezone resolution
  const timezone = useMemo(() => {
    return selectedAccount?.timezone || profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }, [selectedAccount, profile]);

  // Fetch trades on mount or account change
  useEffect(() => {
    async function loadTrades() {
      if (!user) {
        setIsLoadingTrades(false);
        return;
      }
      setIsLoadingTrades(true);
      setError(null);

      try {
        const { data, error: sbErr } = await TradeService.getTrades(user.id, {
          trading_account_id: selectedAccountId && selectedAccountId !== 'all' ? selectedAccountId : undefined,
          limit: 2000,
        });

        if (sbErr) {
          setError(sbErr.message);
          setTrades([]);
        } else {
          setTrades(data || []);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load trades');
        setTrades([]);
      } finally {
        setIsLoadingTrades(false);
      }
    }

    loadTrades();
  }, [user, selectedAccountId]);

  // Filtered trades by date range
  const filteredTrades = useMemo(() => {
    return filterTradesByDateRange(trades, dateRange, customStart, customEnd, timezone);
  }, [trades, dateRange, customStart, customEnd, timezone]);

  // Starting balance for active scope
  const startingBalance = useMemo(() => {
    if (selectedAccountId === 'all') {
      return accounts.reduce((sum, acc) => sum + (Number(acc.starting_balance) || 0), 0);
    }
    return Number(selectedAccount?.starting_balance) || 0;
  }, [selectedAccountId, accounts, selectedAccount]);

  // Currency
  const currency = selectedAccount?.currency || 'USD';

  // Metrics calculation
  const metrics = useMemo(() => {
    return calculateDashboardMetrics(filteredTrades, startingBalance);
  }, [filteredTrades, startingBalance]);

  // Recent 5 trades
  const recentTrades = useMemo(() => {
    return [...filteredTrades]
      .sort((a, b) => new Date(b.exit_time || b.entry_time).getTime() - new Date(a.exit_time || a.entry_time).getTime())
      .slice(0, 5);
  }, [filteredTrades]);

  const isProfit = metrics.netPnL > 0;
  const isLoss = metrics.netPnL < 0;

  return (
    <div className="space-y-6">
      {/* Header with Account & Date Range Controls */}
      <PageHeader
        category="Dashboard"
        title="Trading Overview"
        description="Real-time performance analytics, equity curve, and execution journal."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Account Selector */}
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            >
              <option value="all">All Accounts ({accounts.length})</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.broker_name || 'Broker'})
                </option>
              ))}
            </select>

            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeType)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>

            <Link to="/import">
              <Button size="sm" className="gap-1.5 text-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Custom Date Range Inputs if 'custom' selected */}
      {dateRange === 'custom' && (
        <Card className="p-4 bg-zinc-900/50 border-zinc-800 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-mono">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-mono">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs"
            />
          </div>
          <span className="text-zinc-500 font-mono text-[11px]">Timezone: {timezone}</span>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card className="p-4 bg-rose-950/20 border-rose-900/40 text-rose-400 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Error loading dashboard trades: {error}</span>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net P&L */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="uppercase tracking-wider font-mono text-[11px]">Net P&amp;L</CardDescription>
              {isProfit && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
              {isLoss && <ArrowDownRight className="w-4 h-4 text-rose-400" />}
              {!isProfit && !isLoss && <Minus className="w-4 h-4 text-zinc-500" />}
            </div>
            <CardTitle
              className={`text-2xl font-mono tabular-nums ${
                isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-100'
              }`}
            >
              {formatCurrency(metrics.netPnL, { currency, showSign: true })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-zinc-400 font-mono">
            <span>{metrics.closedTradesCount} closed trades</span>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider font-mono text-[11px]">Win Rate</CardDescription>
            <CardTitle className="text-2xl font-mono tabular-nums text-zinc-100">
              {metrics.closedTradesCount > 0 ? `${metrics.winRate}%` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-zinc-400 font-mono">
            <span>
              {metrics.closedTradesCount > 0
                ? `${Math.round((metrics.winRate * metrics.closedTradesCount) / 100)} wins / ${
                    metrics.closedTradesCount - Math.round((metrics.winRate * metrics.closedTradesCount) / 100)
                  } losses`
                : 'No closed trades'}
            </span>
          </CardContent>
        </Card>

        {/* Profit Factor */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider font-mono text-[11px]">Profit Factor</CardDescription>
            <CardTitle className="text-2xl font-mono tabular-nums text-zinc-100">
              {metrics.closedTradesCount > 0 ? metrics.profitFactor : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-zinc-400 font-mono">
            <span>Gross wins / Gross losses</span>
          </CardContent>
        </Card>

        {/* Trade Expectancy */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider font-mono text-[11px]">Expectancy</CardDescription>
            <CardTitle
              className={`text-2xl font-mono tabular-nums ${
                metrics.expectancy > 0 ? 'text-emerald-400' : metrics.expectancy < 0 ? 'text-rose-400' : 'text-zinc-100'
              }`}
            >
              {metrics.closedTradesCount > 0 ? formatCurrency(metrics.expectancy, { currency, showSign: true }) : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-zinc-400 font-mono">
            <span>Average return per trade</span>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Max Drawdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider font-mono text-[11px]">Max Drawdown</CardDescription>
            <CardTitle className="text-xl font-mono tabular-nums text-rose-400">
              -{formatCurrency(metrics.maxDrawdown, { currency })} ({metrics.maxDrawdownPct}%)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-zinc-400 font-mono">
            <span>Peak-to-trough equity decline</span>
          </CardContent>
        </Card>

        {/* Total Trades & Volume */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider font-mono text-[11px]">Total Executions</CardDescription>
            <CardTitle className="text-xl font-mono tabular-nums text-zinc-100">{metrics.totalTrades}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-zinc-400 font-mono">
            <span>
              Long: {metrics.longVsShort.long.trades} | Short: {metrics.longVsShort.short.trades}
            </span>
          </CardContent>
        </Card>

        {/* Average R-Multiple */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider font-mono text-[11px]">Average R-Multiple</CardDescription>
            <CardTitle className="text-xl font-mono tabular-nums text-zinc-100">
              {metrics.avgR !== null ? `${metrics.avgR > 0 ? '+' : ''}${metrics.avgR}R` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-zinc-400 font-mono">
            <span>Risk-adjusted return multiple</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts: Equity Curve & Daily P&L */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Cumulative Equity Curve</CardTitle>
                <CardDescription>Portfolio balance timeline starting from initial capital</CardDescription>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 uppercase bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
                Live Engine
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTrades ? (
              <div className="h-64 flex items-center justify-center font-mono text-xs text-zinc-500 animate-pulse">
                Loading equity curve...
              </div>
            ) : metrics.equityCurve.length <= 1 ? (
              <div className="h-64 rounded border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center p-6 bg-zinc-950/30">
                <Activity className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-sm font-medium text-zinc-300">No Closed Trades in Scope</p>
                <p className="text-xs text-zinc-400 max-w-sm mt-1">
                  Import trades or record executions to render your interactive cumulative equity curve.
                </p>
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded shadow-lg text-xs font-mono space-y-1">
                              <p className="text-zinc-400">{data.date}</p>
                              <p className="text-emerald-400 font-bold">Equity: ${data.equity?.toLocaleString()}</p>
                              <p className={data.cumulativePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                Cumulative P&amp;L: ${data.cumulativePnL?.toLocaleString()}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#equityGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily P&L Bar Chart (1 col) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Daily Net P&amp;L</CardTitle>
                <CardDescription>Realized return per trading day</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTrades ? (
              <div className="h-64 flex items-center justify-center font-mono text-xs text-zinc-500 animate-pulse">
                Loading daily P&L...
              </div>
            ) : metrics.dailyPnL.length === 0 ? (
              <div className="h-64 rounded border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center p-6 bg-zinc-950/30">
                <BarChart className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-sm font-medium text-zinc-300">No Daily Data</p>
                <p className="text-xs text-zinc-400 max-w-xs mt-1">
                  Daily net P&amp;L bars will appear here once trades are completed.
                </p>
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.dailyPnL} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-zinc-900 border border-zinc-800 p-2 rounded shadow-lg text-xs font-mono space-y-1">
                              <p className="text-zinc-400">{data.date}</p>
                              <p className={data.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                Net P&amp;L: ${data.pnl?.toLocaleString()}
                              </p>
                              <p className="text-zinc-300">Trades: {data.tradesCount}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="pnl"
                      fill="#10b981"
                      shape={(props: any) => {
                        const { x, y, width, height, payload } = props;
                        const fill = payload.pnl >= 0 ? '#10b981' : '#f43f5e';
                        return <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} />;
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Breakdown & Calendar Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Symbol Performance (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Performance by Symbol</CardTitle>
                <CardDescription>Top and worst performing tickers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {metrics.symbolPerformance.length === 0 ? (
              <div className="h-48 rounded border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center p-6 bg-zinc-950/30 text-xs text-zinc-400">
                No symbol data available in this date range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="pb-2.5 font-medium">Symbol</th>
                      <th className="pb-2.5 font-medium text-right">Trades</th>
                      <th className="pb-2.5 font-medium text-right">Win Rate</th>
                      <th className="pb-2.5 font-medium text-right">Net P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {metrics.symbolPerformance.map((sym) => (
                      <tr key={sym.symbol} className="hover:bg-zinc-900/40">
                        <td className="py-2.5 font-bold text-zinc-200">{sym.symbol}</td>
                        <td className="py-2.5 text-right text-zinc-300">{sym.trades}</td>
                        <td className="py-2.5 text-right text-zinc-300">{sym.winRate}%</td>
                        <td
                          className={`py-2.5 text-right font-bold ${
                            sym.netPnl > 0 ? 'text-emerald-400' : sym.netPnl < 0 ? 'text-rose-400' : 'text-zinc-300'
                          }`}
                        >
                          {formatCurrency(sym.netPnl, { currency, showSign: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar Preview Widget (1 col) */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Monthly Calendar</CardTitle>
                <Link to="/calendar" className="text-xs text-emerald-400 hover:underline font-mono flex items-center gap-1">
                  Full View <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <CardDescription>Quick overview of recent trading days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-center space-y-3">
                <CalendarIcon className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
                <p className="text-xs text-zinc-300 font-medium">
                  Inspect daily P&amp;L, journal reviews, and discipline scores in the monthly calendar grid.
                </p>
                <Link to="/calendar">
                  <Button variant="outline" size="sm" className="w-full text-xs font-mono mt-2">
                    Open Trading Calendar
                  </Button>
                </Link>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Recent Trades Table */}
      <GoalList />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Recent Executions</CardTitle>
              <CardDescription>Latest closed and active trade logs</CardDescription>
            </div>
            <Link to="/trades" className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-mono">
              View all trades <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTrades ? (
            <div className="p-8 text-center text-xs font-mono text-zinc-500 animate-pulse">Loading recent trades...</div>
          ) : recentTrades.length === 0 ? (
            <div className="rounded border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-400 font-mono">
              No executions found. Import a CSV or log your first trade to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Symbol</th>
                    <th className="pb-3 font-medium">Direction</th>
                    <th className="pb-3 font-medium text-right">Net P&amp;L</th>
                    <th className="pb-3 font-medium text-right">R-Multiple</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {recentTrades.map((t) => {
                    const netPnl = Number(t.net_pnl) || 0;
                    const isWin = netPnl > 0;
                    const isLoss = netPnl < 0;
                    return (
                      <tr key={t.id} className="hover:bg-zinc-900/40 cursor-pointer" onClick={() => navigate(`/trades/${t.id}`)}>
                        <td className="py-3 text-zinc-400">
                          {new Date(t.exit_time || t.entry_time).toLocaleDateString()}
                        </td>
                        <td className="py-3 font-bold text-zinc-200">{t.symbol}</td>
                        <td className="py-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                              t.direction === 'long'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40'
                                : 'bg-rose-950/60 text-rose-400 border border-rose-900/40'
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td
                          className={`py-3 text-right font-bold ${
                            isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-300'
                          }`}
                        >
                          {formatCurrency(netPnl, { currency, showSign: true })}
                        </td>
                        <td className="py-3 text-right text-zinc-300">
                          {t.r_multiple !== null && t.r_multiple !== undefined
                            ? `${t.r_multiple > 0 ? '+' : ''}${t.r_multiple}R`
                            : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-100 font-mono"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/trades/${t.id}`);
                            }}
                          >
                            Details →
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
