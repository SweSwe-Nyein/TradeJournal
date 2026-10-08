import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Upload,
  Clock,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { useAuth } from '@/src/hooks/useAuth';
import { AccountSelector } from '@/src/components/accounts/account-selector';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/trades': 'Trade Log',
  '/calendar': 'Performance Calendar',
  '/analytics': 'Performance Analytics',
  '/journal': 'Trading Journal',
  '/strategies': 'Strategy Playbook',
  '/settings': 'Account Settings',
  '/import': 'CSV Trade Import',
};

export function Topbar({
  onMobileMenuToggle,
  isMobileMenuOpen,
}: {
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}) {
  const location = useLocation();
  const { profile, isConfigured } = useAuth();

  const currentTitle = routeTitles[location.pathname] || 'Workspace';
  const timezone = profile?.timezone || 'UTC';

  return (
    <header className="h-14 border-b border-zinc-850 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-3 md:px-6 flex items-center justify-between gap-2">
      {/* Left zone: Mobile toggle + Breadcrumb + Account Selector */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 md:hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Route context */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs">
          <span className="text-zinc-500 font-mono">TradeJournal</span>
          <span className="text-zinc-600" aria-hidden="true">/</span>
          <span className="font-medium text-zinc-300">{currentTitle}</span>
        </div>

        {/* Reusable Account Selector */}
        <AccountSelector />
      </div>

      {/* Right zone: Controls & Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Timezone Indicator */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs font-mono text-zinc-400">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>{timezone}</span>
        </div>

        {/* Database Status indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-850">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="text-zinc-300 text-[11px]">
            {isConfigured ? 'Supabase Live' : 'Demo/Setup'}
          </span>
        </div>

        {/* Action button */}
        {location.pathname !== '/import' && (
          <Link to="/import">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Import Trades</span>
              <span className="sm:hidden">Import</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
