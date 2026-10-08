import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { useTradingAccounts } from '@/src/hooks/useTradingAccounts';
import { TradeService } from '@/src/lib/services/trade-service';
import type { TradeWithAccount } from '@/src/types/trade';
import type { TradeFormData } from '@/src/lib/validation/trade';
import { formatCurrency, formatPercentage } from '@/src/lib/formatting/currency';
import { formatDate } from '@/src/lib/formatting/date';
import { formatTradeDuration } from '@/src/lib/formatting/duration';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { TradeFormDialog } from '@/src/components/trades/trade-form-dialog';
import { DeleteTradeDialog } from '@/src/components/trades/delete-trade-dialog';
import { TradeScreenshots } from '@/src/components/trades/trade-screenshots';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  LineChart,
  Landmark,
  Clock,
  Target,
  Shield,
  Layers,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from 'lucide-react';

export function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accounts } = useTradingAccounts();

  const [trade, setTrade] = useState<TradeWithAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadTrade = useCallback(async () => {
    if (!user || !id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await TradeService.getTrade(user.id, id);
      if (res.error || !res.data) {
        setError(res.error?.message || 'Trade record not found');
      } else {
        setTrade(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load trade record');
    } finally {
      setIsLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    loadTrade();
  }, [loadTrade]);

  const handleEditSubmit = async (data: TradeFormData) => {
    if (!user || !trade) return { error: new Error('User not found') };
    const res = await TradeService.updateTrade(user.id, trade.id, {
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

    if (!res.error && res.data) {
      setTrade(res.data);
    }
    return { error: res.error };
  };

  const handleDeleteConfirm = async (tradeId: string) => {
    if (!user) return { success: false, error: new Error('User not found') };
    const res = await TradeService.deleteTrade(user.id, tradeId);
    if (res.success) {
      navigate('/trades', { replace: true });
    }
    return res;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <div className="h-8 w-48 bg-zinc-850 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">Trade Record Not Found</h2>
        <p className="text-xs text-zinc-400">{error || 'The trade you are looking for does not exist or has been removed.'}</p>
        <Link to="/trades">
          <Button variant="outline" size="sm" className="gap-2 text-xs mt-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Trade Log</span>
          </Button>
        </Link>
      </div>
    );
  }

  const isPos = trade.net_pnl > 0;
  const isNeg = trade.net_pnl < 0;
  const duration = formatTradeDuration(trade.entry_time, trade.exit_time);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/trades"
            className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1.5 transition-colors font-mono mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Trade Log</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-sans text-zinc-100 flex items-center gap-2">
              <span className="font-mono tracking-tight">{trade.symbol}</span>
              <span
                className={`text-xs uppercase font-mono px-2 py-0.5 rounded border ${
                  trade.direction === 'long'
                    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
                    : 'text-rose-400 bg-rose-950/60 border-rose-800/60'
                }`}
              >
                {trade.direction}
              </span>
            </h1>
            <span
              className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                trade.status === 'closed'
                  ? 'text-zinc-400 border-zinc-800 bg-zinc-900/60'
                  : 'text-emerald-400 border-emerald-800/60 bg-emerald-950/40'
              }`}
            >
              {trade.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-1.5 text-xs h-8"
          >
            <Pencil className="w-3.5 h-3.5 text-zinc-400" />
            <span>Edit Trade</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="gap-1.5 text-xs h-8 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border-zinc-800"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Net P&L */}
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              Net P&amp;L
            </span>
            <div className="flex items-center gap-1 mt-1">
              {isPos && <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />}
              {isNeg && <ArrowDownRight className="w-4 h-4 text-rose-400 shrink-0" />}
              <span
                className={`text-xl sm:text-2xl font-mono tabular-nums font-bold ${
                  isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-zinc-200'
                }`}
              >
                {formatCurrency(trade.net_pnl, { showSign: true })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Gross P&L */}
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              Gross P&amp;L
            </span>
            <span
              className={`text-xl sm:text-2xl font-mono tabular-nums font-bold mt-1 block ${
                trade.gross_pnl > 0
                  ? 'text-emerald-400'
                  : trade.gross_pnl < 0
                  ? 'text-rose-400'
                  : 'text-zinc-200'
              }`}
            >
              {formatCurrency(trade.gross_pnl, { showSign: true })}
            </span>
          </CardContent>
        </Card>

        {/* R Multiple */}
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              R Multiple
            </span>
            <span className="text-xl sm:text-2xl font-mono tabular-nums font-bold text-zinc-100 mt-1 block">
              {trade.r_multiple !== null
                ? `${trade.r_multiple > 0 ? '+' : ''}${trade.r_multiple} R`
                : '—'}
            </span>
          </CardContent>
        </Card>

        {/* Trade Duration */}
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              Duration
            </span>
            <span className="text-xl sm:text-2xl font-mono tabular-nums font-bold text-zinc-100 mt-1 block">
              {duration}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Execution Details & Account Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution Metrics */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b border-zinc-850">
            <CardTitle className="text-xs uppercase font-mono tracking-wider text-zinc-300">
              Execution Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 gap-6 font-mono text-xs">
            <div>
              <span className="text-zinc-400 text-[11px] block">Entry Price</span>
              <span className="text-sm font-semibold text-zinc-100 tabular-nums">
                {Number(trade.entry_price).toFixed(2)}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 text-[11px] block">Exit Price</span>
              <span className="text-sm font-semibold text-zinc-100 tabular-nums">
                {trade.exit_price ? Number(trade.exit_price).toFixed(2) : 'Open Position'}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 text-[11px] block">Quantity / Lots</span>
              <span className="text-sm font-semibold text-zinc-100 tabular-nums">
                {trade.quantity}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 text-[11px] block">Entry Time</span>
              <span className="text-zinc-200 tabular-nums">
                {formatDate(trade.entry_time)}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 text-[11px] block">Exit Time</span>
              <span className="text-zinc-200 tabular-nums">
                {trade.exit_time ? formatDate(trade.exit_time) : 'Open'}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 text-[11px] block">Planned Risk ($)</span>
              <span className="text-zinc-200 tabular-nums">
                {trade.risk_amount ? formatCurrency(trade.risk_amount) : 'Unassigned'}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 text-[11px] block">Stop Loss</span>
              <span className="text-zinc-200 tabular-nums">
                {trade.stop_loss ? Number(trade.stop_loss).toFixed(2) : 'None'}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 text-[11px] block">Take Profit</span>
              <span className="text-zinc-200 tabular-nums">
                {trade.take_profit ? Number(trade.take_profit).toFixed(2) : 'None'}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 text-[11px] block">Commission</span>
              <span className="text-zinc-200 tabular-nums">
                {formatCurrency(Number(trade.commission))}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 text-[11px] block">Broker Fees</span>
              <span className="text-zinc-200 tabular-nums">
                {formatCurrency(Number(trade.fees))}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 text-[11px] block">Overnight Swap</span>
              <span className="text-zinc-200 tabular-nums">
                {formatCurrency(Number(trade.swap))}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 text-[11px] block">Total Trade Costs</span>
              <span className="text-zinc-200 tabular-nums font-semibold">
                {formatCurrency(Number(trade.commission) + Number(trade.fees) + Number(trade.swap))}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Linked Trading Account */}
        <Card>
          <CardHeader className="pb-3 border-b border-zinc-850">
            <div className="flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              <CardTitle className="text-xs uppercase font-mono tracking-wider text-zinc-300">
                Trading Account
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs font-mono">
            <div>
              <span className="text-[11px] text-zinc-400 block">Account Name</span>
              <span className="text-sm font-semibold text-zinc-100 font-sans">
                {trade.account?.name || 'Direct Broker Account'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-zinc-400 block">Type / Broker</span>
              <span className="text-zinc-300">
                {trade.account?.account_type ? trade.account.account_type.toUpperCase() : 'PERSONAL'} · {trade.account?.broker_name || 'Direct Broker'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-zinc-400 block">Currency</span>
              <span className="text-zinc-300">
                {trade.account?.currency || 'USD'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Journal Notes, Strategy & Mistakes */}
      <Card>
        <CardHeader className="pb-3 border-b border-zinc-850">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <CardTitle className="text-sm font-medium">Trade Journal &amp; Playbook Context</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Strategy & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-mono text-zinc-400 block mb-1.5">Strategy Playbook</span>
              {trade.strategies && trade.strategies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {trade.strategies.map((strat) => (
                    <div
                      key={strat.id}
                      className="text-xs bg-emerald-950/40 border border-emerald-800/60 rounded px-2.5 py-1 text-emerald-300"
                    >
                      <span className="font-semibold">{strat.name}</span>
                      {strat.description && (
                        <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2 font-sans">
                          {strat.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : trade.strategy ? (
                <span className="text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded inline-block">
                  {trade.strategy}
                </span>
              ) : (
                <span className="text-xs text-zinc-500 italic">No strategy assigned</span>
              )}
            </div>

            <div>
              <span className="text-xs font-mono text-zinc-400 block mb-1.5">Execution Tags</span>
              {trade.tags_list && trade.tags_list.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {trade.tags_list.map((tag) => (
                    <span
                      key={tag.id}
                      className="text-xs text-sky-300 bg-sky-950/60 border border-sky-800/60 px-2.5 py-0.5 rounded font-mono"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              ) : trade.tags && trade.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {trade.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs text-sky-300 bg-sky-950/60 border border-sky-800/60 px-2.5 py-0.5 rounded font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-zinc-500 italic">No tags attached</span>
              )}
            </div>
          </div>

          {/* Mistakes Tagged */}
          {((trade.mistakes_list && trade.mistakes_list.length > 0) ||
            (trade.mistakes && trade.mistakes.length > 0)) && (
            <div>
              <span className="text-xs font-mono text-rose-400 block mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Mistakes / Discipline Violations</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(trade.mistakes_list || []).length > 0
                  ? trade.mistakes_list!.map((mistake) => (
                      <span
                        key={mistake.id}
                        className="text-xs font-medium text-rose-300 bg-rose-950/70 border border-rose-800/70 px-2.5 py-1 rounded font-mono"
                      >
                        ⚠️ {mistake.name}
                      </span>
                    ))
                  : trade.mistakes!.map((mistake, i) => (
                      <span
                        key={i}
                        className="text-xs font-medium text-rose-300 bg-rose-950/70 border border-rose-800/70 px-2.5 py-1 rounded font-mono"
                      >
                        ⚠️ {mistake}
                      </span>
                    ))}
              </div>
            </div>
          )}

          {/* Journal Notes */}
          <div>
            <span className="text-xs font-mono text-zinc-400 block mb-1.5">Trader Notes</span>
            {trade.notes ? (
              <div className="p-4 rounded-md bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                {trade.notes}
              </div>
            ) : (
              <div className="p-4 rounded-md border border-dashed border-zinc-850 text-xs text-zinc-500 text-center">
                No notes entered for this trade. Click <strong>Edit Trade</strong> to add execution notes and review thoughts.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trade Screenshots Section */}
      <TradeScreenshots userId={user?.id || ''} tradeId={trade.id} />

      {/* Trade Plan & Post-Mortem Review */}
      <Card>
        <CardHeader className="pb-3 border-b border-zinc-850">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <CardTitle className="text-sm font-medium">Trade Plan &amp; Post-Mortem Review</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 border-b border-zinc-850 pb-1">
              Trade Plan
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-400 font-mono block mb-1">Why did I enter?</span>
                <p className="text-zinc-200 bg-zinc-950/40 border border-zinc-850 p-2.5 rounded font-sans">
                  {trade.notes || 'No entry rationale recorded.'}
                </p>
              </div>
              <div>
                <span className="text-zinc-400 font-mono block mb-1">Setup &amp; Catalyst</span>
                <p className="text-zinc-200 bg-zinc-950/40 border border-zinc-850 p-2.5 rounded font-sans">
                  {trade.strategies?.[0]?.description || trade.strategy || 'Standard playbook setup.'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-sky-400 border-b border-zinc-850 pb-1">
              Trade Review &amp; Psychology
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-400 font-mono block mb-1">Execution &amp; Discipline Check</span>
                <p className="text-zinc-200 bg-zinc-950/40 border border-zinc-850 p-2.5 rounded font-sans">
                  {trade.mistakes_list && trade.mistakes_list.length > 0
                    ? `Violations noted: ${trade.mistakes_list.map((m) => m.name).join(', ')}`
                    : 'Executed cleanly according to plan rules.'}
                </p>
              </div>
              <div>
                <span className="text-zinc-400 font-mono block mb-1">What would I change tomorrow?</span>
                <p className="text-zinc-200 bg-zinc-950/40 border border-zinc-850 p-2.5 rounded font-sans">
                  Review trade logs regularly to refine patience and stop-loss management.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <TradeFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEditSubmit}
        accounts={accounts}
        tradeToEdit={trade}
      />

      {/* Delete Dialog */}
      <DeleteTradeDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        trade={trade}
        onConfirmDelete={handleDeleteConfirm}
      />
    </div>
  );
}
