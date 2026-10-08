import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import type { TradeWithAccount } from '@/src/types/trade';
import { formatCurrency } from '@/src/lib/formatting/currency';
import { formatDate } from '@/src/lib/formatting/date';
import { AlertTriangle } from 'lucide-react';

interface DeleteTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: TradeWithAccount | null;
  onConfirmDelete: (tradeId: string) => Promise<{ success: boolean; error: Error | null }>;
}

export function DeleteTradeDialog({
  open,
  onOpenChange,
  trade,
  onConfirmDelete,
}: DeleteTradeDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!trade) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    const res = await onConfirmDelete(trade.id);
    setIsDeleting(false);

    if (res.error) {
      setDeleteError(res.error.message);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <DialogTitle className="text-red-200">Delete Trade Record</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to remove this trade execution? This operation cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {deleteError && (
          <div className="my-2 p-3 rounded bg-red-950 border border-red-800 text-xs text-red-200">
            {deleteError}
          </div>
        )}

        <div className="space-y-3 pt-3">
          <div className="p-3 rounded-md bg-zinc-900 border border-zinc-850 text-xs font-mono space-y-1.5">
            <div className="flex justify-between">
              <span className="text-zinc-400">Symbol / Direction:</span>
              <span className="text-zinc-100 font-semibold uppercase">
                {trade.symbol} · {trade.direction}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Execution Date:</span>
              <span className="text-zinc-200">{formatDate(trade.entry_time)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Realized Net P&amp;L:</span>
              <span
                className={`font-semibold ${
                  trade.net_pnl > 0
                    ? 'text-emerald-400'
                    : trade.net_pnl < 0
                    ? 'text-rose-400'
                    : 'text-zinc-300'
                }`}
              >
                {formatCurrency(trade.net_pnl, { showSign: true })}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
