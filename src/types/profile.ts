import type { Database } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'] & {
  currency?: string | null;
  date_format?: string | null;
};
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'] & {
  currency?: string | null;
  date_format?: string | null;
};
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'] & {
  currency?: string | null;
  date_format?: string | null;
};
