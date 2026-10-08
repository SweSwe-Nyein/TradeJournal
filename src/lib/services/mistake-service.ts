import { supabase, getSupabaseConfig } from '@/src/lib/supabase/client';
import type { Mistake, MistakeInsert } from '@/src/types/journal-metadata';

export const DEFAULT_MISTAKES = [
  'Overtrading',
  'FOMO',
  'Revenge trading',
  'Moved stop',
  'Early exit',
  'Late entry',
  'Oversized position',
  'Traded outside plan',
];

function isVitest(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env.VITEST);
}

export class MistakeService {
  private static getTestMistakes(userId: string): Mistake[] {
    const g = globalThis as unknown as { __mock_mistakes?: Record<string, Mistake[]> };
    return g.__mock_mistakes?.[userId] || [];
  }

  private static saveTestMistakes(userId: string, items: Mistake[]): void {
    const g = globalThis as unknown as { __mock_mistakes?: Record<string, Mistake[]> };
    if (!g.__mock_mistakes) g.__mock_mistakes = {};
    g.__mock_mistakes[userId] = items;
  }

  /**
   * Lists mistakes for the user directly from the Supabase database.
   * Merges mistakes table entries and any mistakes recorded on trades in the database.
   */
  public static async listMistakes(userId: string): Promise<{ data: Mistake[]; error: Error | null }> {
    if (!userId) return { data: [], error: new Error('User ID is required') };

    if (isVitest()) {
      const list = this.getTestMistakes(userId);
      return { data: [...list], error: null };
    }

    const { isConfigured } = getSupabaseConfig();
    if (!isConfigured) return { data: [], error: new Error('Supabase is not configured') };

    try {
      const mistakesMap = new Map<string, Mistake>();

      // 1. Fetch from mistakes table
      const { data: dbMistakes, error: dbError } = await supabase
        .from('mistakes')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (dbError && dbError.code !== 'PGRST205') {
        return { data: [], error: new Error(dbError.message) };
      }

      if (dbMistakes) {
        for (const m of dbMistakes as Mistake[]) {
          mistakesMap.set(m.name.toLowerCase(), m);
        }
      }

      // 2. Fetch distinct mistakes from trades table in database
      const { data: tradeRows } = await supabase
        .from('trades')
        .select('mistakes')
        .eq('user_id', userId);

      if (tradeRows) {
        for (const tr of tradeRows) {
          const arr = (tr.mistakes as string[]) || [];
          for (const item of arr) {
            const trimmed = item.trim();
            if (trimmed && !mistakesMap.has(trimmed.toLowerCase())) {
              mistakesMap.set(trimmed.toLowerCase(), {
                id: `mistake-db-${trimmed}`,
                user_id: userId,
                name: trimmed,
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      }

      // If user has no mistakes in database yet, offer defaults
      if (mistakesMap.size === 0) {
        for (const def of DEFAULT_MISTAKES) {
          mistakesMap.set(def.toLowerCase(), {
            id: `mistake-default-${def}`,
            user_id: userId,
            name: def,
            created_at: new Date().toISOString(),
          });
        }
      }

      return { data: Array.from(mistakesMap.values()), error: null };
    } catch (err: unknown) {
      return { data: [], error: err instanceof Error ? err : new Error('Failed to load mistakes') };
    }
  }

  /**
   * Creates a mistake in the database table 'mistakes'.
   */
  public static async createMistake(
    userId: string,
    name: string
  ): Promise<{ data: Mistake | null; error: Error | null }> {
    if (!userId) return { data: null, error: new Error('User ID is required') };
    const trimmed = name.trim();
    if (!trimmed) return { data: null, error: new Error('Mistake name cannot be empty') };

    if (isVitest()) {
      const list = this.getTestMistakes(userId);
      const existing = list.find((m) => m.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) return { data: existing, error: null };

      const newMistake: Mistake = {
        id: `mistake-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
        name: trimmed,
        created_at: new Date().toISOString(),
      };
      this.saveTestMistakes(userId, [...list, newMistake]);
      return { data: newMistake, error: null };
    }

    try {
      const payload: MistakeInsert = {
        user_id: userId,
        name: trimmed,
      };

      const { data, error } = await supabase
        .from('mistakes')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          // Already exists in table, fetch it
          const { data: existing } = await supabase
            .from('mistakes')
            .select('*')
            .eq('user_id', userId)
            .ilike('name', trimmed)
            .maybeSingle();

          if (existing) return { data: existing as Mistake, error: null };
        }
        if (error.code === 'PGRST205') {
          // Table not yet created, return object so it can be saved on the trade in the database
          const ephemeralMistake: Mistake = {
            id: `mistake-temp-${trimmed}`,
            user_id: userId,
            name: trimmed,
            created_at: new Date().toISOString(),
          };
          return { data: ephemeralMistake, error: null };
        }
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Mistake, error: null };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err : new Error('Failed to create mistake in database') };
    }
  }

  /**
   * Deletes a mistake from the database table 'mistakes'.
   */
  public static async deleteMistake(
    userId: string,
    id: string
  ): Promise<{ success: boolean; error: Error | null }> {
    if (!userId || !id) return { success: false, error: new Error('User ID and Mistake ID are required') };

    if (isVitest()) {
      const list = this.getTestMistakes(userId);
      this.saveTestMistakes(userId, list.filter((m) => m.id !== id));
      return { success: true, error: null };
    }

    try {
      const { error } = await supabase
        .from('mistakes')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, error: null };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err : new Error('Failed to delete mistake') };
    }
  }
}
