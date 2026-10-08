import React from 'react';
import { Link } from 'react-router-dom';
import type { ImportResultSummary } from '@/src/types/import';
import { Button } from '@/src/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import {
  CheckCircle2,
  Copy,
  AlertCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface ResultStepProps {
  summary: ImportResultSummary;
  onReset: () => void;
}

export function ResultStep({ summary, onReset }: ResultStepProps) {
  const isCompleteSuccess =
    summary.importedCount > 0 &&
    summary.failedCount === 0 &&
    summary.invalidCount === 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in-0 duration-200">
      {/* Hero Banner */}
      <div className="text-center py-4">
        <div
          className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3.5 border ${
            summary.importedCount > 0
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}
        >
          {summary.importedCount > 0 ? (
            <CheckCircle2 className="w-7 h-7" />
          ) : (
            <AlertCircle className="w-7 h-7" />
          )}
        </div>

        <h2 className="text-xl font-bold tracking-tight text-zinc-100">
          {summary.importedCount > 0
            ? 'Import Successfully Completed'
            : 'Import Completed With Warnings'}
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Processed {summary.totalRows.toLocaleString()} total rows from your uploaded CSV statement.
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Imported */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              Imported
            </span>
            <span className="text-2xl font-mono tabular-nums font-bold text-emerald-400 mt-1 block">
              {summary.importedCount}
            </span>
          </CardContent>
        </Card>

        {/* Skipped Duplicates */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              Duplicates
            </span>
            <span className="text-2xl font-mono tabular-nums font-bold text-amber-400 mt-1 block">
              {summary.skippedDuplicatesCount}
            </span>
          </CardContent>
        </Card>

        {/* Invalid Rows */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              Invalid
            </span>
            <span className="text-2xl font-mono tabular-nums font-bold text-zinc-400 mt-1 block">
              {summary.invalidCount}
            </span>
          </CardContent>
        </Card>

        {/* Failed Inserts */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              Failed
            </span>
            <span
              className={`text-2xl font-mono tabular-nums font-bold mt-1 block ${
                summary.failedCount > 0 ? 'text-rose-400' : 'text-zinc-500'
              }`}
            >
              {summary.failedCount}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Error Breakdown if errors occurred */}
      {summary.errors.length > 0 && (
        <Card className="border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-mono tracking-wider text-rose-400 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              <span>Skipped &amp; Invalid Row Log ({summary.errors.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-48 overflow-y-auto divide-y divide-zinc-850/60 font-mono text-[11px]">
            {summary.errors.map((err, idx) => (
              <div key={idx} className="p-2.5 px-4 flex items-start justify-between gap-3 text-zinc-300">
                <span className="text-zinc-500 shrink-0">Row {err.row}</span>
                {err.symbol && <span className="font-semibold text-zinc-200">{err.symbol}</span>}
                <span className="text-zinc-400 text-right truncate flex-1">{err.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <Link to="/trades">
          <Button size="sm" className="gap-2 text-xs w-full sm:w-auto">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open Trade Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="gap-2 text-xs w-full sm:w-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Import Another File</span>
        </Button>
      </div>
    </div>
  );
}
