import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { useTradingAccounts } from '@/src/hooks/useTradingAccounts';
import { TradeService } from '@/src/lib/services/trade-service';
import { autoDetectColumnMapping } from '@/src/lib/imports/mapping';
import { normalizeCsvRow, generateTradeFingerprint } from '@/src/lib/imports/normalizer';
import { executeTradeImport } from '@/src/lib/imports/importer';
import type {
  ParsedCsvResult,
  ColumnMapping,
  ValidatedImportRow,
  ImportResultSummary,
} from '@/src/types/import';
import type { Trade } from '@/src/types/trade';

import { FileUploadStep } from './file-upload-step';
import { ColumnMappingStep } from './column-mapping-step';
import { PreviewStep } from './preview-step';
import { ResultStep } from './result-step';
import { Check, Upload, Sliders, Eye, CheckCircle2 } from 'lucide-react';

type StepId = 'upload' | 'mapping' | 'preview' | 'result';

interface StepMeta {
  id: StepId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepMeta[] = [
  { id: 'upload', label: 'Upload CSV', icon: Upload },
  { id: 'mapping', label: 'Map Columns', icon: Sliders },
  { id: 'preview', label: 'Preview & Validate', icon: Eye },
  { id: 'result', label: 'Summary', icon: CheckCircle2 },
];

export function ImportWorkflow() {
  const { user } = useAuth();
  const { accounts, selectedAccountId: activeScopeId } = useTradingAccounts();

  // Workflow steps
  const [currentStep, setCurrentStep] = useState<StepId>('upload');

  // CSV Data & Mapping
  const [parsedCsv, setParsedCsv] = useState<ParsedCsvResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);

  // Target Trading Account
  const [targetAccountId, setTargetAccountId] = useState<string>('');

