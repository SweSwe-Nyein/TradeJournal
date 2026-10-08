import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type TypedSupabaseClient = SupabaseClient<Database>;
export * from './database.types';
export * from './profile';
export * from './account';
export * from './trade';
export * from './import';
