import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/src/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { useAuth } from '@/src/hooks/useAuth';
import { useProfile } from '@/src/hooks/useProfile';
import { TradingAccountsManager } from '@/src/components/accounts/trading-accounts-manager';
import {
  Check,
  ShieldCheck,
  Database,
  AlertCircle,
  AlertTriangle,
  UserCircle2,
  RefreshCw,
} from 'lucide-react';
import { getSupabaseConfig } from '@/src/lib/supabase/client';
import {
  checkDatabaseStatus,
  type DatabaseStatus,
  SUPABASE_PROJECT_ID,
} from '@/src/lib/supabase/db-status';

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

export function SettingsPage() {
  const { user, profile } = useAuth();
  const { updateProfile, isUpdating } = useProfile();
  const { isConfigured, url } = getSupabaseConfig();

  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Database Diagnostics State
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const checkDb = async () => {
    setIsCheckingDb(true);
    try {
      const res = await checkDatabaseStatus();
      setDbStatus(res);
    } catch {
      // ignore
    } finally {
      setIsCheckingDb(false);
    }
  };

  useEffect(() => {
    checkDb();
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setTimezone(profile.timezone || 'UTC');
      setCurrency(profile.currency || 'USD');
      setDateFormat(profile.date_format || 'YYYY-MM-DD');
    } else if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [profile, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaveSuccess(false);

    const { error } = await updateProfile({
      full_name: fullName,
      timezone: timezone,
      currency: currency,
      date_format: dateFormat,
    });

    if (error) {
      setErrorMsg(error.message || 'Failed to save changes');
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      <PageHeader
        category="Account"
        title="Settings"
        description="Manage your trading accounts, trader profile, analytics timezone, and database preferences."
      />

      {/* 1. Trading Accounts Management Section */}
      <section className="space-y-3">
        <TradingAccountsManager />
      </section>

      {/* 2. Trader Profile Settings Card */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <UserCircle2 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-base font-semibold text-zinc-100">Trader Profile</h2>
        </div>
        <Card>
          <form onSubmit={handleSaveProfile}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Public Information</CardTitle>
              <CardDescription>
                Your public trader identity and default time reference for session reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-md bg-red-950/60 border border-red-800/60 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-xs">
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="text-xs">
                    Trading Session Timezone
                  </Label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-100 shadow-sm focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  >
                    {commonTimezones.map((tz) => (
                      <option key={tz} value={tz} className="bg-zinc-900">
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currency" className="text-xs">
                    Account Currency
                  </Label>
                  <Input
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="e.g. USD"
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dateFormat" className="text-xs">
                    Date Format
                  </Label>
                  <Input
                    id="dateFormat"
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    placeholder="e.g. YYYY-MM-DD"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">
                  Email Address
                </Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="text-xs bg-zinc-900/40 text-zinc-400 cursor-not-allowed"
                />
                <span className="text-[11px] text-zinc-500">
                  Email authentication is managed via Supabase Auth.
                </span>
              </div>
            </CardContent>
            <CardFooter className="border-t border-zinc-850/80 px-6 py-3 flex justify-end">
              <Button type="submit" size="sm" disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </section>

      {/* 3. Supabase Connection Diagnostics Card */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-zinc-100">Database &amp; PostgreSQL Diagnostics</h2>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Supabase Infrastructure</CardTitle>
            <CardDescription>
              Operational status of database tables, row-level security, and schema cache for project <code className="text-zinc-300 font-mono">{SUPABASE_PROJECT_ID}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-zinc-850/60 font-mono">
              <span className="text-zinc-400">Connection Mode:</span>
              <span className="text-emerald-400 font-semibold">
                {isConfigured ? 'Live Supabase API' : 'Sandbox (Demo Fallback)'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-zinc-850/60 font-mono">
              <span className="text-zinc-400">Supabase Project URL:</span>
              <span className="text-zinc-200 truncate max-w-xs font-mono">
                {url}
              </span>
            </div>

            {/* Trading Accounts Table Status */}
            <div className="flex items-center justify-between py-2 border-b border-zinc-850/60 font-mono">
              <span className="text-zinc-400">Trading Accounts Table:</span>
              {dbStatus?.accountsTableExists ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Table Verified in PostgreSQL (RLS Enforced)</span>
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Table Not Created in PostgreSQL</span>
                </span>
              )}
            </div>

            {/* Trades Table Status */}
            <div className="flex items-center justify-between py-2 border-b border-zinc-850/60 font-mono">
              <span className="text-zinc-400">Trades Table:</span>
              {dbStatus?.tradesTableExists ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Table Verified in PostgreSQL (RLS Enforced)</span>
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Table Not Created in PostgreSQL</span>
                </span>
              )}
            </div>

            {/* Profiles Table Status */}
            <div className="flex items-center justify-between py-2 border-b border-zinc-850/60 font-mono">
              <span className="text-zinc-400">Profiles Table:</span>
              {dbStatus?.profilesTableExists ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Table Verified in PostgreSQL (RLS Enforced)</span>
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Table Not Created in PostgreSQL</span>
                </span>
              )}
            </div>

            <div className="flex items-center justify-between py-2 font-mono">
              <span className="text-zinc-400">Active User UUID:</span>
              <span className="text-zinc-200 truncate max-w-xs font-mono">
                {user?.id || '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      
    </div>
  );
}
