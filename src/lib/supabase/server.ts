import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/src/types/database.types';
import { getSupabaseConfig } from './client';

/**
 * Server client utility for server-side operations, route handlers, or background jobs.
 * Ensures the service-role key is never exposed to client bundles.
 */
export function createServerClient(customAuthHeader?: string) {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  const safeUrl = isConfigured ? url : 'https://placeholder-project.supabase.co';
  const safeKey = isConfigured ? anonKey : 'placeholder-anon-key';

  return createSupabaseClient<Database>(safeUrl, safeKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: customAuthHeader ? { Authorization: customAuthHeader } : {},
    },
  });
}
