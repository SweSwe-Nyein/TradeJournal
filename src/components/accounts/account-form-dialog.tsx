import React, { useEffect, useState } from 'react';
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
import {
  tradingAccountSchema,
  type TradingAccountFormData,
} from '@/src/lib/validation/account';
import type { TradingAccount } from '@/src/types/account';
import { AlertCircle, Landmark } from 'lucide-react';

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TradingAccountFormData) => Promise<{ error: Error | null }>;
  accountToEdit?: TradingAccount | null;
}

const commonTimezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const commonCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

export function AccountFormDialog({
  open,
  onOpenChange,
  onSubmit,
  accountToEdit,
}: AccountFormDialogProps) {
  const isEditing = Boolean(accountToEdit);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TradingAccountFormData>({
    resolver: zodResolver(tradingAccountSchema),
    defaultValues: {
      name: '',
      account_type: 'prop_firm',
      broker_name: '',
      starting_balance: 50000,
      currency: 'USD',
      timezone: 'America/New_York',
    },
  });

  const selectedType = watch('account_type');

  useEffect(() => {
    if (open) {
      setFormError(null);
      if (accountToEdit) {
        reset({
          name: accountToEdit.name,
          account_type: accountToEdit.account_type,
          broker_name: accountToEdit.broker_name || '',
          starting_balance: Number(accountToEdit.starting_balance),
          currency: accountToEdit.currency,
          timezone: accountToEdit.timezone,
        });
      } else {
        reset({
          name: '',
          account_type: 'prop_firm',
          broker_name: '',
          starting_balance: 50000,
          currency: 'USD',
          timezone: 'America/New_York',
        });
      }
    }
  }, [open, accountToEdit, reset]);

  const handleFormSubmit = async (data: TradingAccountFormData) => {
    setIsSubmitting(true);
    setFormError(null);

    const result = await onSubmit(data);

    setIsSubmitting(false);
    if (result.error) {
      setFormError(result.error.message);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
              <Landmark className="w-4 h-4" />
            </div>
            <DialogTitle>
              {isEditing ? 'Edit Trading Account' : 'New Trading Account'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? 'Update configuration and parameters for this trading account.'
              : 'Add a new funded, personal, or simulation trading account to your journal.'}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="my-3 p-3 rounded bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-3">
          {/* Account Name */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Account Name *</Label>
            <Input
              id="acc-name"
              placeholder="e.g. Apex 50K PA, Personal Interactive Brokers"
              {...register('name')}
              className={errors.name ? 'border-red-800' : ''}
            />
            {errors.name && (
              <p className="text-[11px] text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Account Type Selector */}
          <div className="space-y-1.5">
            <Label>Account Type *</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'prop_firm', label: 'Prop Firm' },
                  { id: 'personal', label: 'Personal' },
                  { id: 'demo', label: 'Demo / Sim' },
                ] as const
              ).map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setValue('account_type', type.id, { shouldValidate: true })}
                  className={`py-2 px-3 text-xs font-medium rounded-md border text-center transition-colors cursor-pointer ${
                    selectedType === type.id
                      ? 'bg-zinc-800 border-zinc-600 text-white shadow-xs'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {errors.account_type && (
              <p className="text-[11px] text-red-400">{errors.account_type.message}</p>
            )}
          </div>

          {/* Broker Name & Starting Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-broker">Broker / Platform</Label>
              <Input
                id="acc-broker"
                placeholder="Tradovate, IBKR, NinjaTrader..."
                {...register('broker_name')}
                className={errors.broker_name ? 'border-red-800' : ''}
              />
              {errors.broker_name && (
                <p className="text-[11px] text-red-400">{errors.broker_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-balance">Starting Balance *</Label>
              <Input
                id="acc-balance"
                type="number"
                step="any"
                placeholder="50000"
                {...register('starting_balance', { valueAsNumber: true })}
                className={errors.starting_balance ? 'border-red-800 font-mono' : 'font-mono'}
              />
              {errors.starting_balance && (
                <p className="text-[11px] text-red-400">{errors.starting_balance.message}</p>
              )}
            </div>
          </div>

          {/* Currency & Timezone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-currency">Currency *</Label>
              <select
                id="acc-currency"
                {...register('currency')}
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-sm text-zinc-100 shadow-sm focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              >
                {commonCurrencies.map((c) => (
                  <option key={c} value={c} className="bg-zinc-900 text-zinc-100">
                    {c}
                  </option>
                ))}
              </select>
              {errors.currency && (
                <p className="text-[11px] text-red-400">{errors.currency.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-timezone">Account Timezone *</Label>
              <select
                id="acc-timezone"
                {...register('timezone')}
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-sm text-zinc-100 shadow-sm focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              >
                {commonTimezones.map((tz) => (
                  <option key={tz} value={tz} className="bg-zinc-900 text-zinc-100">
                    {tz}
                  </option>
                ))}
              </select>
              {errors.timezone && (
                <p className="text-[11px] text-red-400">{errors.timezone.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
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
                ? 'Update Account'
                : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
