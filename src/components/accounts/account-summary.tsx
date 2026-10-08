import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/card';
import { formatCurrency, formatPercentage } from '@/src/lib/formatting/currency';
import { useTradingAccounts } from '@/src/hooks/useTradingAccounts';
import { Landmark, ArrowUpRight, ArrowDownRight, Minus, Scale } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function AccountSummary({ className }: { className?: string }) {
  const { summary, selectedAccount, selectedAccountId, accounts, isLoading } = useTradingAccounts();

  const isAll = selectedAccountId === 'all';
  const accountLabel = isAll
    ? `All Trading Accounts (${accounts.length})`
    : selectedAccount?.name || 'Selected Account';

  const { startingBalance, currentBalance, netPnL, netPnLPercentage, currency } = summary;

  const isProfit = netPnL > 0;
  const isLoss = netPnL < 0;
  const isFlat = netPnL === 0;

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-4', className)}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-3 w-24 bg-zinc-800 rounded" />
              <div className="h-6 w-32 bg-zinc-800 rounded mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-1.5 font-mono">
          <Scale className="w-3.5 h-3.5 text-zinc-500" />
          <span>Active Scope:</span>
          <span className="text-zinc-200 font-sans font-medium">{accountLabel}</span>
        </div>
        {selectedAccount?.broker_name && (
          <div className="font-mono text-[11px] text-zinc-400 hidden sm:inline">
            Broker: <span className="text-zinc-300">{selectedAccount.broker_name}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Starting Balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider font-mono text-[11px]">
              Starting Balance
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-mono tabular-nums text-zinc-100">
              {formatCurrency(startingBalance, { currency })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-zinc-400 font-mono">
            <span>Base capital deposited</span>
          </CardContent>
        </Card>

        {/* Current Balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider font-mono text-[11px]">
              Current Balance
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-mono tabular-nums text-zinc-100">
              {formatCurrency(currentBalance, { currency })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-zinc-400 font-mono">
            <span>Mark-to-market equity</span>
          </CardContent>
        </Card>

        {/* Realized Net P&L */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="uppercase tracking-wider font-mono text-[11px]">
                Net P&amp;L
              </CardDescription>
              {isProfit && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
              {isLoss && <ArrowDownRight className="w-4 h-4 text-rose-400" />}
              {isFlat && <Minus className="w-4 h-4 text-zinc-500" />}
            </div>
            <CardTitle
              className={cn('text-xl sm:text-2xl font-mono tabular-nums', {
                'text-emerald-400': isProfit,
                'text-rose-400': isLoss,
                'text-zinc-200': isFlat,
              })}
            >
              {formatCurrency(netPnL, { currency, showSign: true })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs font-mono">
            <span
              className={cn({
                'text-emerald-400': isProfit,
                'text-rose-400': isLoss,
                'text-zinc-400': isFlat,
              })}
            >
              {formatPercentage(netPnLPercentage, { showSign: true })} return
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
