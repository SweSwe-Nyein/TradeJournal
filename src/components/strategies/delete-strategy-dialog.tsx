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
import type { Strategy } from '@/src/types/journal-metadata';
import { AlertTriangle } from 'lucide-react';

interface DeleteStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: Strategy | null;
  onConfirm: (id: string) => Promise<{ success: boolean; error: Error | null }>;
}

export function DeleteStrategyDialog({
  open,
  onOpenChange,
  strategy,
  onConfirm,
}: DeleteStrategyDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!strategy) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg(null);
    const res = await onConfirm(strategy.id);
    setIsDeleting(false);
    if (res.error) {
      setErrorMsg(res.error.message);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <DialogTitle>Delete Strategy</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to remove &quot;<strong>{strategy.name}</strong>&quot; from your playbook?
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="my-2 p-3 rounded bg-red-950/60 border border-red-800 text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-400 leading-relaxed font-sans">
          This will delete the strategy definition. Historical trade logs referencing this setup will retain their trade execution records.
        </div>

        <DialogFooter className="pt-2">
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
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border-rose-900/60"
          >
            {isDeleting ? 'Deleting...' : 'Delete Strategy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
