import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, getSupabaseConfig } from '@/src/lib/supabase/client';
import type { Profile } from '@/src/types/profile';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: AuthError | Error | null; emailConfirmationRequired?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isDemoMode: boolean;
  enterDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_STORAGE_KEY = 'tradejournal_demo_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const { isConfigured } = getSupabaseConfig();

  // Fetch user profile from Supabase profiles table
  const fetchProfile = useCallback(async (userId: string) => {
    if (!isConfigured) {
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error.message);
      }
      return data as Profile | null;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  }, [isConfigured]);

  // Initialize session and auth listeners
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      // 1. If Supabase is configured, use real Supabase Auth
      if (isConfigured) {
        try {
          const { data: { session: initialSession }, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('Initial session error:', error.message);
          }

          if (mounted) {
            if (initialSession?.user) {
              setSession(initialSession);
              setUser(initialSession.user);
              const userProfile = await fetchProfile(initialSession.user.id);
              if (mounted) setProfile(userProfile);
            }
          }
        } catch (err) {
          console.warn('Auth initialization error:', err);
        } finally {
          if (mounted) setIsLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!mounted) return;
            setSession(newSession);
            setUser(newSession?.user ?? null);

            if (newSession?.user) {
              const userProfile = await fetchProfile(newSession.user.id);
              if (mounted) setProfile(userProfile);
            } else {
              if (mounted) setProfile(null);
            }
            setIsLoading(false);
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      }

      // 2. Fallback mode if Supabase env vars are not yet configured in local environment
      try {
        const storedDemo = localStorage.getItem(DEMO_USER_STORAGE_KEY);
        if (storedDemo) {
          const parsed = JSON.parse(storedDemo);
          if (mounted) {
            setUser(parsed.user);
            setProfile(parsed.profile);
            setIsDemoMode(true);
          }
        }
      } catch {
        // ignore storage parse error
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [isConfigured, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      if (isConfigured) {
        const p = await fetchProfile(user.id);
        setProfile(p);
      }
    }
  }, [user, isConfigured, fetchProfile]);

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | Error | null }> => {
    setIsLoading(true);

    if (isConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        return { error };
      }

      setUser(data.user);
      setSession(data.session);
      if (data.user) {
        const p = await fetchProfile(data.user.id);
        setProfile(p);
      }
      setIsLoading(false);
      return { error: null };
    }

    // Demo/preview mode auth
    await new Promise((r) => setTimeout(r, 400));
    const demoUser: User = {
      id: 'demo-trader-uuid-001',
      app_metadata: {},
      user_metadata: { full_name: 'Alex Trader' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: email || 'trader@tradejournal.internal',
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const demoProfile: Profile = {
      id: demoUser.id,
      full_name: 'Alex Trader',
      avatar_url: null,
      timezone: 'America/New_York',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(
      DEMO_USER_STORAGE_KEY,
      JSON.stringify({ user: demoUser, profile: demoProfile })
    );

    setUser(demoUser);
    setProfile(demoProfile);
    setIsDemoMode(true);
    setIsLoading(false);
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error: AuthError | Error | null; emailConfirmationRequired?: boolean }> => {
    setIsLoading(true);

    if (isConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          setIsLoading(false);
          return { error };
        }

        setUser(data.user);
        setSession(data.session);

        // If a session was immediately returned, upsert the profile
        if (data.session && data.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              full_name: fullName,
              timezone: 'UTC',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            const p = await fetchProfile(data.user.id);
            setProfile(p);
          } catch (profileErr) {
            console.warn('Profile creation deferral:', profileErr);
          }
        }

        setIsLoading(false);
        const emailConfirmationRequired = Boolean(data.user && !data.session);
        return { error: null, emailConfirmationRequired };
      } catch (err: unknown) {
        setIsLoading(false);
        const msg = err instanceof Error ? err.message : 'Registration error occurred';
        return { error: new Error(msg) };
      }
    }

    // Demo mode signup
    await new Promise((r) => setTimeout(r, 400));
    const demoUser: User = {
      id: 'demo-trader-uuid-001',
      app_metadata: {},
      user_metadata: { full_name: fullName },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email,
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const demoProfile: Profile = {
      id: demoUser.id,
      full_name: fullName,
      avatar_url: null,
      timezone: 'UTC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(
      DEMO_USER_STORAGE_KEY,
      JSON.stringify({ user: demoUser, profile: demoProfile })
    );

    setUser(demoUser);
    setProfile(demoProfile);
    setIsDemoMode(true);
    setIsLoading(false);
    return { error: null, emailConfirmationRequired: false };
  };

  const signOut = async () => {
    setIsLoading(true);
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsDemoMode(false);
    setIsLoading(false);
  };

  const enterDemoMode = () => {
    signIn('demo@tradejournal.pro', 'demopassword123');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        isDemoMode,
        enterDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
