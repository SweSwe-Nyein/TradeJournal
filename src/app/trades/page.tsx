import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/src/components/ui/page-header';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useAuth } from '@/src/hooks/useAuth';
import { useTradingAccounts } from '@/src/hooks/useTradingAccounts';
import { useDebounce } from '@/src/hooks/useDebounce';
import { TradeService } from '@/src/lib/services/trade-service';
import { StrategyService } from '@/src/lib/services/strategy-service';
import { TagService } from '@/src/lib/services/tag-service';
import { MistakeService } from '@/src/lib/services/mistake-service';
import type { Strategy, Tag as TagModel, Mistake as MistakeModel } from '@/src/types/journal-metadata';
import type { TradeWithAccount, TradePnlOutcome, TradeDirection } from '@/src/types/trade';
import type { TradeFormData } from '@/src/lib/validation/trade';
import { formatCurrency, formatPercentage } from '@/src/lib/formatting/currency';
import { formatDate } from '@/src/lib/formatting/date';
import { formatTradeDuration } from '@/src/lib/formatting/duration';
import { TradeFormDialog } from '@/src/components/trades/trade-form-dialog';
import { DeleteTradeDialog } from '@/src/components/trades/delete-trade-dialog';
import {
  Upload,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Layers,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Landmark,
  TrendingUp,
  Tag,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export function TradesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useTradingAccounts();

  // Search and debounce
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Filters
  const [accountFilter, setAccountFilter] = useState<string>(selectedAccountId || 'all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'long' | 'short'>('all');
  const [pnlFilter, setPnlFilter] = useState<TradePnlOutcome>('all');
  const [symbolFilter, setSymbolFilter] = useState<string>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [mistakeFilter, setMistakeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'entry_time' | 'net_pnl' | 'symbol' | 'quantity' | 'r_multiple'>('entry_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data state
  const [trades, setTrades] = useState<TradeWithAccount[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tradeToEdit, setTradeToEdit] = useState<TradeWithAccount | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<TradeWithAccount | null>(null);

  // Sync account filter when global selector changes
  useEffect(() => {
    if (selectedAccountId && selectedAccountId !== accountFilter) {
      setAccountFilter(selectedAccountId);
      setPage(1);
    }
  }, [selectedAccountId]);

  // Compute number of active non-default filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (accountFilter !== 'all') count++;
    if (directionFilter !== 'all') count++;
    if (pnlFilter !== 'all') count++;
    if (symbolFilter !== 'all') count++;
    if (strategyFilter !== 'all') count++;
    if (tagFilter !== 'all') count++;
    if (mistakeFilter !== 'all') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (debouncedSearch) count++;
    return count;
  }, [
    accountFilter,
    directionFilter,
    pnlFilter,
    symbolFilter,
    strategyFilter,
    tagFilter,
    mistakeFilter,
    dateFrom,
    dateTo,
    debouncedSearch,
  ]);

  const clearFilters = () => {
    setSearchInput('');
    setAccountFilter('all');
    setSelectedAccountId('all');
    setDirectionFilter('all');
    setPnlFilter('all');
    setSymbolFilter('all');
    setStrategyFilter('all');
    setTagFilter('all');
    setMistakeFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // Load metadata from services for complete filtering options
  const [dbStrategies, setDbStrategies] = useState<Strategy[]>([]);
  const [dbTags, setDbTags] = useState<TagModel[]>([]);
  const [dbMistakes, setDbMistakes] = useState<MistakeModel[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      StrategyService.listStrategies(user.id),
      TagService.listTags(user.id),
      MistakeService.listMistakes(user.id),
    ]).then(([sRes, tRes, mRes]) => {
      if (sRes.data) setDbStrategies(sRes.data);
      if (tRes.data) setDbTags(tRes.data);
      if (mRes.data) setDbMistakes(mRes.data);
    });
  }, [user]);

  // Unique options for filter dropdowns derived from registered metadata and currently loaded trades
  const { availableStrategies, availableTags, availableMistakes, availableSymbols } = useMemo(() => {
    const stratSet = new Set<string>();
    const tagSet = new Set<string>();
    const mistakeSet = new Set<string>();
    const symbolSet = new Set<string>();

    // Add registered user entities
    dbStrategies.forEach((s) => s.name && stratSet.add(s.name));
    dbTags.forEach((t) => t.name && tagSet.add(t.name));
    dbMistakes.forEach((m) => m.name && mistakeSet.add(m.name));

    // Also include any trade-specific names
    trades.forEach((t) => {
      if (t.strategy) stratSet.add(t.strategy);
      if (t.strategies) t.strategies.forEach((s) => s.name && stratSet.add(s.name));
      if (t.symbol) symbolSet.add(t.symbol);
      if (t.tags && Array.isArray(t.tags)) {
        t.tags.forEach((tag) => tag && tagSet.add(tag));
      }
      if (t.tags_list && Array.isArray(t.tags_list)) {
        t.tags_list.forEach((tag) => tag.name && tagSet.add(tag.name));
      }
      if (t.mistakes && Array.isArray(t.mistakes)) {
        t.mistakes.forEach((m) => m && mistakeSet.add(m));
      }
      if (t.mistakes_list && Array.isArray(t.mistakes_list)) {
        t.mistakes_list.forEach((m) => m.name && mistakeSet.add(m.name));
      }
    });

    return {
      availableStrategies: Array.from(stratSet).sort(),
      availableTags: Array.from(tagSet).sort(),
      availableMistakes: Array.from(mistakeSet).sort(),
      availableSymbols: Array.from(symbolSet).sort(),
    };
  }, [trades, dbStrategies, dbTags, dbMistakes]);

  // Summary statistics for displayed results
  const summaryStats = useMemo(() => {
    if (trades.length === 0) {
      return { totalPnl: 0, winCount: 0, lossCount: 0, breakevenCount: 0, winRate: 0, avgR: null };
    }
    let totalPnl = 0;
    let winCount = 0;
    let lossCount = 0;
    let breakevenCount = 0;
    let totalR = 0;
    let rCount = 0;

    trades.forEach((t) => {
      totalPnl += Number(t.net_pnl) || 0;
      if (t.net_pnl > 0) winCount++;
      else if (t.net_pnl < 0) lossCount++;
      else breakevenCount++;

      if (t.r_multiple !== null && t.r_multiple !== undefined) {
        totalR += Number(t.r_multiple);
        rCount++;
      }
    });

    const closedCount = winCount + lossCount + breakevenCount;
    const winRate = closedCount > 0 ? (winCount / closedCount) * 100 : 0;
    const avgR = rCount > 0 ? totalR / rCount : null;

    return { totalPnl, winCount, lossCount, breakevenCount, winRate, avgR };
  }, [trades]);

  // Query trades from database
  const fetchTrades = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const filters = {
        trading_account_id: accountFilter !== 'all' ? accountFilter : undefined,
        direction: directionFilter !== 'all' ? (directionFilter as TradeDirection) : undefined,
        pnl_outcome: pnlFilter !== 'all' ? pnlFilter : undefined,
        symbol: symbolFilter !== 'all' ? symbolFilter : undefined,
        strategy: strategyFilter !== 'all' ? strategyFilter : undefined,
        tag: tagFilter !== 'all' ? tagFilter : undefined,
        mistake: mistakeFilter !== 'all' ? mistakeFilter : undefined,
        from_date: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        to_date: dateTo ? new Date(dateTo).toISOString() : undefined,
        search_query: debouncedSearch || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };

      const res = await TradeService.getTrades(user.id, filters);
      setTrades(res.data || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error('Failed to query trades:', err);
      setTrades([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    user,
    accountFilter,
    directionFilter,
    pnlFilter,
    symbolFilter,
    strategyFilter,
    tagFilter,
    mistakeFilter,
    dateFrom,
    dateTo,
    debouncedSearch,
    sortBy,
    sortOrder,
    page,
    pageSize,
  ]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Toggle sort order
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Create trade handler
  const handleCreateSubmit = async (data: TradeFormData) => {
    if (!user) return { error: new Error('User not found') };
    const res = await TradeService.createTrade(user.id, {
      trading_account_id: data.trading_account_id,
      symbol: data.symbol,
      direction: data.direction,
      entry_time: data.entry_time,
      exit_time: data.exit_time || null,
      entry_price: data.entry_price,
      exit_price: data.exit_price || null,
      quantity: data.quantity,
      stop_loss: data.stop_loss || null,
      take_profit: data.take_profit || null,
      commission: data.commission,
      fees: data.fees,
      swap: data.swap,
      risk_amount: data.risk_amount || null,
      status: data.status,
      strategies: (data as any).strategies || [],
      strategy_ids: (data as any).strategy_ids || [],
      strategy: data.strategy || ((data as any).strategies?.[0]) || null,
      tags: data.tags || [],
      tag_ids: (data as any).tag_ids || [],
      mistakes: data.mistakes || [],
      mistake_ids: (data as any).mistake_ids || [],
      notes: data.notes || null,
    });

    if (!res.error) {
      fetchTrades();
    }
    return { error: res.error };
  };

  // Edit trade handler
  const handleEditSubmit = async (data: TradeFormData) => {
    if (!user || !tradeToEdit) return { error: new Error('User or trade not found') };
    const res = await TradeService.updateTrade(user.id, tradeToEdit.id, {
      trading_account_id: data.trading_account_id,
      symbol: data.symbol,
      direction: data.direction,
      entry_time: data.entry_time,
      exit_time: data.exit_time || null,
      entry_price: data.entry_price,
      exit_price: data.exit_price || null,
      quantity: data.quantity,
      stop_loss: data.stop_loss || null,
      take_profit: data.take_profit || null,
      commission: data.commission,
      fees: data.fees,
      swap: data.swap,
      risk_amount: data.risk_amount || null,
      status: data.status,
      strategies: (data as any).strategies || [],
      strategy_ids: (data as any).strategy_ids || [],
      strategy: data.strategy || ((data as any).strategies?.[0]) || null,
      tags: data.tags || [],
      tag_ids: (data as any).tag_ids || [],
      mistakes: data.mistakes || [],
      mistake_ids: (data as any).mistake_ids || [],
      notes: data.notes || null,
    });

    if (!res.error) {
      fetchTrades();
    }
    return { error: res.error };
  };

  // Delete trade handler
  const handleDeleteConfirm = async (tradeId: string) => {
    if (!user) return { success: false, error: new Error('User not found') };
    const res = await TradeService.deleteTrade(user.id, tradeId);
    if (res.success) {
      fetchTrades();
    }
    return res;
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-8">
      {/* Header with Title and Primary Actions */}
      <PageHeader
        category="Trade Database"
        title="Trade Explorer"
        description="Filter, inspect, and analyze individual trade executions across your accounts."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTrades}
              className="text-xs h-8 gap-1.5"
              title="Refresh trade log"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Link to="/import">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import CSV</span>
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="gap-1.5 text-xs h-8 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Trade</span>
            </Button>
          </div>
        }
      />

      {/* Overview Metric Banner (TradeZella style) */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-zinc-900/40 border border-zinc-850 rounded-lg">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              Executions
            </span>
            <span className="text-base font-mono font-bold text-zinc-100">
              {totalCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-500 block font-mono">
              {summaryStats.winCount}W · {summaryStats.lossCount}L · {summaryStats.breakevenCount}BE
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              Win Rate
            </span>
            <span className="text-base font-mono font-bold text-zinc-100">
              {summaryStats.winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-500 block font-mono">
              on closed trades
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              Realized P&amp;L
            </span>
            <span
              className={`text-base font-mono font-bold ${
                summaryStats.totalPnl > 0
                  ? 'text-emerald-400'
                  : summaryStats.totalPnl < 0
                  ? 'text-rose-400'
                  : 'text-zinc-200'
              }`}
            >
              {formatCurrency(summaryStats.totalPnl, { showSign: true })}
            </span>
            <span className="text-[10px] text-zinc-500 block font-mono">
              page sample
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              Avg R Multiple
            </span>
            <span className="text-base font-mono font-bold text-zinc-100">
              {summaryStats.avgR !== null ? `${summaryStats.avgR > 0 ? '+' : ''}${summaryStats.avgR.toFixed(2)} R` : '—'}
            </span>
            <span className="text-[10px] text-zinc-500 block font-mono">
              risk-adjusted
            </span>
          </div>
        </div>
      )}

      {/* Main Filter Toolbar */}
      <div className="space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 bg-zinc-900/40 border border-zinc-850 rounded-lg">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
            <Input
              placeholder="Search symbol, notes, or execution memo..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs h-8 bg-zinc-950 border-zinc-800"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Outcome Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-mono text-zinc-500 uppercase mr-1 hidden sm:inline">P&amp;L:</span>
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'win', label: 'Wins' },
                { id: 'loss', label: 'Losses' },
                { id: 'breakeven', label: 'Break-Even' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPnlFilter(opt.id);
                  setPage(1);
                }}
                className={`text-xs px-2.5 py-1 rounded transition-colors font-mono cursor-pointer border ${
                  pnlFilter === opt.id
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700 font-medium'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:bg-zinc-850 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}

            {/* Direction Filter */}
            <select
              value={directionFilter}
              onChange={(e) => {
                setDirectionFilter(e.target.value as 'all' | 'long' | 'short');
                setPage(1);
              }}
              className="h-7 text-xs rounded border border-zinc-800 bg-zinc-900/80 px-2 text-zinc-300 font-mono focus:outline-none"
            >
              <option value="all">Side: All</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>

            {/* Toggle Advanced Filters */}
            <Button
              variant={isFilterPanelOpen || activeFiltersCount > 0 ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              className="text-xs h-7 px-2.5 gap-1.5"
            >
              <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-zinc-950 font-bold text-[10px] flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            {/* Clear Filters Button */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 transition-colors flex items-center gap-1 cursor-pointer font-mono"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filter Drawer */}
        {isFilterPanelOpen && (
          <div className="p-3.5 bg-zinc-900/70 border border-zinc-850 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-in fade-in-0 duration-150">
            {/* Account filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Account Scope</label>
              <select
                value={accountFilter}
                onChange={(e) => {
                  setAccountFilter(e.target.value);
                  setSelectedAccountId(e.target.value);
                  setPage(1);
                }}
                className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
              >
                <option value="all">All Accounts ({accounts.length})</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.account_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Symbol Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Symbol</label>
              <select
                value={symbolFilter}
                onChange={(e) => {
                  setSymbolFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200 font-mono"
              >
                <option value="all">All Symbols</option>
                {availableSymbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>

            {/* Strategy Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Strategy Setup</label>
              <select
                value={strategyFilter}
                onChange={(e) => {
                  setStrategyFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
              >
                <option value="all">All Strategies</option>
                {availableStrategies.map((strat) => (
                  <option key={strat} value={strat}>
                    {strat}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Tag</label>
              <select
                value={tagFilter}
                onChange={(e) => {
                  setTagFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200 font-mono"
              >
                <option value="all">All Tags</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>
            </div>

            {/* Mistakes Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Discipline / Mistake</label>
              <select
                value={mistakeFilter}
                onChange={(e) => {
                  setMistakeFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200 font-mono"
              >
                <option value="all">All Mistakes</option>
                {availableMistakes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>

            {/* Date To */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
          </div>
        )}

        {/* Active Filter Indicators Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-zinc-900/30 border border-zinc-850/80 rounded-md text-[11px] font-mono text-zinc-300">
            <span className="text-zinc-500 uppercase mr-1">Active:</span>

            {accountFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">
                Account: {accounts.find((a) => a.id === accountFilter)?.name || accountFilter}
                <button type="button" onClick={() => setAccountFilter('all')} className="hover:text-rose-400 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {symbolFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">
                Symbol: {symbolFilter}
                <button type="button" onClick={() => setSymbolFilter('all')} className="hover:text-rose-400 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {directionFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">
                Side: {directionFilter.toUpperCase()}
                <button type="button" onClick={() => setDirectionFilter('all')} className="hover:text-rose-400 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {pnlFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">
                Outcome: {pnlFilter.toUpperCase()}
                <button type="button" onClick={() => setPnlFilter('all')} className="hover:text-rose-400 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {strategyFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">
                Strategy: {strategyFilter}
                <button type="button" onClick={() => setStrategyFilter('all')} className="hover:text-rose-400 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {tagFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">
                Tag: #{tagFilter}
                <button type="button" onClick={() => setTagFilter('all')} className="hover:text-rose-400 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {mistakeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-rose-300">
                Mistake: {mistakeFilter}
                <button type="button" onClick={() => setMistakeFilter('all')} className="hover:text-rose-400 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {(dateFrom || dateTo) && (
              <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">
                Date: {dateFrom || 'start'} → {dateTo || 'end'}
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">
                Search: &quot;{debouncedSearch}&quot;
                <button type="button" onClick={() => setSearchInput('')} className="hover:text-rose-400 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={clearFilters}
              className="text-rose-400 hover:text-rose-300 underline ml-auto cursor-pointer"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[380px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-900 border-b border-zinc-850 font-mono text-zinc-400 uppercase tracking-wider text-[11px] sticky top-0 z-10">
                <tr>
                  {/* Date Column */}
                  <th
                    onClick={() => handleSort('entry_time')}
                    className="py-3 px-4 cursor-pointer hover:text-zinc-200 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date / Time</span>
                      {sortBy === 'entry_time' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                      )}
                    </div>
                  </th>

                  {/* Symbol Column */}
                  <th
                    onClick={() => handleSort('symbol')}
                    className="py-3 px-3 cursor-pointer hover:text-zinc-200 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Symbol</span>
                      {sortBy === 'symbol' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                      )}
                    </div>
                  </th>

                  {/* Direction */}
                  <th className="py-3 px-3">Direction</th>

                  {/* Prices */}
                  <th className="py-3 px-3 text-right">Entry</th>
                  <th className="py-3 px-3 text-right">Exit</th>

                  {/* Quantity */}
                  <th
                    onClick={() => handleSort('quantity')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-zinc-200 select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Qty</span>
                      {sortBy === 'quantity' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                      )}
                    </div>
                  </th>

                  {/* Net P&L Column */}
                  <th
                    onClick={() => handleSort('net_pnl')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-zinc-200 select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Net P&amp;L</span>
                      {sortBy === 'net_pnl' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                      )}
                    </div>
                  </th>

                  {/* R Multiple Column */}
                  <th
                    onClick={() => handleSort('r_multiple')}
                    className="py-3 px-3 text-center cursor-pointer hover:text-zinc-200 select-none"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>R</span>
                      {sortBy === 'r_multiple' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                      )}
                    </div>
                  </th>

                  {/* Strategy */}
                  <th className="py-3 px-3">Strategy</th>

                  {/* Tags */}
                  <th className="py-3 px-3">Tags</th>

                  {/* Duration */}
                  <th className="py-3 px-3 text-center">Duration</th>

                  {/* Row Actions */}
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-850/60 font-mono text-[11px]">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-zinc-400 font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />
                        <span>Querying trade executions...</span>
                      </div>
                    </td>
                  </tr>
                ) : trades.length > 0 ? (
                  trades.map((trade) => {
                    const isWin = trade.net_pnl > 0;
                    const isLoss = trade.net_pnl < 0;
                    const durationStr = formatTradeDuration(trade.entry_time, trade.exit_time);

                    return (
                      <tr
                        key={trade.id}
                        onClick={() => navigate(`/trades/${trade.id}`)}
                        className="hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                      >
                        {/* Date */}
                        <td className="py-2.5 px-4 text-zinc-300 whitespace-nowrap">
                          {formatDate(trade.entry_time)}
                        </td>

                        {/* Symbol */}
                        <td className="py-2.5 px-3 font-sans font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                          {trade.symbol}
                        </td>

                        {/* Direction */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`uppercase font-semibold text-[10px] px-1.5 py-0.5 rounded border ${
                              trade.direction === 'long'
                                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
                                : 'text-rose-400 bg-rose-950/60 border-rose-800/60'
                            }`}
                          >
                            {trade.direction}
                          </span>
                        </td>

                        {/* Entry */}
                        <td className="py-2.5 px-3 text-right tabular-nums text-zinc-200">
                          {Number(trade.entry_price).toFixed(2)}
                        </td>

                        {/* Exit */}
                        <td className="py-2.5 px-3 text-right tabular-nums text-zinc-400">
                          {trade.exit_price ? Number(trade.exit_price).toFixed(2) : 'Open'}
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3 text-right tabular-nums text-zinc-300">
                          {trade.quantity}
                        </td>

                        {/* Net P&L */}
                        <td
                          className={`py-2.5 px-4 text-right tabular-nums font-bold ${
                            isWin
                              ? 'text-emerald-400'
                              : isLoss
                              ? 'text-rose-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {formatCurrency(trade.net_pnl, { showSign: true })}
                        </td>

                        {/* R Multiple */}
                        <td className="py-2.5 px-3 text-center tabular-nums text-zinc-200">
                          {trade.r_multiple !== null
                            ? `${trade.r_multiple > 0 ? '+' : ''}${trade.r_multiple} R`
                            : '—'}
                        </td>

                        {/* Strategy */}
                        <td className="py-2.5 px-3 max-w-[150px]">
                          {trade.strategies && trade.strategies.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {trade.strategies.map((st) => (
                                <span
                                  key={st.id}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 whitespace-nowrap"
                                  title={st.name}
                                >
                                  {st.name}
                                </span>
                              ))}
                            </div>
                          ) : trade.strategy ? (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 whitespace-nowrap"
                              title={trade.strategy}
                            >
                              {trade.strategy}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>

                        {/* Tags & Mistakes */}
                        <td className="py-2.5 px-3 max-w-[170px]">
                          <div className="flex flex-wrap items-center gap-1">
                            {trade.tags_list && trade.tags_list.length > 0
                              ? trade.tags_list.slice(0, 3).map((tg) => (
                                  <span key={tg.id} className="text-sky-300 text-[10px] bg-sky-950/50 border border-sky-800/50 px-1 rounded">
                                    #{tg.name}
                                  </span>
                                ))
                              : (trade.tags || []).slice(0, 3).map((tg, idx) => (
                                  <span key={idx} className="text-sky-300 text-[10px] bg-sky-950/50 border border-sky-800/50 px-1 rounded">
                                    #{tg}
                                  </span>
                                ))}
                            {(trade.mistakes_list && trade.mistakes_list.length > 0
                              ? trade.mistakes_list
                              : (trade.mistakes || []).map((m) => ({ id: m, name: m }))
                            ).slice(0, 2).map((m) => (
                              <span
                                key={m.id}
                                className="text-rose-400 text-[10px] bg-rose-950/60 border border-rose-800/60 px-1 rounded font-mono"
                                title={`Mistake: ${m.name}`}
                              >
                                ⚠️ {m.name}
                              </span>
                            ))}
                            {((trade.tags?.length || 0) + (trade.mistakes?.length || 0) === 0) && (
                              <span className="text-zinc-600">—</span>
                            )}
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="py-2.5 px-3 text-center text-zinc-400 whitespace-nowrap">
                          {durationStr}
                        </td>

                        {/* Action buttons */}
                        <td
                          className="py-2.5 px-3 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/trades/${trade.id}`}
                              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                              title="View Trade Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => setTradeToEdit(trade)}
                              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
                              title="Edit Trade"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setTradeToDelete(trade)}
                              className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer"
                              title="Delete Trade"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="py-16 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400 mb-3 shadow-xs">
                          <Layers className="w-6 h-6 text-zinc-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-200">
                          {activeFiltersCount > 0 ? 'No matching executions' : 'No trades recorded yet'}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 mb-5 max-w-sm leading-relaxed">
                          {activeFiltersCount > 0
                            ? 'No trade records match your filter criteria. Try resetting filters or adjusting search keywords.'
                            : 'Start tracking performance by importing a broker statement or manually recording a trade.'}
                        </p>

                        <div className="flex items-center gap-2.5">
                          {activeFiltersCount > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearFilters}
                              className="text-xs gap-1.5"
                            >
                              <X className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Clear Filters</span>
                            </Button>
                          ) : (
                            <>
                              <Link to="/import">
                                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Import Trades</span>
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                onClick={() => setIsCreateOpen(true)}
                                className="text-xs gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Trade</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalCount > 0 && (
            <div className="p-3 border-t border-zinc-850 bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-zinc-400">
              <div className="flex items-center gap-3">
                <span>
                  Showing <strong className="text-zinc-200">{(page - 1) * pageSize + 1}</strong>–
                  <strong className="text-zinc-200">{Math.min(page * pageSize, totalCount)}</strong> of{' '}
                  <strong className="text-zinc-200">{totalCount.toLocaleString()}</strong> trades
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-[11px] text-zinc-500">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-6 rounded border border-zinc-800 bg-zinc-950 px-1.5 text-zinc-200 text-xs"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Prev / Next Pagination Controls */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 text-zinc-300"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>

                <span className="px-2 text-zinc-300 text-xs">
                  Page {page} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 text-zinc-300"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Trade Creation Dialog */}
      <TradeFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateSubmit}
        accounts={accounts}
        defaultAccountId={accountFilter !== 'all' ? accountFilter : undefined}
      />

      {/* Trade Edit Dialog */}
      <TradeFormDialog
        open={Boolean(tradeToEdit)}
        onOpenChange={(open) => {
          if (!open) setTradeToEdit(null);
        }}
        onSubmit={handleEditSubmit}
        accounts={accounts}
        tradeToEdit={tradeToEdit}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteTradeDialog
        open={Boolean(tradeToDelete)}
        onOpenChange={(open) => {
          if (!open) setTradeToDelete(null);
        }}
        trade={tradeToDelete}
        onConfirmDelete={handleDeleteConfirm}
      />
    </div>
  );
}
