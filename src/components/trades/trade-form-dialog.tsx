import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { tradeFormSchema, type TradeFormData, type TradeFormInput } from '@/src/lib/validation/trade';
import { calculateTradeMetrics } from '@/src/lib/calculations/trades';
import { formatCurrency } from '@/src/lib/formatting/currency';
import type { TradeWithAccount } from '@/src/types/trade';
import type { TradingAccount } from '@/src/types/account';
import type { Strategy, Tag, Mistake } from '@/src/types/journal-metadata';
import { StrategyService } from '@/src/lib/services/strategy-service';
import { TagService } from '@/src/lib/services/tag-service';
import { MistakeService } from '@/src/lib/services/mistake-service';
import { useAuth } from '@/src/hooks/useAuth';
import { SearchableMultiSelect } from '@/src/components/ui/searchable-multi-select';
import { AlertCircle, LineChart, Calculator } from 'lucide-react';

interface TradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TradeFormData) => Promise<{ error: Error | null }>;
  accounts: TradingAccount[];
  defaultAccountId?: string;
  tradeToEdit?: TradeWithAccount | null;
}

export function TradeFormDialog({
  open,
  onOpenChange,
  onSubmit,
  accounts,
  defaultAccountId,
  tradeToEdit,
}: TradeFormDialogProps) {
  const { user } = useAuth();
  const userId = user?.id || 'demo-user-id';
  const isEditing = Boolean(tradeToEdit);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available metadata lists
  const [availableStrategies, setAvailableStrategies] = useState<Strategy[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableMistakes, setAvailableMistakes] = useState<Mistake[]>([]);

  // Selected state for multi-selects
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedMistakeIds, setSelectedMistakeIds] = useState<string[]>([]);

  const defaultAccount =
    defaultAccountId && defaultAccountId !== 'all'
      ? defaultAccountId
      : accounts[0]?.id || '';

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TradeFormInput, any, TradeFormData>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      trading_account_id: defaultAccount,
      symbol: '',
      direction: 'long',
      entry_time: new Date().toISOString().slice(0, 16),
      exit_time: new Date().toISOString().slice(0, 16),
      entry_price: 0,
      exit_price: 0,
      quantity: 1,
      stop_loss: undefined,
      take_profit: undefined,
      commission: 0,
      fees: 0,
      swap: 0,
      risk_amount: undefined,
      status: 'closed',
      strategy: '',
      strategies: [],
      strategy_ids: [],
      tags: [],
      tag_ids: [],
      mistakes: [],
      mistake_ids: [],
      notes: '',
    },
  });

  const watchedDirection = watch('direction');
  const watchedEntryPrice = watch('entry_price');
  const watchedExitPrice = watch('exit_price');
  const watchedQuantity = watch('quantity');
  const watchedCommission = watch('commission');
  const watchedFees = watch('fees');
  const watchedSwap = watch('swap');
  const watchedRiskAmount = watch('risk_amount');
  const watchedStatus = watch('status');

  const loadMetadata = useCallback(async () => {
    if (!userId) return;
    const [stratRes, tagRes, mistakeRes] = await Promise.all([
      StrategyService.listStrategies(userId),
      TagService.listTags(userId),
      MistakeService.listMistakes(userId),
    ]);
    if (stratRes.data) setAvailableStrategies(stratRes.data);
    if (tagRes.data) setAvailableTags(tagRes.data);
    if (mistakeRes.data) setAvailableMistakes(mistakeRes.data);
  }, [userId]);

  useEffect(() => {
    if (open) {
      loadMetadata();
    }
  }, [open, loadMetadata]);

  // Live P&L Calculation Preview
  const liveMetrics = useMemo(() => {
    if (!watchedEntryPrice || !watchedQuantity || watchedEntryPrice <= 0 || watchedQuantity <= 0) {
      return { gross_pnl: 0, net_pnl: 0, r_multiple: null };
    }

    return calculateTradeMetrics({
      direction: watchedDirection,
      entry_price: Number(watchedEntryPrice),
      exit_price: watchedExitPrice ? Number(watchedExitPrice) : null,
      quantity: Number(watchedQuantity),
      commission: Number(watchedCommission) || 0,
      fees: Number(watchedFees) || 0,
      swap: Number(watchedSwap) || 0,
      risk_amount: watchedRiskAmount ? Number(watchedRiskAmount) : null,
    });
  }, [
    watchedDirection,
    watchedEntryPrice,
    watchedExitPrice,
    watchedQuantity,
    watchedCommission,
    watchedFees,
    watchedSwap,
    watchedRiskAmount,
  ]);

  useEffect(() => {
    if (open) {
      setFormError(null);
      if (tradeToEdit) {
        const initialStratIds =
          tradeToEdit.strategy_ids && tradeToEdit.strategy_ids.length > 0
            ? tradeToEdit.strategy_ids
            : tradeToEdit.strategies && tradeToEdit.strategies.length > 0
            ? tradeToEdit.strategies.map((s) => s.id)
            : tradeToEdit.strategy
            ? [tradeToEdit.strategy]
            : [];

        const initialTagIds =
          tradeToEdit.tag_ids && tradeToEdit.tag_ids.length > 0
            ? tradeToEdit.tag_ids
            : tradeToEdit.tags_list && tradeToEdit.tags_list.length > 0
            ? tradeToEdit.tags_list.map((t) => t.id)
            : (tradeToEdit.tags as string[]) || [];

        const initialMistakeIds =
          tradeToEdit.mistake_ids && tradeToEdit.mistake_ids.length > 0
            ? tradeToEdit.mistake_ids
            : tradeToEdit.mistakes_list && tradeToEdit.mistakes_list.length > 0
            ? tradeToEdit.mistakes_list.map((m) => m.id)
            : (tradeToEdit.mistakes as string[]) || [];

        setSelectedStrategyIds(initialStratIds);
        setSelectedTagIds(initialTagIds);
        setSelectedMistakeIds(initialMistakeIds);

        reset({
          trading_account_id: tradeToEdit.trading_account_id,
          symbol: tradeToEdit.symbol,
          direction: tradeToEdit.direction,
          entry_time: tradeToEdit.entry_time
            ? new Date(tradeToEdit.entry_time).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
          exit_time: tradeToEdit.exit_time
            ? new Date(tradeToEdit.exit_time).toISOString().slice(0, 16)
            : null,
          entry_price: Number(tradeToEdit.entry_price),
          exit_price: tradeToEdit.exit_price ? Number(tradeToEdit.exit_price) : null,
          quantity: Number(tradeToEdit.quantity),
          stop_loss: tradeToEdit.stop_loss ? Number(tradeToEdit.stop_loss) : undefined,
          take_profit: tradeToEdit.take_profit ? Number(tradeToEdit.take_profit) : undefined,
          commission: Number(tradeToEdit.commission) || 0,
          fees: Number(tradeToEdit.fees) || 0,
          swap: Number(tradeToEdit.swap) || 0,
          risk_amount: tradeToEdit.risk_amount ? Number(tradeToEdit.risk_amount) : undefined,
          status: tradeToEdit.status,
          strategy: tradeToEdit.strategy || '',
          strategies: tradeToEdit.strategies?.map((s) => s.name) || (tradeToEdit.strategy ? [tradeToEdit.strategy] : []),
          strategy_ids: initialStratIds,
          tags: (tradeToEdit.tags as string[]) || [],
          tag_ids: initialTagIds,
          mistakes: (tradeToEdit.mistakes as string[]) || [],
          mistake_ids: initialMistakeIds,
          notes: tradeToEdit.notes || '',
        });
      } else {
        setSelectedStrategyIds([]);
        setSelectedTagIds([]);
        setSelectedMistakeIds([]);

        reset({
          trading_account_id: defaultAccount,
          symbol: '',
          direction: 'long',
          entry_time: new Date().toISOString().slice(0, 16),
          exit_time: new Date().toISOString().slice(0, 16),
          entry_price: undefined as unknown as number,
          exit_price: undefined as unknown as number,
          quantity: 1,
          stop_loss: undefined,
          take_profit: undefined,
          commission: 0,
          fees: 0,
          swap: 0,
          risk_amount: undefined,
          status: 'closed',
          strategy: '',
          strategies: [],
          strategy_ids: [],
          tags: [],
          tag_ids: [],
          mistakes: [],
          mistake_ids: [],
          notes: '',
        });
      }
    }
  }, [open, tradeToEdit, defaultAccount, reset]);

  const handleCreateStrategy = async (name: string) => {
    const res = await StrategyService.createStrategy(userId, { name });
    if (res.data) {
      setAvailableStrategies((prev) => [...prev, res.data!]);
      return res.data;
    }
    return null;
  };

  const handleCreateTag = async (name: string) => {
    const res = await TagService.createTag(userId, name);
    if (res.data) {
      setAvailableTags((prev) => [...prev, res.data!]);
      return res.data;
    }
    return null;
  };

  const handleCreateMistake = async (name: string) => {
    const res = await MistakeService.createMistake(userId, name);
    if (res.data) {
      setAvailableMistakes((prev) => [...prev, res.data!]);
      return res.data;
    }
    return null;
  };

  const handleFormSubmit = async (data: TradeFormData) => {
    setIsSubmitting(true);
    setFormError(null);

    // Format timestamps to ISO strings
    const payload: TradeFormData = {
      ...data,
      entry_time: new Date(data.entry_time).toISOString(),
      exit_time: data.exit_time ? new Date(data.exit_time).toISOString() : null,
      strategy_ids: selectedStrategyIds,
      tag_ids: selectedTagIds,
      mistake_ids: selectedMistakeIds,
    };

    const res = await onSubmit(payload);
    setIsSubmitting(false);

    if (res.error) {
      setFormError(res.error.message);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
              <LineChart className="w-4 h-4" />
            </div>
            <DialogTitle>
              {isEditing ? 'Edit Trade Execution' : 'Record New Trade'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? 'Update trade parameters. P&L and risk metrics recalculate automatically.'
              : 'Add an executed trade manually with real-time financial metrics calculation.'}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="my-2 p-3 rounded bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
          {/* Account & Direction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trade-acc">Trading Account *</Label>
              <select
                id="trade-acc"
                {...register('trading_account_id')}
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-100 shadow-sm focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-zinc-900">
                    {acc.name} ({acc.account_type})
                  </option>
                ))}
              </select>
              {errors.trading_account_id && (
                <p className="text-[11px] text-red-400">{errors.trading_account_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Trade Direction *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setValue('direction', 'long', { shouldValidate: true })}
                  className={`h-9 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                    watchedDirection === 'long'
                      ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  LONG (BUY)
                </button>
                <button
                  type="button"
                  onClick={() => setValue('direction', 'short', { shouldValidate: true })}
                  className={`h-9 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                    watchedDirection === 'short'
                      ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  SHORT (SELL)
                </button>
              </div>
            </div>
          </div>

          {/* Symbol, Quantity, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trade-sym">Symbol / Ticker *</Label>
              <Input
                id="trade-sym"
                placeholder="NQ, ES, AAPL..."
                {...register('symbol')}
                className={errors.symbol ? 'border-red-800 uppercase font-mono' : 'uppercase font-mono'}
              />
              {errors.symbol && (
                <p className="text-[11px] text-red-400">{errors.symbol.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trade-qty">Quantity / Lots *</Label>
              <Input
                id="trade-qty"
                type="number"
                step="any"
                placeholder="1"
                {...register('quantity', { valueAsNumber: true })}
                className="font-mono"
              />
              {errors.quantity && (
                <p className="text-[11px] text-red-400">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trade-status">Trade Status *</Label>
              <select
                id="trade-status"
                {...register('status')}
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-100 shadow-sm focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              >
                <option value="closed" className="bg-zinc-900">Closed</option>
                <option value="open" className="bg-zinc-900">Open</option>
              </select>
            </div>
          </div>

          {/* Entry & Exit Prices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trade-entry-price">Entry Price *</Label>
              <Input
                id="trade-entry-price"
                type="number"
                step="any"
                placeholder="18500.00"
                {...register('entry_price', { valueAsNumber: true })}
                className="font-mono"
              />
              {errors.entry_price && (
                <p className="text-[11px] text-red-400">{errors.entry_price.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trade-exit-price">
                Exit Price {watchedStatus === 'closed' ? '*' : '(Optional)'}
              </Label>
              <Input
                id="trade-exit-price"
                type="number"
                step="any"
                placeholder="18550.00"
                {...register('exit_price', { valueAsNumber: true })}
                className="font-mono"
              />
              {errors.exit_price && (
                <p className="text-[11px] text-red-400">{errors.exit_price.message}</p>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trade-entry-time">Entry Time *</Label>
              <Input
                id="trade-entry-time"
                type="datetime-local"
                {...register('entry_time')}
                className="font-mono text-xs"
              />
              {errors.entry_time && (
                <p className="text-[11px] text-red-400">{errors.entry_time.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trade-exit-time">
                Exit Time {watchedStatus === 'closed' ? '*' : '(Optional)'}
              </Label>
              <Input
                id="trade-exit-time"
                type="datetime-local"
                {...register('exit_time')}
                className="font-mono text-xs"
              />
              {errors.exit_time && (
                <p className="text-[11px] text-red-400">{errors.exit_time.message}</p>
              )}
            </div>
          </div>

          {/* Stop Loss, Take Profit, Risk */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trade-sl">Stop Loss (Price)</Label>
              <Input
                id="trade-sl"
                type="number"
                step="any"
                placeholder="18450.00"
                {...register('stop_loss', { valueAsNumber: true })}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trade-tp">Take Profit (Price)</Label>
              <Input
                id="trade-tp"
                type="number"
                step="any"
                placeholder="18600.00"
                {...register('take_profit', { valueAsNumber: true })}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trade-risk">Planned Risk ($)</Label>
              <Input
                id="trade-risk"
                type="number"
                step="any"
                placeholder="100.00"
                {...register('risk_amount', { valueAsNumber: true })}
                className="font-mono"
              />
            </div>
          </div>

          {/* Commission, Fees, Swap */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trade-comm">Commission ($)</Label>
              <Input
                id="trade-comm"
                type="number"
                step="any"
                placeholder="4.50"
                {...register('commission', { valueAsNumber: true })}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trade-fees">Fees ($)</Label>
              <Input
                id="trade-fees"
                type="number"
                step="any"
                placeholder="1.20"
                {...register('fees', { valueAsNumber: true })}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trade-swap">Swap / Carry ($)</Label>
              <Input
                id="trade-swap"
                type="number"
                step="any"
                placeholder="0.00"
                {...register('swap', { valueAsNumber: true })}
                className="font-mono"
              />
            </div>
          </div>

          {/* Real-time Calculation Preview Card */}
          <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400 font-mono mb-2">
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span>Calculated Trade Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-3 font-mono text-center">
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Gross P&amp;L</span>
                <span
                  className={`text-sm font-semibold tabular-nums block ${
                    liveMetrics.gross_pnl > 0
                      ? 'text-emerald-400'
                      : liveMetrics.gross_pnl < 0
                      ? 'text-rose-400'
                      : 'text-zinc-300'
                  }`}
                >
                  {formatCurrency(liveMetrics.gross_pnl, { showSign: true })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Net P&amp;L</span>
                <span
                  className={`text-sm font-bold tabular-nums block ${
                    liveMetrics.net_pnl > 0
                      ? 'text-emerald-400'
                      : liveMetrics.net_pnl < 0
                      ? 'text-rose-400'
                      : 'text-zinc-300'
                  }`}
                >
                  {formatCurrency(liveMetrics.net_pnl, { showSign: true })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">R Multiple</span>
                <span className="text-sm font-semibold tabular-nums text-zinc-200 block">
                  {liveMetrics.r_multiple !== null ? `${liveMetrics.r_multiple > 0 ? '+' : ''}${liveMetrics.r_multiple} R` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 1. Multiple Strategies (Searchable Multi-Select) */}
          <div className="space-y-1.5">
            <SearchableMultiSelect
              label="Assigned Strategies (Playbook Setups)"
              placeholder="Search or add strategies (e.g. ORB, VWAP Reversal)..."
              options={availableStrategies}
              selectedIds={selectedStrategyIds}
              onChange={(ids, names) => {
                setSelectedStrategyIds(ids);
                setValue('strategy_ids', ids, { shouldValidate: true });
                setValue('strategies', names, { shouldValidate: true });
                setValue('strategy', names[0] || null, { shouldValidate: true });
              }}
              onCreateNew={handleCreateStrategy}
              variant="strategy"
            />
          </div>

          {/* 2. Multiple Tags (Searchable Multi-Select) */}
          <div className="space-y-1.5">
            <SearchableMultiSelect
              label="Trade Quality & Context Tags"
              placeholder="Search or add tags (e.g. A+, Breakout, London, NY)..."
              options={availableTags}
              selectedIds={selectedTagIds}
              onChange={(ids, names) => {
                setSelectedTagIds(ids);
                setValue('tag_ids', ids, { shouldValidate: true });
                setValue('tags', names, { shouldValidate: true });
              }}
              onCreateNew={handleCreateTag}
              variant="tag"
            />
          </div>

          {/* 3. Multiple Mistakes (Searchable Multi-Select) */}
          <div className="space-y-1.5">
            <SearchableMultiSelect
              label="Mistakes / Execution Errors"
              placeholder="Search or add mistakes (e.g. FOMO, Revenge trading, Moved stop)..."
              options={availableMistakes}
              selectedIds={selectedMistakeIds}
              onChange={(ids, names) => {
                setSelectedMistakeIds(ids);
                setValue('mistake_ids', ids, { shouldValidate: true });
                setValue('mistakes', names, { shouldValidate: true });
              }}
              onCreateNew={handleCreateMistake}
              variant="mistake"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="trade-notes">Journal Notes / Analysis</Label>
            <textarea
              id="trade-notes"
              rows={3}
              placeholder="What market context did you see? Key levels, emotions, execution quality..."
              {...register('notes')}
              className="flex w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 shadow-sm focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : isEditing
                ? 'Update Trade'
                : 'Save Trade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
