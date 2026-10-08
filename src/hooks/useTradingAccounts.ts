import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, getSupabaseConfig } from '@/src/lib/supabase/client';
import { useAuth } from './useAuth';
import type {
  TradingAccount,
  TradingAccountInsert,
  TradingAccountUpdate,
  TradingAccountSummary,
} from '@/src/types/account';

const LOCAL_STORAGE_PREFIX = 'tradejournal_accounts_';
const SELECTED_ACCOUNT_KEY = 'tradejournal_selected_account_id';

export function useTradingAccounts() {
  const { user } = useAuth();
  const { isConfigured } = getSupabaseConfig();
  const [searchParams, setSearchParams] = useSearchParams();

  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Read selected account from URL query param `?account=...` with fallback to localStorage
  const urlAccountId = searchParams.get('account');
  const storedAccountId = typeof window !== 'undefined' ? localStorage.getItem(SELECTED_ACCOUNT_KEY) : null;
  const initialAccountId = urlAccountId || storedAccountId || 'all';

  const [selectedAccountId, setSelectedAccountIdState] = useState<string>(initialAccountId);

  // Synchronize URL and localStorage when account selection changes
  const setSelectedAccountId = useCallback(
    (id: string) => {
      setSelectedAccountIdState(id);
      try {
        localStorage.setItem(SELECTED_ACCOUNT_KEY, id);
      } catch {
        // ignore storage errors
      }

      // Update URL search parameter cleanly while preserving other existing parameters
      const newParams = new URLSearchParams(searchParams);
      if (id === 'all') {
        newParams.delete('account');
      } else {
        newParams.set('account', id);
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Sync if URL search param changes externally (e.g., back/forward navigation)
  useEffect(() => {
    if (urlAccountId && urlAccountId !== selectedAccountId) {
      setSelectedAccountIdState(urlAccountId);
    } else if (!urlAccountId && storedAccountId && selectedAccountId !== storedAccountId && storedAccountId !== 'all') {
      setSelectedAccountIdState(storedAccountId);
    }
  }, [urlAccountId, storedAccountId, selectedAccountId]);

  // Storage key for demo/sandbox user
  const demoStorageKey = `${LOCAL_STORAGE_PREFIX}${user?.id || 'demo'}`;

  // Fetch accounts from Supabase or localStorage fallback
  const fetchAccounts = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (isConfigured) {
      try {
        const { data, error: sbError } = await supabase
          .from('trading_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (sbError) {
          if (sbError.code === 'PGRST205') {
            console.warn("Supabase table 'trading_accounts' not yet created. Using local storage session.");
            const stored = localStorage.getItem(demoStorageKey);
            if (stored) {
              setAccounts(JSON.parse(stored));
            }
          } else {
            setError(sbError.message);
          }
        } else {
          setAccounts((data as unknown as TradingAccount[]) || []);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch accounts';
        setError(message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Demo/sandbox mode
    try {
      const stored = localStorage.getItem(demoStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as TradingAccount[];
        setAccounts(parsed);
      } else {
        // Pre-seed an initial default trading account so the user can immediately experience the UI
        const defaultAccounts: TradingAccount[] = [
          {
            id: 'a0000000-0000-4000-8000-000000000001',
            user_id: user.id,
            name: 'Apex 50K PA',
            account_type: 'prop_firm',
            broker_name: 'Tradovate',
            starting_balance: 50000.0,
            current_balance: 50000.0,
            currency: 'USD',
            timezone: 'America/New_York',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        localStorage.setItem(demoStorageKey, JSON.stringify(defaultAccounts));
        setAccounts(defaultAccounts);
      }
    } catch {
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isConfigured, demoStorageKey]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Create account
  const createAccount = async (
    payload: Omit<TradingAccountInsert, 'id' | 'user_id' | 'current_balance' | 'created_at' | 'updated_at'>
  ): Promise<{ data: TradingAccount | null; error: Error | null }> => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    setError(null);

    if (isConfigured) {
      try {
        const insertData = {
          user_id: user.id,
          name: payload.name,
          account_type: payload.account_type,
          broker_name: payload.broker_name || null,
          starting_balance: payload.starting_balance,
          current_balance: payload.starting_balance, // Initially equals starting balance
          currency: payload.currency || 'USD',
          timezone: payload.timezone || 'UTC',
        };

        const { data, error: sbError } = await supabase
          .from('trading_accounts')
          .insert(insertData)
          .select()
          .single();

        if (sbError) {
          if (sbError.code === 'PGRST205') {
            const setupMsg =
              "Supabase database setup required: The 'trading_accounts' table does not exist in PostgreSQL. Click 'Initialize Database' in the top banner to copy and run the setup script.";
            console.warn(setupMsg);
            setError(setupMsg);
            const fallbackAccount: TradingAccount = {
              id: typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0'),
              user_id: user.id,
              name: payload.name,
              account_type: payload.account_type,
              broker_name: payload.broker_name || null,
              starting_balance: payload.starting_balance,
              current_balance: payload.starting_balance,
              currency: payload.currency || 'USD',
              timezone: payload.timezone || 'UTC',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            const updated = [...accounts, fallbackAccount];
            setAccounts(updated);
            localStorage.setItem(demoStorageKey, JSON.stringify(updated));
            setSelectedAccountId(fallbackAccount.id);
            return {
              data: fallbackAccount,
              error: new Error(
                "Table 'trading_accounts' does not exist in Supabase yet. Please run the SQL setup script via the top banner to enable permanent PostgreSQL database storage."
              ),
            };
          }
          setError(sbError.message);
          return { data: null, error: new Error(sbError.message) };
        }

        const newAccount = data as unknown as TradingAccount;
        setAccounts((prev) => [...prev, newAccount]);
        setSelectedAccountId(newAccount.id);
        return { data: newAccount, error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create account';
        setError(message);
        return { data: null, error: new Error(message) };
      }
    }

    // Demo/Sandbox creation
    const newAccount: TradingAccount = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0'),
      user_id: user.id,
      name: payload.name,
      account_type: payload.account_type,
      broker_name: payload.broker_name || null,
      starting_balance: payload.starting_balance,
      current_balance: payload.starting_balance,
      currency: payload.currency || 'USD',
      timezone: payload.timezone || 'UTC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedList = [...accounts, newAccount];
    setAccounts(updatedList);
    try {
      localStorage.setItem(demoStorageKey, JSON.stringify(updatedList));
    } catch {
      // ignore
    }
    setSelectedAccountId(newAccount.id);
    return { data: newAccount, error: null };
  };

  // Update account
  const updateAccount = async (
    id: string,
    payload: TradingAccountUpdate
  ): Promise<{ data: TradingAccount | null; error: Error | null }> => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    setError(null);

    if (isConfigured) {
      try {
        const { data, error: sbError } = await supabase
          .from('trading_accounts')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (sbError) {
          setError(sbError.message);
          return { data: null, error: new Error(sbError.message) };
        }

        const updated = data as unknown as TradingAccount;
        setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
        return { data: updated, error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update account';
        setError(message);
        return { data: null, error: new Error(message) };
      }
    }

    // Demo/Sandbox update
    const updatedList = accounts.map((a) => {
      if (a.id === id) {
        return {
          ...a,
          ...payload,
          updated_at: new Date().toISOString(),
        } as TradingAccount;
      }
      return a;
    });

    setAccounts(updatedList);
    try {
      localStorage.setItem(demoStorageKey, JSON.stringify(updatedList));
    } catch {
      // ignore
    }
    const updated = updatedList.find((a) => a.id === id) || null;
    return { data: updated, error: null };
  };

  // Delete account
  const deleteAccount = async (id: string): Promise<{ success: boolean; error: Error | null }> => {
    if (!user) return { success: false, error: new Error('User not authenticated') };

    setError(null);

    if (isConfigured) {
      try {
        const { error: sbError } = await supabase
          .from('trading_accounts')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (sbError) {
          setError(sbError.message);
          return { success: false, error: new Error(sbError.message) };
        }

        setAccounts((prev) => prev.filter((a) => a.id !== id));
        if (selectedAccountId === id) {
          setSelectedAccountId('all');
        }
        return { success: true, error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete account';
        setError(message);
        return { success: false, error: new Error(message) };
      }
    }

    // Demo/Sandbox delete
    const updatedList = accounts.filter((a) => a.id !== id);
    setAccounts(updatedList);
    try {
      localStorage.setItem(demoStorageKey, JSON.stringify(updatedList));
    } catch {
      // ignore
    }
    if (selectedAccountId === id) {
      setSelectedAccountId('all');
    }
    return { success: true, error: null };
  };

  // Currently selected account instance
  const selectedAccount = useMemo(() => {
    if (selectedAccountId === 'all') return null;
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  // Summary calculation (Starting balance, Current balance, Net P&L)
  const summary: TradingAccountSummary = useMemo(() => {
    if (selectedAccount) {
      const starting = Number(selectedAccount.starting_balance) || 0;
      const current = Number(selectedAccount.current_balance) || 0;
      const netPnL = current - starting;
      const netPnLPercentage = starting > 0 ? (netPnL / starting) * 100 : 0;
      return {
        startingBalance: starting,
        currentBalance: current,
        netPnL,
        netPnLPercentage,
        currency: selectedAccount.currency || 'USD',
      };
    }

    // All Accounts aggregate
    const starting = accounts.reduce((sum, a) => sum + (Number(a.starting_balance) || 0), 0);
    const current = accounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);
    const netPnL = current - starting;
    const netPnLPercentage = starting > 0 ? (netPnL / starting) * 100 : 0;
    return {
      startingBalance: starting,
      currentBalance: current,
      netPnL,
      netPnLPercentage,
      currency: accounts[0]?.currency || 'USD',
    };
  }, [accounts, selectedAccount]);

  return {
    accounts,
    isLoading,
    error,
    selectedAccountId,
    selectedAccount,
    setSelectedAccountId,
    createAccount,
    updateAccount,
    deleteAccount,
    refreshAccounts: fetchAccounts,
    summary,
  };
}
