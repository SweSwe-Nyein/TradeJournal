import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/src/types/database.types';

export const FULL_SUPABASE_URL = 'https://psnoqlfyugqoolrzudqx.supabase.co';
export const FULL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbm9xbGZ5dWdxb29scnp1ZHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MjU0MzIsImV4cCI6MjEwNzAwMTQzMn0.As2l_h5oxSmKxuDMyK-hTkv7Fg58mKKnO0XLD94r7rU';

/**
 * Checks if a string is a complete 3-segment JWT (header.payload.signature)
 */
function isCompleteJwt(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.trim().split('.');
  return parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0;
}

/**
 * Returns the Supabase URL and Anon Key.
 * Validates that the JWT token contains all 3 segments (header.payload.signature).
 */
export const getSupabaseConfig = () => {
  const envUrl =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL)) ||
    (typeof process !== 'undefined' &&
      process.env &&
      (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)) ||
    '';

  let envKey =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
    (typeof process !== 'undefined' &&
      process.env &&
      (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
    '';

  const url = envUrl && envUrl.startsWith('http') ? envUrl : FULL_SUPABASE_URL;

  // Verify that the anon key is a complete, un-truncated 3-part JWT
  if (!isCompleteJwt(envKey)) {
    envKey = FULL_SUPABASE_ANON_KEY;
  }

  const anonKey = envKey;
  const isConfigured = Boolean(
    url &&
    anonKey &&
    url.startsWith('http') &&
    isCompleteJwt(anonKey)
  );

  return { url, anonKey, isConfigured };
};

export function createClient() {
  const { url, anonKey } = getSupabaseConfig();

  return createSupabaseClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'tradejournal-auth-token',
    },
  });
}

// Singleton client for standard client-side usage
export const supabase = createClient();
