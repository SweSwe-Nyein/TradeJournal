import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Clock,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Info,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import type {
  ForexConfirmationRecord,
  ForexMarketConfirmationResponse,
  BiasDirection,
  SetupStatus,
  DataFreshness,
} from '@/src/lib/forex/forex-types';
import { formatPrice } from '@/src/lib/forex/forex-calculations';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';

interface ForexTableProps {
  onRefreshRequested?: () => void;
}

export function ForexConfirmationTable({ onRefreshRequested }: ForexTableProps) {
  const [data, setData] = useState<ForexMarketConfirmationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPair, setExpandedPair] = useState<string | null>(null);
  const [biasFilter, setBiasFilter] = useState<'ALL' | 'LONG' | 'SHORT' | 'NEUTRAL' | 'READY'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const fetchData = useCallback(async (isManualTrigger = false) => {
    if (isManualTrigger) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await fetch('/api/forex/market-confirmation');
      if (!res.ok) {
        throw new Error(`API returned HTTP ${res.status}: ${res.statusText}`);
      }
      const json: ForexMarketConfirmationResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch forex confirmation';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManualCollect = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const res = await fetch('/api/forex/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || `Server responded with HTTP ${res.status}`);
      }

      if (body.data) {
        setData(body.data);
      } else {
        await fetchData(true);
      }

      if (onRefreshRequested) onRefreshRequested();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Manual market refresh failed';
      setError(msg);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getBiasBadge = (bias: BiasDirection) => {
    switch (bias) {
      case 'LONG':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <ArrowUpRight className="w-3.5 h-3.5" />
            LONG
          </span>
        );
      case 'SHORT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-xs bg-rose-950/80 text-rose-300 border border-rose-800/80">
            <ArrowDownRight className="w-3.5 h-3.5" />
            SHORT
          </span>
        );
      case 'NEUTRAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-semibold text-xs bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Minus className="w-3.5 h-3.5" />
            NEUTRAL
          </span>
        );
      case 'INSUFFICIENT DATA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] bg-amber-950/60 text-amber-300 border border-amber-800/60">
            <AlertTriangle className="w-3 h-3" />
            INSUFFICIENT
          </span>
        );
    }
  };

  const getSetupBadge = (status: SetupStatus) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
            <Sparkles className="w-3 h-3" />
            READY
          </span>
        );
      case 'MONITORING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] bg-sky-950/60 text-sky-300 border border-sky-800/60">
            <Clock className="w-3 h-3" />
            MONITORING
          </span>
        );
      case 'NO SETUP':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[11px] text-zinc-500 bg-zinc-900 border border-zinc-850">
            NO SETUP
          </span>
        );
      case 'INSUFFICIENT DATA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[11px] text-amber-500 bg-amber-950/30 border border-amber-900/40">
            NO DATA
          </span>
        );
    }
  };

  const getFreshnessBadge = (freshness: DataFreshness) => {
    switch (freshness) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live (&lt;20m)
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950 text-amber-400 border border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Stale (20-60m)
          </span>
        );
      case 'OUTDATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-950 text-rose-400 border border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Outdated (&gt;60m)
          </span>
        );
      case 'UNAVAILABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
            Data Unavailable
          </span>
        );
    }
  };

  // Filter pairs
  const filteredPairs = (data?.pairs || []).filter((item) => {
    const matchesSearch =
      item.pair.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.setupReason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.liquiditySweepStatus.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (biasFilter === 'LONG') return item.finalBias === 'LONG';
    if (biasFilter === 'SHORT') return item.finalBias === 'SHORT';
    if (biasFilter === 'NEUTRAL') return item.finalBias === 'NEUTRAL';
    if (biasFilter === 'READY') return item.setupStatus === 'READY';
    return true;
  });

  const sqlMigrationCode = `-- Run this in Supabase SQL Editor if table is missing:
CREATE TABLE IF NOT EXISTS public.forex_market_confirmation (
  pair TEXT PRIMARY KEY,
  price NUMERIC NOT NULL,
  price_timestamp TIMESTAMPTZ NOT NULL,
  adr_5 NUMERIC,
  adr_10 NUMERIC,
  adr_20 NUMERIC,
  today_high NUMERIC NOT NULL,
  today_low NUMERIC NOT NULL,
  today_range_pips NUMERIC NOT NULL,
  adr_percentage NUMERIC,
  pdh NUMERIC,
  pdl NUMERIC,
  pwh NUMERIC,
  pwl NUMERIC,
  asian_high NUMERIC,
  asian_low NUMERIC,
  liquidity_sweep_status TEXT NOT NULL DEFAULT 'None',
  sweep_level NUMERIC,
  sweep_timeframe TEXT,
  h1_bias TEXT NOT NULL DEFAULT 'NEUTRAL',
  m15_confirmation TEXT NOT NULL DEFAULT 'NONE',
  final_bias TEXT NOT NULL DEFAULT 'NEUTRAL',
  setup_status TEXT NOT NULL DEFAULT 'NO SETUP',
  setup_reason TEXT NOT NULL DEFAULT 'No setup detected',
  data_freshness TEXT NOT NULL DEFAULT 'UNAVAILABLE',
  delta_status TEXT NOT NULL DEFAULT 'N/A — unavailable from source',
  tick_volume NUMERIC,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  raw_meta JSONB
);

ALTER TABLE public.forex_market_confirmation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access to forex confirmation" ON public.forex_market_confirmation FOR SELECT USING (true);
CREATE POLICY "Allow insert and update for market data" ON public.forex_market_confirmation FOR ALL USING (true) WITH CHECK (true);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlMigrationCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Overview & Session Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-zinc-900/50 border border-zinc-850 rounded-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5 font-sans">
              <Compass className="w-4 h-4 text-emerald-400" />
              Forex Market Confirmation Table
            </h3>
            {data && getFreshnessBadge(data.dataFreshness)}
            <span className="text-[11px] font-mono text-zinc-500">
              Source: <strong className="text-zinc-400 font-medium">Twelve Data API</strong>
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-sans">
            Active Session:{' '}
            <span className="font-semibold text-emerald-400">
              {data?.currentSessionDescription || 'Calculating market session...'}
            </span>{' '}
            • London (08:00–16:30 UTC), NY (13:00–21:00 UTC), Asian (00:00–08:00 UTC)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSqlModalOpen(true)}
            className="text-xs h-8 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            title="View Supabase table schema"
          >
            <Layers className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            <span>SQL Schema</span>
          </Button>

          <Button
            size="sm"
            onClick={handleManualCollect}
            disabled={isRefreshing}
            className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Collecting Twelve Data...' : 'Refresh Market Data'}</span>
          </Button>
        </div>
      </div>

      {/* Delta Limitation Notice Card as per Requirement 5 */}
      <div className="p-3 bg-zinc-950/70 border border-zinc-850 rounded-lg flex items-start gap-2.5 text-xs">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-zinc-400 font-sans">
          <p>
            <strong className="text-zinc-200">Spot FX Volume Delta Notice:</strong> Spot foreign exchange is a decentralized OTC market without a consolidated global traded-volume delta tape. Order-flow delta is marked as <code className="text-zinc-300 font-mono text-[11px] bg-zinc-900 px-1 rounded">N/A — unavailable from source</code>. Where displayed, tick volume represents provider quote activity proxy, never true exchange delta.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchData()}
            className="text-rose-400 hover:text-rose-200 underline font-mono text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Controls: Search & Bias Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['ALL', 'READY', 'LONG', 'SHORT', 'NEUTRAL'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setBiasFilter(filter)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                biasFilter === filter
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'bg-zinc-900/40 text-zinc-400 border border-transparent hover:text-zinc-200'
              }`}
            >
              {filter === 'ALL' ? 'All (8 Pairs)' : filter}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pair, setup, sweep..."
            className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 placeholder:text-zinc-500 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <Card className="overflow-hidden border-zinc-850">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-900 border-b border-zinc-850 font-mono text-zinc-400 uppercase tracking-wider text-[11px] sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-3">Pair</th>
                  <th className="py-3 px-3 text-right">Price</th>
                  <th className="py-3 px-3 text-center">ADR (5/10/20)</th>
                  <th className="py-3 px-3 text-center">Today Range (%ADR)</th>
                  <th className="py-3 px-3">Prev Day (H/L)</th>
                  <th className="py-3 px-3">Asian Session</th>
                  <th className="py-3 px-3">Liquidity Sweep</th>
                  <th className="py-3 px-3 text-center">H1 / M15</th>
                  <th className="py-3 px-3 text-center">Final Bias</th>
                  <th className="py-3 px-3">Setup Status &amp; Reason</th>
                  <th className="py-3 px-2 text-center">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-850/60 font-mono text-[11px]">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-zinc-400 font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                        <span>Loading market confirmations...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPairs.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-zinc-400 font-sans">
                      <div className="space-y-2">
                        <p className="text-zinc-300 font-medium">No Forex confirmation records found</p>
                        <p className="text-xs text-zinc-500 max-w-md mx-auto">
                          Click &quot;Refresh Market Data&quot; above to initiate collection from Twelve Data. Server will fetch OHLC daily, H1, and M15 candles for the 8 pairs.
                        </p>
                        <Button
                          size="sm"
                          onClick={handleManualCollect}
                          disabled={isRefreshing}
                          className="mt-2 text-xs"
                        >
                          Collect Data Now
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPairs.map((r) => {
                    const isExpanded = expandedPair === r.pair;
                    const adrPercent = r.adrPercentage ?? 0;
                    const isExhausted = adrPercent >= 90;

                    return (
                      <React.Fragment key={r.pair}>
                        <tr
                          onClick={() => setExpandedPair(isExpanded ? null : r.pair)}
                          className={`hover:bg-zinc-900/60 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-zinc-900/50' : ''
                          }`}
                        >
                          {/* Pair */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-100 font-sans text-xs">
                                {r.pair}
                              </span>
                            </div>
                          </td>

                          {/* Price */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <span className="font-bold text-zinc-100 font-mono">
                              {r.price > 0 ? formatPrice(r.price, r.pair) : '—'}
                            </span>
                          </td>

                          {/* ADR 5/10/20 */}
                          <td className="py-3 px-3 text-center whitespace-nowrap text-zinc-300">
                            <span>
                              {r.adr5 !== null ? `${r.adr5}` : '—'} /{' '}
                              {r.adr10 !== null ? `${r.adr10}` : '—'} /{' '}
                              <strong className="text-zinc-100">{r.adr20 !== null ? `${r.adr20}` : '—'}</strong> pips
                            </span>
                          </td>

                          {/* Today Range & % ADR */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              <span className="text-zinc-200">
                                {r.todayRangePips.toFixed(1)} pips
                              </span>
                              {r.adrPercentage !== null ? (
                                <span
                                  className={`text-[10px] ${
                                    isExhausted ? 'text-rose-400 font-bold' : 'text-emerald-400 font-medium'
                                  }`}
                                >
                                  {r.adrPercentage}% of ADR(20)
                                </span>
                              ) : (
                                <span className="text-[10px] text-zinc-500">N/A</span>
                              )}
                            </div>
                          </td>

                          {/* PDH / PDL */}
                          <td className="py-3 px-3 whitespace-nowrap text-zinc-300">
                            <div className="flex flex-col text-[10px]">
                              <span>H: {r.pdh !== null ? formatPrice(r.pdh, r.pair) : '—'}</span>
                              <span className="text-zinc-400">L: {r.pdl !== null ? formatPrice(r.pdl, r.pair) : '—'}</span>
                            </div>
                          </td>

                          {/* Asian H / L */}
                          <td className="py-3 px-3 whitespace-nowrap text-zinc-300">
                            <div className="flex flex-col text-[10px]">
                              <span>H: {r.asianHigh !== null ? formatPrice(r.asianHigh, r.pair) : '—'}</span>
                              <span className="text-zinc-400">L: {r.asianLow !== null ? formatPrice(r.asianLow, r.pair) : '—'}</span>
                            </div>
                          </td>

                          {/* Liquidity Sweep */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {r.liquiditySweepStatus !== 'None' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded">
                                🎯 {r.liquiditySweepStatus}
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-[11px]">None detected</span>
                            )}
                          </td>

                          {/* H1 / M15 */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center text-[10px]">
                              <span
                                className={
                                  r.h1Bias === 'BULLISH'
                                    ? 'text-emerald-400 font-semibold'
                                    : r.h1Bias === 'BEARISH'
                                    ? 'text-rose-400 font-semibold'
                                    : 'text-zinc-400'
                                }
                              >
                                H1: {r.h1Bias}
                              </span>
                              <span className="text-zinc-400">M15: {r.m15Confirmation}</span>
                            </div>
                          </td>

                          {/* Final Bias */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {getBiasBadge(r.finalBias)}
                          </td>

                          {/* Setup Status & Reason */}
                          <td className="py-3 px-3 max-w-[200px]">
                            <div className="flex flex-col gap-0.5">
                              <div>{getSetupBadge(r.setupStatus)}</div>
                              <span className="text-[10px] text-zinc-300 font-sans truncate block" title={r.setupReason}>
                                {r.setupReason}
                              </span>
                            </div>
                          </td>

                          {/* Toggle */}
                          <td className="py-3 px-2 text-center text-zinc-500">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 mx-auto text-zinc-300" />
                            ) : (
                              <ChevronDown className="w-4 h-4 mx-auto" />
                            )}
                          </td>
                        </tr>

                        {/* Expanded Drawer Details */}
                        {isExpanded && (
                          <tr className="bg-zinc-950/80">
                            <td colSpan={11} className="p-4 border-t border-b border-zinc-800">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
                                {/* Levels Box */}
                                <div className="space-y-1.5 p-3 rounded bg-zinc-900/60 border border-zinc-800">
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 block">
                                    Institutional Reference Levels
                                  </span>
                                  <div className="space-y-1 font-mono text-[11px] text-zinc-300">
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Previous Day High (PDH):</span>
                                      <span>{r.pdh !== null ? formatPrice(r.pdh, r.pair) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Previous Day Low (PDL):</span>
                                      <span>{r.pdl !== null ? formatPrice(r.pdl, r.pair) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Previous Week High (PWH):</span>
                                      <span>{r.pwh !== null ? formatPrice(r.pwh, r.pair) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Previous Week Low (PWL):</span>
                                      <span>{r.pwl !== null ? formatPrice(r.pwl, r.pair) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Asian High (00-08 UTC):</span>
                                      <span>{r.asianHigh !== null ? formatPrice(r.asianHigh, r.pair) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Asian Low (00-08 UTC):</span>
                                      <span>{r.asianLow !== null ? formatPrice(r.asianLow, r.pair) : '—'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Range & ADR Metrics */}
                                <div className="space-y-1.5 p-3 rounded bg-zinc-900/60 border border-zinc-800">
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-sky-400 block">
                                    Range &amp; ADR Volatility Profile
                                  </span>
                                  <div className="space-y-1 font-mono text-[11px] text-zinc-300">
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Today High:</span>
                                      <span>{formatPrice(r.todayHigh, r.pair)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Today Low:</span>
                                      <span>{formatPrice(r.todayLow, r.pair)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Today Range:</span>
                                      <span className="font-bold text-zinc-100">{r.todayRangePips.toFixed(1)} pips</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">ADR(5) Completed:</span>
                                      <span>{r.adr5 !== null ? `${r.adr5} pips` : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">ADR(10) Completed:</span>
                                      <span>{r.adr10 !== null ? `${r.adr10} pips` : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">ADR(20) Completed:</span>
                                      <span>{r.adr20 !== null ? `${r.adr20} pips` : 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Order Flow & Structure Context */}
                                <div className="space-y-1.5 p-3 rounded bg-zinc-900/60 border border-zinc-850">
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400 block">
                                    Liquidity &amp; Market Structure
                                  </span>
                                  <div className="space-y-1.5 text-xs text-zinc-300">
                                    <p>
                                      <strong className="text-zinc-400 font-mono text-[11px]">Sweep Status:</strong>{' '}
                                      <span className="text-zinc-100 font-semibold">{r.liquiditySweepStatus}</span>
                                    </p>
                                    <p>
                                      <strong className="text-zinc-400 font-mono text-[11px]">H1 Bias:</strong>{' '}
                                      <span className="text-zinc-100">{r.h1Bias}</span>
                                    </p>
                                    <p>
                                      <strong className="text-zinc-400 font-mono text-[11px]">M15 Confirmation:</strong>{' '}
                                      <span className="text-zinc-100">{r.m15Confirmation}</span>
                                    </p>
                                    <p className="text-[11px] text-zinc-400 border-t border-zinc-800 pt-1">
                                      {r.setupReason}
                                    </p>
                                  </div>
                                </div>

                                {/* Provider Metadata & Delta Notice */}
                                <div className="space-y-1.5 p-3 rounded bg-zinc-900/60 border border-zinc-850">
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-purple-400 block">
                                    Volume &amp; Provider Metadata
                                  </span>
                                  <div className="space-y-1 font-mono text-[11px] text-zinc-300">
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Order-Flow Delta:</span>
                                      <span className="text-zinc-400 italic">N/A — unavailable from source</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Tick Volume:</span>
                                      <span>{r.tickVolume !== null ? r.tickVolume : 'N/A (proxy)'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Source Stamp:</span>
                                      <span className="text-[10px] text-zinc-400">{r.priceTimestamp}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Last System Sync:</span>
                                      <span className="text-[10px] text-zinc-400">{new Date(r.lastUpdatedAt).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="pt-1">
                                      {getFreshnessBadge(r.dataFreshness)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SQL Modal for user convenience if table has not been run in Supabase SQL editor */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-zinc-100 text-sm">
                  Supabase SQL Migration: forex_market_confirmation
                </h3>
              </div>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              The application stores market confirmation data in Supabase table <code className="text-emerald-300">forex_market_confirmation</code> with automatic server-cache fallback. If you have not created this table yet, copy and execute the SQL below in your Supabase SQL Editor:
            </p>

            <pre className="p-3 bg-zinc-900 border border-zinc-800 rounded text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-56">
              {sqlMigrationCode}
            </pre>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copySqlToClipboard}
                className="text-xs gap-1.5"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setIsSqlModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
