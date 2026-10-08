import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/src/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { useAuth } from '@/src/hooks/useAuth';
import { useTradingAccounts } from '@/src/hooks/useTradingAccounts';
import { TradeService } from '@/src/lib/services/trade-service';
import { StrategyService } from '@/src/lib/services/strategy-service';
import type { TradeWithAccount } from '@/src/types/trade';
import type { Strategy } from '@/src/types/journal-metadata';
import {
  calculateDetailedAnalytics,
  type DetailedAnalyticsResult,
} from '@/src/lib/calculations/analytics-engine';
import { filterTradesByDateRange, type DateRangeType } from '@/src/lib/calculations/dashboard';
import { formatCurrency, formatPercentage } from '@/src/lib/formatting/currency';
import {
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Clock,
  Calendar,
  AlertCircle,
  BarChart3,
  SlidersHorizontal,
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

export function AnalyticsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
  } = useTradingAccounts();

  const [trades, setTrades] = useState<TradeWithAccount[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Global filters
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('all');
  const [selectedSymbolFilter, setSelectedSymbolFilter] = useState<string>('all');

  // Timezone resolution
  const timezone = useMemo(() => {
    return selectedAccount?.timezone || profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }, [selectedAccount, profile]);

  // Fetch trades and strategies on mount or account change
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const [tradesRes, stratRes] = await Promise.all([
          TradeService.getTrades(user.id, {
            trading_account_id: selectedAccountId && selectedAccountId !== 'all' ? selectedAccountId : undefined,
            limit: 3000,
          }),
          StrategyService.listStrategies(user.id),
        ]);

        if (tradesRes.error) {
          setError(tradesRes.error.message);
          setTrades([]);
        } else {
          setTrades(tradesRes.data || []);
        }

        if (!stratRes.error && stratRes.data) {
          setStrategies(stratRes.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics data');
        setTrades([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user, selectedAccountId]);

  // Unique symbols available across trades
  const availableSymbols = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => {
      if (t.symbol) set.add(t.symbol.toUpperCase());
    });
    return Array.from(set).sort();
  }, [trades]);

  // Filter trades by date range, strategy, and symbol
  const filteredTrades = useMemo(() => {
    let result = filterTradesByDateRange(trades, dateRange, customStart, customEnd, timezone);

    if (selectedStrategyId && selectedStrategyId !== 'all') {
      result = result.filter((t) => {
        if (selectedStrategyId === 'unassigned') {
          const hasStrat = (t.strategies && t.strategies.length > 0) || Boolean(t.strategy);
          return !hasStrat;
        }
        if (t.strategy_ids?.includes(selectedStrategyId)) return true;
        if (t.strategies?.some((s) => s.id === selectedStrategyId)) return true;
        return false;
      });
    }

    if (selectedSymbolFilter && selectedSymbolFilter !== 'all') {
      result = result.filter((t) => t.symbol?.toUpperCase() === selectedSymbolFilter.toUpperCase());
    }

    return result;
  }, [trades, dateRange, customStart, customEnd, timezone, selectedStrategyId, selectedSymbolFilter]);

  // Starting balance
  const startingBalance = useMemo(() => {
    if (selectedAccountId === 'all') {
      return accounts.reduce((sum, acc) => sum + (Number(acc.starting_balance) || 0), 0);
    }
    return Number(selectedAccount?.starting_balance) || 0;
  }, [selectedAccountId, accounts, selectedAccount]);

  const currency = selectedAccount?.currency || 'USD';

  // Detailed analytics calculation
  const analytics: DetailedAnalyticsResult = useMemo(() => {
    return calculateDetailedAnalytics(filteredTrades, startingBalance, timezone);
  }, [filteredTrades, startingBalance, timezone]);

  return (
    <div className="space-y-6">
      {/* Page Header & Global Controls */}
      <PageHeader
        category="Analytics"
        title="Performance Analytics & Edge Verification"
        description="Comprehensive attribution: drawdown curves, session behavior, risk metrics, and playbook execution."
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
                  {acc.name}
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

            {/* Strategy Filter */}
            <select
              value={selectedStrategyId}
              onChange={(e) => setSelectedStrategyId(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            >
              <option value="all">All Strategies</option>
              <option value="unassigned">No Strategy</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Symbol Filter */}
            <select
              value={selectedSymbolFilter}
              onChange={(e) => setSelectedSymbolFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            >
              <option value="all">All Symbols</option>
              {availableSymbols.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Custom Date Range Picker */}
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

      {error && (
        <Card className="p-4 bg-rose-950/20 border-rose-900/40 text-rose-400 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Error: {error}</span>
        </Card>
      )}

      {/* Performance Overview Grid (16 Key Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardHeader className="pb-1.5">
            <CardDescription className="text-[10px] uppercase font-mono">Net P&amp;L</CardDescription>
            <CardTitle
              className={`text-lg font-mono tabular-nums ${
                analytics.netPnL > 0 ? 'text-emerald-400' : analytics.netPnL < 0 ? 'text-rose-400' : 'text-zinc-100'
              }`}
            >
              {formatCurrency(analytics.netPnL, { currency, showSign: true })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardDescription className="text-[10px] uppercase font-mono">Gross P&amp;L</CardDescription>
            <CardTitle className="text-lg font-mono tabular-nums text-zinc-100">
              {formatCurrency(analytics.grossPnL, { currency, showSign: true })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardDescription className="text-[10px] uppercase font-mono">Win Rate</CardDescription>
            <CardTitle className="text-lg font-mono tabular-nums text-zinc-100">{analytics.winRate}%</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardDescription className="text-[10px] uppercase font-mono">Profit Factor</CardDescription>
            <CardTitle className="text-lg font-mono tabular-nums text-zinc-100">{analytics.profitFactor}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardDescription className="text-[10px] uppercase font-mono">Expectancy</CardDescription>
            <CardTitle
              className={`text-lg font-mono tabular-nums ${
                analytics.expectancy > 0 ? 'text-emerald-400' : analytics.expectancy < 0 ? 'text-rose-400' : 'text-zinc-100'
              }`}
            >
              {formatCurrency(analytics.expectancy, { currency, showSign: true })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardDescription className="text-[10px] uppercase font-mono">Average R</CardDescription>
            <CardTitle className="text-lg font-mono tabular-nums text-zinc-100">
              {analytics.avgR !== null ? `${analytics.avgR > 0 ? '+' : ''}${analytics.avgR}R` : '—'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardDescription className="text-[10px] uppercase font-mono">Avg Winner</CardDescription>
            <CardTitle className="text-lg font-mono tabular-nums text-emerald-400">
              {formatCurrency(analytics.avgWinner, { currency })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardDescription className="text-[10px] uppercase font-mono">Avg Loser</CardDescription>
            <CardTitle className="text-lg font-mono tabular-nums text-rose-400">
              -{formatCurrency(analytics.avgLoser, { currency })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardDescription className="text-[10px] uppercase font-mono">Largest Win</CardDescription>
            <CardTitle className="text-lg font-mono tabular-nums text-emerald-400">
              {formatCurrency(analytics.largestWinner, { currency, showSign: true })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardDescription className="text-[10px] uppercase font-mono">Largest Loss</CardDescription>
            <CardTitle className="text-lg font-mono tabular-nums text-rose-400">
              {formatCurrency(analytics.largestLoser, { currency, showSign: true })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardDescription className="text-[10px] uppercase font-mono">Total Trades</CardDescription>
            <CardTitle className="text-lg font-mono tabular-nums text-zinc-100">{analytics.totalTrades}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardDescription className="text-[10px] uppercase font-mono">Max Drawdown</CardDescription>
            <CardTitle className="text-lg font-mono tabular-nums text-rose-400">
              -{formatCurrency(analytics.maxDrawdown, { currency })} ({analytics.maxDrawdownPct}%)
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Equity & Drawdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cumulative Equity Curve</CardTitle>
            <CardDescription>Portfolio balance timeline</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.equityCurve.length <= 1 ? (
              <div className="h-64 flex items-center justify-center font-mono text-xs text-zinc-500">
                No closed trades for equity curve.
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
                    <YAxis stroke="#71717a" fontSize={10} domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs font-mono space-y-1">
                              <p className="text-zinc-400">{d.date}</p>
                              <p className="text-emerald-400 font-bold">Equity: ${d.equity?.toLocaleString()}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} fill="url(#eqGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Drawdown Curve</CardTitle>
            <CardDescription>Peak-to-trough portfolio decline ($)</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.equityCurve.length <= 1 ? (
              <div className="h-64 flex items-center justify-center font-mono text-xs text-zinc-500">
                No closed trades for drawdown curve.
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
                    <YAxis stroke="#71717a" fontSize={10} domain={['auto', 'auto']} tickFormatter={(v) => `-$${v}`} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs font-mono space-y-1">
                              <p className="text-zinc-400">{d.date}</p>
                              <p className="text-rose-400 font-bold">Drawdown: -${d.drawdown?.toLocaleString()} ({d.drawdownPct}%)</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="drawdown" stroke="#f43f5e" strokeWidth={2} fill="url(#ddGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Direction & Streaks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Direction Analysis */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Long vs Short Performance</CardTitle>
            <CardDescription>Comparative edge between direction biases</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-4 space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 uppercase text-xs">Long Trades</span>
                <span className="text-xs text-zinc-400">{analytics.directionAnalytics.long.trades} trades</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Net P&amp;L:</span>
                <span className={analytics.directionAnalytics.long.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {formatCurrency(analytics.directionAnalytics.long.pnl, { currency, showSign: true })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Win Rate:</span>
                <span className="text-zinc-200">{analytics.directionAnalytics.long.winRate}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Profit Factor:</span>
                <span className="text-zinc-200">{analytics.directionAnalytics.long.profitFactor}</span>
              </div>
            </div>

            <div className="rounded-lg border border-rose-900/40 bg-rose-950/10 p-4 space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-400 uppercase text-xs">Short Trades</span>
                <span className="text-xs text-zinc-400">{analytics.directionAnalytics.short.trades} trades</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Net P&amp;L:</span>
                <span className={analytics.directionAnalytics.short.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {formatCurrency(analytics.directionAnalytics.short.pnl, { currency, showSign: true })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Win Rate:</span>
                <span className="text-zinc-200">{analytics.directionAnalytics.short.winRate}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Profit Factor:</span>
                <span className="text-zinc-200">{analytics.directionAnalytics.short.profitFactor}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streaks Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Execution Streaks</CardTitle>
            <CardDescription>Consecutive win &amp; loss momentum</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded bg-zinc-950/50 border border-zinc-800">
              <span className="text-zinc-400">Max Winning Streak</span>
              <span className="text-emerald-400 font-bold text-sm">{analytics.streaks.maxWinningStreak} trades</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-zinc-950/50 border border-zinc-800">
              <span className="text-zinc-400">Max Losing Streak</span>
              <span className="text-rose-400 font-bold text-sm">{analytics.streaks.maxLosingStreak} trades</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-zinc-950/50 border border-zinc-800">
              <span className="text-zinc-400">Current Streak</span>
              <span
                className={`font-bold text-sm ${
                  analytics.streaks.currentStreak.type === 'win'
                    ? 'text-emerald-400'
                    : analytics.streaks.currentStreak.type === 'loss'
                    ? 'text-rose-400'
                    : 'text-zinc-300'
                }`}
              >
                {analytics.streaks.currentStreak.count > 0
                  ? `${analytics.streaks.currentStreak.count} ${analytics.streaks.currentStreak.type}(s)`
                  : 'None'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Symbol Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Symbol Performance Breakdown</CardTitle>
          <CardDescription>Edge and profitability per ticker symbol</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.symbolAnalytics.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 font-mono">No symbol metrics available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="pb-3 font-medium">Symbol</th>
                    <th className="pb-3 font-medium text-right">Trades</th>
                    <th className="pb-3 font-medium text-right">Win Rate</th>
                    <th className="pb-3 font-medium text-right">Profit Factor</th>
                    <th className="pb-3 font-medium text-right">Expectancy</th>
                    <th className="pb-3 font-medium text-right">Net P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {analytics.symbolAnalytics.map((s) => (
                    <tr key={s.symbol} className="hover:bg-zinc-900/40">
                      <td className="py-3 font-bold text-zinc-200">{s.symbol}</td>
                      <td className="py-3 text-right text-zinc-300">{s.trades}</td>
                      <td className="py-3 text-right text-zinc-300">{s.winRate}%</td>
                      <td className="py-3 text-right text-zinc-300">{s.profitFactor}</td>
                      <td className="py-3 text-right text-zinc-300">{formatCurrency(s.expectancy, { currency })}</td>
                      <td
                        className={`py-3 text-right font-bold ${
                          s.netPnl > 0 ? 'text-emerald-400' : s.netPnl < 0 ? 'text-rose-400' : 'text-zinc-300'
                        }`}
                      >
                        {formatCurrency(s.netPnl, { currency, showSign: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategy Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Strategy &amp; Playbook Attribution</CardTitle>
          <CardDescription>Performance grouped by playbook setup (includes unassigned trades)</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.strategyAnalytics.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 font-mono">No strategy metrics available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="pb-3 font-medium">Strategy</th>
                    <th className="pb-3 font-medium text-right">Trades</th>
                    <th className="pb-3 font-medium text-right">Win Rate</th>
                    <th className="pb-3 font-medium text-right">Profit Factor</th>
                    <th className="pb-3 font-medium text-right">Expectancy</th>
                    <th className="pb-3 font-medium text-right">Net P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {analytics.strategyAnalytics.map((st) => (
                    <tr key={st.name} className="hover:bg-zinc-900/40">
                      <td className="py-3 font-bold text-zinc-200">{st.name}</td>
                      <td className="py-3 text-right text-zinc-300">{st.trades}</td>
                      <td className="py-3 text-right text-zinc-300">{st.winRate}%</td>
                      <td className="py-3 text-right text-zinc-300">{st.profitFactor}</td>
                      <td className="py-3 text-right text-zinc-300">{formatCurrency(st.expectancy, { currency })}</td>
                      <td
                        className={`py-3 text-right font-bold ${
                          st.netPnl > 0 ? 'text-emerald-400' : st.netPnl < 0 ? 'text-rose-400' : 'text-zinc-300'
                        }`}
                      >
                        {formatCurrency(st.netPnl, { currency, showSign: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session, Day of Week & Hourly Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trading Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Session Analysis</CardTitle>
            <CardDescription>Asian, London &amp; New York performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-xs">
            {analytics.sessionAnalytics.map((s) => (
              <div key={s.session} className="p-3 rounded bg-zinc-950/40 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-zinc-200">{s.session}</p>
                  <p className="text-[11px] text-zinc-400">{s.trades} trades · {s.winRate}% win rate</p>
                </div>
                <span className={`font-bold ${s.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(s.pnl, { currency, showSign: true })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Day-of-Week Attribution</CardTitle>
            <CardDescription>Performance across weekdays (Timezone: {timezone})</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 font-mono text-xs">
            {analytics.dayOfWeekAnalytics.map((d) => (
              <div key={d.day} className="p-2.5 rounded bg-zinc-950/40 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-zinc-200">{d.day}</p>
                  <p className="text-[11px] text-zinc-400">{d.trades} trades · {d.winRate}% wins</p>
                </div>
                <span className={`font-bold ${d.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(d.pnl, { currency, showSign: true })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Holding Duration Buckets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Duration Buckets</CardTitle>
            <CardDescription>Trade holding time analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-xs">
            {analytics.durationAnalytics.map((b) => (
              <div key={b.bucket} className="p-3 rounded bg-zinc-950/40 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-zinc-200">{b.bucket}</p>
                  <p className="text-[11px] text-zinc-400">{b.trades} trades · {b.winRate}% win rate</p>
                </div>
                <span className={`font-bold ${b.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(b.pnl, { currency, showSign: true })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Best & Worst Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Trades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top 5 Winning Executions</CardTitle>
            <CardDescription>Most profitable individual trades</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.bestTrades.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 font-mono">No winning trades found.</div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {analytics.bestTrades.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/trades/${t.id}`)}
                    className="p-3 rounded bg-zinc-950/40 border border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-900/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{t.symbol}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-950 text-emerald-400 border border-emerald-900/40">
                          {t.direction}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{new Date(t.exit_time || t.entry_time).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-400">{formatCurrency(t.net_pnl, { currency, showSign: true })}</p>
                      <p className="text-[11px] text-zinc-400">{t.r_multiple ? `${t.r_multiple}R` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Worst 5 Trades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top 5 Losing Executions</CardTitle>
            <CardDescription>Largest drawdowns per trade</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.worstTrades.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 font-mono">No losing trades found.</div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {analytics.worstTrades.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/trades/${t.id}`)}
                    className="p-3 rounded bg-zinc-950/40 border border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-900/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{t.symbol}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-rose-950 text-rose-400 border border-rose-900/40">
                          {t.direction}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{new Date(t.exit_time || t.entry_time).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-400">{formatCurrency(t.net_pnl, { currency, showSign: true })}</p>
                      <p className="text-[11px] text-zinc-400">{t.r_multiple ? `${t.r_multiple}R` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
