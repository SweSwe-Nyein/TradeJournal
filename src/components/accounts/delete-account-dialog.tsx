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
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import type { TradingAccount } from '@/src/types/account';
import { AlertTriangle } from 'lucide-react';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: TradingAccount | null;
  onConfirmDelete: (accountId: string) => Promise<{ success: boolean; error: Error | null }>;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  account,
  onConfirmDelete,
}: DeleteAccountDialogProps) {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!account) return null;

  const requiresInput = true;
  const isMatch = confirmationInput.trim().toLowerCase() === account.name.trim().toLowerCase();

  const handleDelete = async () => {
    if (!isMatch) return;
    setIsDeleting(true);
    setDeleteError(null);

    const result = await onConfirmDelete(account.id);
    setIsDeleting(false);

    if (result.error) {
      setDeleteError(result.error.message);
    } else {
      setConfirmationInput('');
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
            <DialogTitle className="text-red-200">Delete Trading Account</DialogTitle>
          </div>
          <DialogDescription>
            This action is irreversible. All future trade logs, executions, and notes linked to this account will be removed.
          </DialogDescription>
        </DialogHeader>

        {deleteError && (
          <div className="my-3 p-3 rounded bg-red-950 border border-red-800 text-xs text-red-200">
            {deleteError}
          </div>
        )}

        <div className="space-y-4 pt-3">
          <div className="p-3 rounded-md bg-zinc-900 border border-zinc-850 text-xs space-y-1">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Account:</span>
              <span className="text-zinc-200 font-semibold">{account.name}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Type / Broker:</span>
              <span className="text-zinc-200">{account.account_type} · {account.broker_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Current Balance:</span>
              <span className="text-zinc-200">
                ${Number(account.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} {account.currency}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm-input">
              Type <strong className="text-red-400 font-mono select-all">{account.name}</strong> to confirm deletion:
            </Label>
            <Input
              id="delete-confirm-input"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={account.name}
              autoComplete="off"
              className="border-zinc-800 focus:border-red-700"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmationInput('');
                onOpenChange(false);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!isMatch || isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
