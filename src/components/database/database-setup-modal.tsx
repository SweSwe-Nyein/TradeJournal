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
import {
  Database,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Code2,
} from 'lucide-react';
import {
  SETUP_SQL_SCRIPT,
  MIGRATION_4_SQL_SCRIPT,
  SUPABASE_PROJECT_ID,
  SUPABASE_SQL_EDITOR_URL,
  checkDatabaseStatus,
  type DatabaseStatus,
} from '@/src/lib/supabase/db-status';

interface DatabaseSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified?: () => void;
}

export function DatabaseSetupModal({
  open,
  onOpenChange,
  onVerified,
}: DatabaseSetupModalProps) {
  const [activeScript, setActiveScript] = useState<'migration4' | 'complete'>('migration4');
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [latestStatus, setLatestStatus] = useState<DatabaseStatus | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showSql, setShowSql] = useState(false);

  const scriptToCopy = activeScript === 'migration4' ? MIGRATION_4_SQL_SCRIPT : SETUP_SQL_SCRIPT;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scriptToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = scriptToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const status = await checkDatabaseStatus();
      setLatestStatus(status);
      if (status.isReady) {
        setIsSuccess(true);
        setVerificationResult('All 9 database tables verified! Your Supabase database is ready to store trading data.');
        if (onVerified) onVerified();
      } else {
        setIsSuccess(false);
        setVerificationResult(
          `Missing tables: ${status.missingTables.join(', ')}. Make sure you clicked "Run" in your Supabase SQL Editor.`
        );
      }
    } catch (err: unknown) {
      setIsSuccess(false);
      setVerificationResult(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-zinc-100">Setup Supabase Database</DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs">
                Your app is connected to Supabase (<code className="text-zinc-300 font-mono">{SUPABASE_PROJECT_ID}</code>), but the database tables have not been created in PostgreSQL yet.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Script Selection */}
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveScript('migration4')}
              className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                activeScript === 'migration4'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Migration: Strategies, Tags & Mistakes (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setActiveScript('complete')}
              className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                activeScript === 'complete'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Full Database Schema (All Tables)
            </button>
          </div>

          {/* Quick 3-Step Guide */}
          <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2.5">
            <h4 className="font-semibold text-zinc-200 uppercase tracking-wider font-mono text-[11px]">
              3 Steps to Enable Database Storage (takes 10 seconds):
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-zinc-300 leading-relaxed font-sans">
              <li>
                Click <strong className="text-emerald-400">Copy SQL ({activeScript === 'migration4' ? 'Migration' : 'Full Schema'})</strong> below.
              </li>
              <li>
                Click <strong className="text-emerald-400">Open Supabase SQL Editor</strong> to open your project&apos;s SQL query console.
              </li>
              <li>
                Paste the SQL into the editor and click the green <strong className="text-emerald-400">&quot;Run&quot;</strong> button.
              </li>
            </ol>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              onClick={handleCopy}
              className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'SQL Copied to Clipboard!' : `1. Copy ${activeScript === 'migration4' ? 'Migration' : 'Full'} SQL`}</span>
            </Button>

            <a
              href={SUPABASE_SQL_EDITOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button type="button" variant="outline" className="gap-2 text-xs border-zinc-700">
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                <span>2. Open Supabase SQL Editor</span>
              </Button>
            </a>

            <Button
              type="button"
              variant="secondary"
              onClick={handleVerify}
              disabled={isVerifying}
              className="gap-2 text-xs ml-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>3. Verify Tables</span>
            </Button>
          </div>

          {/* Verification Feedback Banner */}
          {verificationResult && (
            <div
              className={`p-3 rounded border text-xs flex items-center gap-2 ${
                isSuccess
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-800 text-amber-300'
              }`}
            >
              {isSuccess ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{verificationResult}</span>
            </div>
          )}

          {/* Collapsible SQL Script Preview */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setShowSql((prev) => !prev)}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer font-mono"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showSql ? 'Hide SQL Script Preview' : 'View SQL Script Preview'}</span>
            </button>

            {showSql && (
              <pre className="p-3 bg-zinc-950 border border-zinc-850 rounded text-[11px] font-mono text-zinc-300 max-h-60 overflow-y-auto whitespace-pre leading-relaxed select-all">
                {scriptToCopy}
              </pre>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-850 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
