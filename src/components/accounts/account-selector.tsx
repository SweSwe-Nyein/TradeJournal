import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Layers, Landmark } from 'lucide-react';
import { useTradingAccounts } from '@/src/hooks/useTradingAccounts';
import { formatCurrency } from '@/src/lib/formatting/currency';
import { cn } from '@/src/lib/utils';
import { Link } from 'react-router-dom';

export function AccountSelector({ className }: { className?: string }) {
  const {
    accounts,
    selectedAccountId,
    selectedAccount,
    setSelectedAccountId,
    isLoading,
  } = useTradingAccounts();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayText =
    selectedAccountId === 'all'
      ? `All Accounts (${accounts.length})`
      : selectedAccount?.name || 'Select Account';

  return (
    <div className={cn('relative inline-block text-left', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 text-xs font-medium text-zinc-200 transition-colors cursor-pointer',
          'hover:bg-zinc-850 hover:border-zinc-750 focus:outline-none focus:ring-1 focus:ring-zinc-600',
          isOpen && 'border-zinc-700 bg-zinc-850'
        )}
      >
        <div className="w-4 h-4 rounded bg-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
          {selectedAccountId === 'all' ? (
            <Layers className="w-2.5 h-2.5" />
          ) : (
            <Landmark className="w-2.5 h-2.5" />
          )}
        </div>
        <span className="truncate max-w-[140px] sm:max-w-[200px] font-sans font-medium">
          {isLoading ? 'Loading accounts...' : displayText}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-zinc-400 transition-transform duration-150',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-zinc-850/80 mb-1">
            Trading Account Scope
          </div>

          {/* All Accounts Option */}
          <button
            type="button"
            onClick={() => {
              setSelectedAccountId('all');
              setIsOpen(false);
            }}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-2 rounded text-xs text-left transition-colors cursor-pointer',
              selectedAccountId === 'all'
                ? 'bg-zinc-900 text-white font-medium'
                : 'text-zinc-300 hover:bg-zinc-900/60 hover:text-white'
            )}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>All Accounts</span>
            </div>
            {selectedAccountId === 'all' && (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          {/* Individual Accounts */}
          {accounts.length > 0 && (
            <div className="my-1 border-t border-zinc-850/80 pt-1 space-y-0.5 max-h-56 overflow-y-auto">
              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-zinc-900 text-white font-medium'
                        : 'text-zinc-300 hover:bg-zinc-900/60 hover:text-white'
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{acc.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          · {acc.account_type === 'prop_firm' ? 'Prop' : acc.account_type}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 tabular-nums">
                        {formatCurrency(Number(acc.current_balance), { currency: acc.currency })}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {accounts.length === 0 && (
            <div className="p-3 text-center text-xs text-zinc-400">
              <p>No trading accounts yet.</p>
              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                className="mt-1 inline-block text-emerald-400 hover:underline text-[11px]"
              >
                + Add in Settings
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
