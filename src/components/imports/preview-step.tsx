import React, { useState } from 'react';
import type { ValidatedImportRow } from '@/src/types/import';
import type { TradingAccount } from '@/src/types/account';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { formatCurrency, formatPercentage } from '@/src/lib/formatting/currency';
import { formatDate } from '@/src/lib/formatting/date';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Upload,
  Landmark,
  Copy,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface PreviewStepProps {
  rows: ValidatedImportRow[];
  accounts: TradingAccount[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onExecuteImport: (skipDuplicates: boolean) => Promise<void>;
  onBack: () => void;
  isImporting: boolean;
}

export function PreviewStep({
  rows,
  accounts,
  selectedAccountId,
  onSelectAccount,
  onExecuteImport,
  onBack,
  isImporting,
}: PreviewStepProps) {
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid' | 'duplicate'>('all');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const validCount = rows.filter((r) => r.status === 'valid').length;
  const invalidCount = rows.filter((r) => r.status === 'invalid').length;
  const duplicateCount = rows.filter((r) => r.status === 'duplicate').length;

  const filteredRows = rows.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const canImport = Boolean(selectedAccountId && selectedAccountId !== 'all' && validCount > 0);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Target Trading Account & Options Banner */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Target Account Dropdown */}
          <div className="space-y-1.5 flex-1 max-w-md">
            <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              <span>Target Trading Account *</span>
            </label>
            {accounts.length > 0 ? (
              <select
                value={selectedAccountId}
                onChange={(e) => onSelectAccount(e.target.value)}
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-100 shadow-sm focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              >
                <option value="" disabled>
                  — Select Account to Import Into —
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.account_type}) · {acc.broker_name || 'Direct'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
                <span>No trading accounts configured. </span>
                <Link to="/settings" className="underline font-semibold text-amber-100">
                  Create an account in Settings
                </Link>
              </div>
            )}
            <p className="text-[11px] text-zinc-400">
              Imported trades will be tied directly to this account for P&amp;L and analytics.
            </p>
          </div>

          {/* Duplicate Handling Checkbox */}
          <div className="flex flex-col justify-end pt-1">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 w-4 h-4"
              />
              <span className="font-medium">Skip duplicate trades</span>
            </label>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-xs">
              Matches existing executions by account, ticker, direction, timestamps, prices, and lots.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant={filter === 'all' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs h-8 px-2.5"
          >
            All Rows ({rows.length})
          </Button>
          <Button
            type="button"
            variant={filter === 'valid' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilter('valid')}
            className={`text-xs h-8 px-2.5 gap-1.5 ${
              filter === 'valid' ? 'text-emerald-400 font-semibold' : 'text-zinc-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Valid ({validCount})</span>
          </Button>
          {duplicateCount > 0 && (
            <Button
              type="button"
              variant={filter === 'duplicate' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFilter('duplicate')}
              className={`text-xs h-8 px-2.5 gap-1.5 ${
                filter === 'duplicate' ? 'text-amber-400 font-semibold' : 'text-zinc-300'
              }`}
            >
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>Duplicates ({duplicateCount})</span>
            </Button>
          )}
          {invalidCount > 0 && (
            <Button
              type="button"
              variant={filter === 'invalid' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFilter('invalid')}
              className={`text-xs h-8 px-2.5 gap-1.5 ${
                filter === 'invalid' ? 'text-rose-400 font-semibold' : 'text-zinc-300'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Invalid ({invalidCount})</span>
            </Button>
          )}
        </div>

        <div className="text-xs text-zinc-400 font-mono">
          Ready to Import: <span className="text-emerald-400 font-semibold">{validCount}</span> trades
        </div>
      </div>

      {/* Preview Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800 font-mono text-[11px] text-zinc-400 uppercase tracking-wider z-10">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">Row</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Entry Time</th>
                <th className="py-2.5 px-3">Exit Time</th>
                <th className="py-2.5 px-3 text-right">Entry / Exit</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Net P&amp;L</th>
                <th className="py-2.5 px-3">Notes / Issue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/60 font-mono text-[11px]">
              {filteredRows.map((row) => {
                const data = row.data;
                const isPos = data ? data.net_pnl > 0 : false;
                const isNeg = data ? data.net_pnl < 0 : false;

                return (
                  <tr
                    key={row.index}
                    className={`hover:bg-zinc-900/40 transition-colors ${
                      row.status === 'invalid'
                        ? 'bg-rose-950/10'
                        : row.status === 'duplicate'
                        ? 'bg-amber-950/10'
                        : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-center text-zinc-500">
                      {row.index + 1}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      {row.status === 'valid' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Valid</span>
                        </span>
                      )}
                      {row.status === 'duplicate' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
                          <Copy className="w-3 h-3" />
                          <span>Duplicate</span>
                        </span>
                      )}
                      {row.status === 'invalid' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.5 rounded">
                          <XCircle className="w-3 h-3" />
                          <span>Invalid</span>
                        </span>
                      )}
                    </td>

                    {/* Symbol */}
                    <td className="py-2 px-3 font-sans font-semibold text-zinc-100">
                      {data ? data.symbol : row.raw.Symbol || row.raw.symbol || '—'}
                    </td>

                    {/* Direction */}
                    <td className="py-2 px-3">
                      {data ? (
                        <span
                          className={`uppercase font-medium ${
                            data.direction === 'long' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {data.direction}
                        </span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>

                    {/* Entry Time */}
                    <td className="py-2 px-3 text-zinc-300 truncate max-w-[140px]">
                      {data ? formatDate(data.entry_time) : row.raw['Entry Time'] || '—'}
                    </td>

                    {/* Exit Time */}
                    <td className="py-2 px-3 text-zinc-400 truncate max-w-[140px]">
                      {data?.exit_time ? formatDate(data.exit_time) : 'Open'}
                    </td>

                    {/* Prices */}
                    <td className="py-2 px-3 text-right tabular-nums text-zinc-200">
                      {data ? (
                        <>
                          <span>{data.entry_price.toFixed(2)}</span>
                          <span className="text-zinc-500 mx-1">→</span>
                          <span className="text-zinc-400">
                            {data.exit_price ? data.exit_price.toFixed(2) : '—'}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="py-2 px-3 text-right tabular-nums text-zinc-300">
                      {data ? data.quantity : '—'}
                    </td>

                    {/* Net P&L */}
                    <td
                      className={`py-2 px-3 text-right tabular-nums font-semibold ${
                        isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-zinc-400'
                      }`}
                    >
                      {data ? formatCurrency(data.net_pnl, { showSign: true }) : '—'}
                    </td>

                    {/* Notes or Validation Issues */}
                    <td className="py-2 px-3 font-sans text-xs max-w-xs">
                      {row.status === 'invalid' ? (
                        <span className="text-rose-400 font-mono text-[11px] block truncate" title={row.errors.join(', ')}>
                          {row.errors.join(', ')}
                        </span>
                      ) : row.status === 'duplicate' ? (
                        <span className="text-amber-400/90 font-mono text-[11px]">
                          Already exists in account
                        </span>
                      ) : (
                        <span className="text-zinc-400 truncate block text-[11px]" title={data?.notes || ''}>
                          {data?.notes || '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Execution Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={isImporting}
          className="gap-2 text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Mapping</span>
        </Button>

        <Button
          type="button"
          size="sm"
          disabled={!canImport || isImporting}
          onClick={() => onExecuteImport(skipDuplicates)}
          className="gap-2 text-xs"
        >
          {isImporting ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
              <span>Importing Trades...</span>
            </span>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span>
                Confirm Import ({validCount} Valid {validCount === 1 ? 'Trade' : 'Trades'})
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
