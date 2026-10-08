import React, { useState, useEffect } from 'react';
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
import type { Strategy } from '@/src/types/journal-metadata';
import { Target, AlertCircle } from 'lucide-react';

interface StrategyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyToEdit?: Strategy | null;
  onSubmit: (data: { name: string; description?: string | null }) => Promise<{ error: Error | null }>;
}

export function StrategyFormDialog({
  open,
  onOpenChange,
  strategyToEdit,
  onSubmit,
}: StrategyFormDialogProps) {
  const isEditing = Boolean(strategyToEdit);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      if (strategyToEdit) {
        setName(strategyToEdit.name);
        setDescription(strategyToEdit.description || '');
      } else {
        setName('');
        setDescription('');
      }
    }
  }, [open, strategyToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Strategy name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await onSubmit({
      name: name.trim(),
      description: description.trim() || null,
    });

    setIsSubmitting(false);

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
            <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
            <DialogTitle>
              {isEditing ? 'Edit Strategy Setup' : 'Create Playbook Strategy'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? 'Modify setup rules and criteria for this strategy.'
              : 'Formalize an edge with specific execution criteria and rules.'}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="my-2 p-3 rounded bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="strat-name">Strategy Name *</Label>
            <Input
              id="strat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 5m Opening Range Breakout (ORB)"
              className="text-xs"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="strat-desc">Playbook Criteria &amp; Description</Label>
            <textarea
              id="strat-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key triggers, timeframe, risk rules, confirmations, and invalidation criteria..."
              className="flex w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 shadow-sm focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none font-sans"
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
                ? 'Save Changes'
                : 'Create Strategy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
