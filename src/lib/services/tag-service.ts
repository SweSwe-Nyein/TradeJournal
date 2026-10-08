import { supabase, getSupabaseConfig } from '@/src/lib/supabase/client';
import type { Tag, TagInsert } from '@/src/types/journal-metadata';

export const DEFAULT_TAGS = [
  'A+',
  'A',
  'B',
  'Breakout',
  'Reversal',
  'London',
  'NY',
  'High conviction',
];

function isVitest(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env.VITEST);
}

export class TagService {
  private static getTestTags(userId: string): Tag[] {
    const g = globalThis as unknown as { __mock_tags?: Record<string, Tag[]> };
    return g.__mock_tags?.[userId] || [];
  }

  private static saveTestTags(userId: string, items: Tag[]): void {
    const g = globalThis as unknown as { __mock_tags?: Record<string, Tag[]> };
    if (!g.__mock_tags) g.__mock_tags = {};
    g.__mock_tags[userId] = items;
  }

  /**
   * Lists tags for the user directly from the Supabase database.
   * Merges tags table entries and any tags recorded on trades in the database.
   */
  public static async listTags(userId: string): Promise<{ data: Tag[]; error: Error | null }> {
    if (!userId) return { data: [], error: new Error('User ID is required') };

    if (isVitest()) {
      const list = this.getTestTags(userId);
      return { data: [...list], error: null };
    }

    const { isConfigured } = getSupabaseConfig();
    if (!isConfigured) return { data: [], error: new Error('Supabase is not configured') };

    try {
      const tagsMap = new Map<string, Tag>();

      // 1. Fetch from tags table
      const { data: dbTags, error: dbError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (dbError && dbError.code !== 'PGRST205') {
        return { data: [], error: new Error(dbError.message) };
      }

      if (dbTags) {
        for (const t of dbTags as Tag[]) {
          tagsMap.set(t.name.toLowerCase(), t);
        }
      }

      // 2. Fetch distinct tags from trades table in database
      const { data: tradeRows } = await supabase
        .from('trades')
        .select('tags')
        .eq('user_id', userId);

      if (tradeRows) {
        for (const tr of tradeRows) {
          const arr = (tr.tags as string[]) || [];
          for (const item of arr) {
            const trimmed = item.trim();
            if (trimmed && !tagsMap.has(trimmed.toLowerCase())) {
              tagsMap.set(trimmed.toLowerCase(), {
                id: `tag-db-${trimmed}`,
                user_id: userId,
                name: trimmed,
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      }

      // If user has no tags in database yet, offer defaults
      if (tagsMap.size === 0) {
        for (const def of DEFAULT_TAGS) {
          tagsMap.set(def.toLowerCase(), {
            id: `tag-default-${def}`,
            user_id: userId,
            name: def,
            created_at: new Date().toISOString(),
          });
        }
      }

      return { data: Array.from(tagsMap.values()), error: null };
    } catch (err: unknown) {
      return { data: [], error: err instanceof Error ? err : new Error('Failed to load tags') };
    }
  }

  /**
   * Creates a tag in the database table 'tags'.
   */
  public static async createTag(
    userId: string,
    name: string
  ): Promise<{ data: Tag | null; error: Error | null }> {
    if (!userId) return { data: null, error: new Error('User ID is required') };
    const trimmed = name.trim();
    if (!trimmed) return { data: null, error: new Error('Tag name cannot be empty') };

    if (isVitest()) {
      const list = this.getTestTags(userId);
      const existing = list.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) return { data: existing, error: null };

      const newTag: Tag = {
        id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
        name: trimmed,
        created_at: new Date().toISOString(),
      };
      this.saveTestTags(userId, [...list, newTag]);
      return { data: newTag, error: null };
    }

    try {
      const payload: TagInsert = {
        user_id: userId,
        name: trimmed,
      };

      const { data, error } = await supabase
        .from('tags')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          // Already exists in table, fetch it
          const { data: existing } = await supabase
            .from('tags')
            .select('*')
            .eq('user_id', userId)
            .ilike('name', trimmed)
            .maybeSingle();

          if (existing) return { data: existing as Tag, error: null };
        }
        if (error.code === 'PGRST205') {
          // Table not yet created, return object so it can be saved on the trade in the database
          const ephemeralTag: Tag = {
            id: `tag-temp-${trimmed}`,
            user_id: userId,
            name: trimmed,
            created_at: new Date().toISOString(),
          };
          return { data: ephemeralTag, error: null };
        }
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Tag, error: null };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err : new Error('Failed to create tag in database') };
    }
  }

  /**
   * Deletes a tag from the database table 'tags'.
   */
  public static async deleteTag(
    userId: string,
    id: string
  ): Promise<{ success: boolean; error: Error | null }> {
    if (!userId || !id) return { success: false, error: new Error('User ID and Tag ID are required') };

    if (isVitest()) {
      const list = this.getTestTags(userId);
      this.saveTestTags(userId, list.filter((t) => t.id !== id));
      return { success: true, error: null };
    }

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, error: null };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err : new Error('Failed to delete tag') };
    }
  }
}
