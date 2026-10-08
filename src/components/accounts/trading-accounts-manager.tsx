import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { useTradingAccounts } from '@/src/hooks/useTradingAccounts';
import { AccountFormDialog } from './account-form-dialog';
import { DeleteAccountDialog } from './delete-account-dialog';
import { DatabaseSetupModal } from '@/src/components/database/database-setup-modal';
import type { TradingAccount } from '@/src/types/account';
import type { TradingAccountFormData } from '@/src/lib/validation/account';
import { formatCurrency, formatPercentage } from '@/src/lib/formatting/currency';
import {
  Landmark,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export function TradingAccountsManager() {
  const {
    accounts,
    isLoading,
    error,
    selectedAccountId,
    setSelectedAccountId,
    createAccount,
    updateAccount,
    deleteAccount,
    refreshAccounts,
  } = useTradingAccounts();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<TradingAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<TradingAccount | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleOpenCreate = () => {
    setAccountToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (acc: TradingAccount) => {
    setAccountToEdit(acc);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: TradingAccountFormData) => {
    if (accountToEdit) {
      const res = await updateAccount(accountToEdit.id, {
        name: data.name,
        account_type: data.account_type,
        broker_name: data.broker_name || null,
        starting_balance: data.starting_balance,
        currency: data.currency,
        timezone: data.timezone,
      });
      if (res.error) {
        return { error: res.error };
      }
      showSuccess(`Account "${data.name}" updated successfully`);
      return { error: null };
    } else {
      const res = await createAccount({
        name: data.name,
        account_type: data.account_type,
        broker_name: data.broker_name || null,
        starting_balance: data.starting_balance,
        currency: data.currency,
        timezone: data.timezone,
      });
      if (res.error) {
        return { error: res.error };
      }
      showSuccess(`Account "${data.name}" created successfully`);
      return { error: null };
    }
  };

  const handleConfirmDelete = async (accountId: string) => {
    const res = await deleteAccount(accountId);
    if (!res.error) {
      showSuccess('Trading account deleted');
    }
    return res;
  };

  const formatAccountType = (type: string) => {
    switch (type) {
      case 'prop_firm':
        return 'Prop Firm';
      case 'personal':
        return 'Personal Account';
      case 'demo':
        return 'Demo / Sim';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-400" />
            <span>Trading Accounts</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure funded accounts, personal brokerages, and simulation accounts.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span>New Account</span>
        </Button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3 rounded-md bg-amber-950/60 border border-amber-800/60 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsSetupModalOpen(true)}
            className="text-xs h-7 border-amber-700 text-amber-300 hover:bg-amber-900/40 shrink-0 self-start sm:self-auto"
          >
            Setup Database (SQL)
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse p-4">
              <div className="h-4 w-40 bg-zinc-800 rounded mb-2" />
              <div className="h-3 w-64 bg-zinc-850 rounded" />
            </Card>
          ))}
        </div>
      )}

      {/* Accounts List */}
      {!isLoading && accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((acc) => {
            const isSelected = selectedAccountId === acc.id;
            const startBal = Number(acc.starting_balance);
            const currBal = Number(acc.current_balance);
            const net = currBal - startBal;
            const netPct = startBal > 0 ? (net / startBal) * 100 : 0;

            return (
              <Card
                key={acc.id}
                className={`transition-colors ${
                  isSelected
                    ? 'border-zinc-700 bg-zinc-900/70 shadow-xs'
                    : 'hover:border-zinc-800 bg-zinc-900/40'
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Account Info */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-zinc-100">
                          {acc.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                            Active Scope
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono flex-wrap">
                        <span>{formatAccountType(acc.account_type)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{acc.broker_name || 'Direct Broker'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{acc.currency}</span>
                        <span aria-hidden="true">·</span>
                        <span>{acc.timezone}</span>
                      </div>
                    </div>

                    {/* Financial Metrics */}
                    <div className="flex items-center gap-6 text-right sm:text-right shrink-0">
                      <div>
                        <div className="text-[11px] font-mono uppercase text-zinc-400">
                          Starting
                        </div>
                        <div className="text-xs font-mono tabular-nums text-zinc-200">
                          {formatCurrency(startBal, { currency: acc.currency })}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-mono uppercase text-zinc-400">
                          Current
                        </div>
                        <div className="text-xs font-mono tabular-nums text-zinc-100 font-medium">
                          {formatCurrency(currBal, { currency: acc.currency })}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-mono uppercase text-zinc-400">
                          Net P&amp;L
                        </div>
                        <div
                          className={`text-xs font-mono tabular-nums font-medium ${
                            net > 0
                              ? 'text-emerald-400'
                              : net < 0
                              ? 'text-rose-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {formatCurrency(net, { currency: acc.currency, showSign: true })}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 justify-end sm:border-l sm:border-zinc-850 sm:pl-4 pt-2 sm:pt-0">
                      {!isSelected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAccountId(acc.id)}
                          className="text-xs h-8 px-2.5"
                          title="Set as active account"
                        >
                          Select
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedAccountId('all')}
                          className="text-xs h-8 px-2.5 text-zinc-400 hover:text-zinc-200"
                          title="Switch back to All Accounts"
                        >
                          Deselect
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                        onClick={() => handleOpenEdit(acc)}
                        title="Edit Account"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-red-400"
                        onClick={() => setAccountToDelete(acc)}
                        title="Delete Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && accounts.length === 0 && (
        <Card className="border-dashed border-zinc-800 bg-zinc-950/40">
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto mb-3">
              <Landmark className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">
              No trading accounts configured
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-5 leading-relaxed">
              Create an account for your evaluation challenge, funded prop firm contract, or personal brokerage to begin tracking starting equity and metrics.
            </p>
            <Button size="sm" onClick={handleOpenCreate} className="gap-2 text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Your First Account</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal Dialog for Create / Edit */}
      <AccountFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        accountToEdit={accountToEdit}
      />

      {/* Destructive Delete Confirmation Modal */}
      <DeleteAccountDialog
        open={Boolean(accountToDelete)}
        onOpenChange={(open) => {
          if (!open) setAccountToDelete(null);
        }}
        account={accountToDelete}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Database Setup Modal */}
      <DatabaseSetupModal
        open={isSetupModalOpen}
        onOpenChange={setIsSetupModalOpen}
        onVerified={refreshAccounts}
      />
    </div>
  );
}
