import React, { useState, useEffect } from 'react';
import { Database, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { checkDatabaseStatus, type DatabaseStatus } from '@/src/lib/supabase/db-status';
import { DatabaseSetupModal } from './database-setup-modal';

export function DatabaseSetupBanner() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const runCheck = async () => {
    const res = await checkDatabaseStatus();
    setStatus(res);
  };

  useEffect(() => {
    runCheck();
  }, []);

  if (isDismissed || !status || status.isReady) {
    return (
      <DatabaseSetupModal
        open={isOpen}
        onOpenChange={setIsOpen}
        onVerified={runCheck}
      />
    );
  }

  return (
    <>
      <div className="bg-amber-950/70 border-b border-amber-800/80 px-4 py-2 text-xs text-amber-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Supabase Setup Required:</strong> Database tables (
              <code className="font-mono text-amber-300">
                {status.missingTables?.length ? status.missingTables.join(', ') : 'strategies, tags, mistakes, trade_strategies'}
              </code>
              ) are not yet created in PostgreSQL.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsOpen(true)}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold gap-1 px-2.5"
            >
              <span>Initialize Database</span>
              <ArrowRight className="w-3 h-3" />
            </Button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 text-amber-400 hover:text-amber-200 cursor-pointer"
              title="Dismiss for this session"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <DatabaseSetupModal
        open={isOpen}
        onOpenChange={setIsOpen}
        onVerified={runCheck}
      />
    </>
  );
}