  // Existing Trades for Duplicate Detection
  const [existingTrades, setExistingTrades] = useState<Trade[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  // Execution & Results
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportResultSummary | null>(null);

  // Set default target account from active scope or first account
  useEffect(() => {
    if (activeScopeId && activeScopeId !== 'all') {
      setTargetAccountId(activeScopeId);
    } else if (accounts.length > 0 && !targetAccountId) {
      setTargetAccountId(accounts[0].id);
    }
  }, [activeScopeId, accounts, targetAccountId]);

  // Load existing trades for target account to compare fingerprints
  const loadExistingTrades = useCallback(async () => {
    if (!user || !targetAccountId) return;
    setIsLoadingExisting(true);
    try {
      const res = await TradeService.getTrades(user.id, {
        trading_account_id: targetAccountId,
        limit: 10000,
      });
      setExistingTrades(res.data || []);
    } catch {
      setExistingTrades([]);
    } finally {
      setIsLoadingExisting(false);
    }
  }, [user, targetAccountId]);

  useEffect(() => {
    if (targetAccountId) {
      loadExistingTrades();
    }
  }, [targetAccountId, loadExistingTrades]);

  // Compute existing fingerprints set
  const existingFingerprints = useMemo(() => {
    const set = new Set<string>();
    for (const t of existingTrades) {
      const fp = generateTradeFingerprint(
        t.trading_account_id,
        t.symbol,
        t.direction,
        t.entry_time,
        t.exit_time,
        t.entry_price,
        t.exit_price,
        t.quantity
      );
      set.add(fp);
    }
    return set;
  }, [existingTrades]);

  // Handler: When file is parsed
  const handleFileParsed = (result: ParsedCsvResult, file: File) => {
    setParsedCsv(result);
    setUploadedFile(file);
    const detected = autoDetectColumnMapping(result.headers);
    setColumnMapping(detected);
    setCurrentStep('mapping');
  };

  // Handler: When mapping is confirmed
  const handleConfirmMapping = (mapping: ColumnMapping) => {
    setColumnMapping(mapping);
    setCurrentStep('preview');
  };

  // Compute normalized & deduplicated rows for Preview
  const validatedRows: ValidatedImportRow[] = useMemo(() => {
    if (!parsedCsv || !columnMapping || !targetAccountId) return [];

    const seenInBatch = new Set<string>();

    return parsedCsv.rows.map((row, index) => {
      const normalized = normalizeCsvRow(row, columnMapping, targetAccountId, index);

      // If valid, verify against existing database trades and intra-batch duplicates
      if (normalized.status === 'valid') {
        const isDbDuplicate = existingFingerprints.has(normalized.fingerprint);
        const isBatchDuplicate = seenInBatch.has(normalized.fingerprint);

        if (isDbDuplicate || isBatchDuplicate) {
          return {
            ...normalized,
            status: 'duplicate',
            errors: isBatchDuplicate
              ? ['Duplicate row within this CSV upload']
              : ['Trade already exists in this trading account'],
          };
        }
        seenInBatch.add(normalized.fingerprint);
      }

      return normalized;
    });
  }, [parsedCsv, columnMapping, targetAccountId, existingFingerprints]);

  // Handler: Execute import
  const handleExecuteImport = async (skipDuplicates: boolean) => {
    if (!user || !targetAccountId || validatedRows.length === 0) return;

    setIsImporting(true);
    try {
      const summary = await executeTradeImport(user.id, targetAccountId, validatedRows, {
        skipDuplicates,
      });
      setImportSummary(summary);
      setCurrentStep('result');
    } catch (err: unknown) {
      console.error('Import execution error:', err);
    } finally {
      setIsImporting(false);
    }
  };

  // Handler: Reset workflow
  const handleReset = () => {
    setParsedCsv(null);
    setUploadedFile(null);
    setColumnMapping(null);
    setImportSummary(null);
    setCurrentStep('upload');
  };

  return (
    <div className="space-y-8">
      {/* Step Navigation Progress Tracker */}
      <nav aria-label="Import Progress" className="border-b border-zinc-850 pb-5">
        <ol className="flex items-center justify-between max-w-2xl mx-auto px-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = currentStep === step.id;
            const isCompleted =
              (step.id === 'upload' && currentStep !== 'upload') ||
              (step.id === 'mapping' && (currentStep === 'preview' || currentStep === 'result')) ||
              (step.id === 'preview' && currentStep === 'result');

            return (
              <li key={step.id} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-colors ${
                    isCurrent
                      ? 'bg-emerald-500 text-zinc-950 font-bold'
                      : isCompleted
                      ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/40'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    isCurrent
                      ? 'text-zinc-100 font-semibold'
                      : isCompleted
                      ? 'text-zinc-300'
                      : 'text-zinc-500'
                  }`}
                >
                  {step.label}
                </span>

                {idx < STEPS.length - 1 && (
                  <div className="w-6 sm:w-12 h-px bg-zinc-850 mx-1 sm:mx-3" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 1: Upload */}
      {currentStep === 'upload' && (
        <FileUploadStep onFileParsed={handleFileParsed} />
      )}

      {/* Step 2: Mapping */}
      {currentStep === 'mapping' && parsedCsv && columnMapping && (
        <ColumnMappingStep
          parsedCsv={parsedCsv}
          initialMapping={columnMapping}
          onConfirmMapping={handleConfirmMapping}
          onBack={() => setCurrentStep('upload')}
        />
      )}

      {/* Step 3: Preview */}
      {currentStep === 'preview' && (
        <PreviewStep
          rows={validatedRows}
          accounts={accounts}
          selectedAccountId={targetAccountId}
          onSelectAccount={(accId) => setTargetAccountId(accId)}
          onExecuteImport={handleExecuteImport}
          onBack={() => setCurrentStep('mapping')}
          isImporting={isImporting}
        />
      )}

      {/* Step 4: Result */}
      {currentStep === 'result' && importSummary && (
        <ResultStep summary={importSummary} onReset={handleReset} />
      )}
    </div>
  );
}
