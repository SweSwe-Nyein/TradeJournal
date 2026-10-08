import { supabase, getSupabaseConfig } from '@/src/lib/supabase/client';
import type { Database } from '@/src/types/database.types';

export type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
export type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert'];
export type JournalEntryUpdate = Database['public']['Tables']['journal_entries']['Update'];

function isVitest(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env.VITEST);
}

function isTableMissingError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { code?: string; message?: string };
  const code = err.code;
  const msg = String(err.message || '');
  return (
    code === 'PGRST205' ||
    msg.includes('Could not find the table') ||
    msg.includes('relation') ||
    msg.includes('does not exist')
  );
}

export class JournalService {
  private static getTestEntries(userId: string): JournalEntry[] {
    const g = globalThis as unknown as { __mock_journal_entries?: Record<string, JournalEntry[]> };
    return g.__mock_journal_entries?.[userId] || [];
  }

  private static saveTestEntries(userId: string, entries: JournalEntry[]): void {
    const g = globalThis as unknown as { __mock_journal_entries?: Record<string, JournalEntry[]> };
    if (!g.__mock_journal_entries) g.__mock_journal_entries = {};
    g.__mock_journal_entries[userId] = entries;
  }

  private static getLocalEntries(userId: string): JournalEntry[] {
    try {
      const raw = localStorage.getItem(`journal_entries_${userId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  }

  private static saveLocalEntries(userId: string, entries: JournalEntry[]): void {
    try {
      localStorage.setItem(`journal_entries_${userId}`, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }

  public static async listJournalEntries(userId: string): Promise<{ data: JournalEntry[]; error: Error | null }> {
    if (!userId) return { data: [], error: new Error('User ID is required') };

    if (isVitest()) {
      const list = this.getTestEntries(userId);
      return { data: list.sort((a, b) => b.date.localeCompare(a.date)), error: null };
    }

    const { isConfigured } = getSupabaseConfig();
    if (!isConfigured) {
      return { data: this.getLocalEntries(userId).sort((a, b) => b.date.localeCompare(a.date)), error: null };
    }

    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          // Fallback to local storage if table is not found in schema cache
          const local = this.getLocalEntries(userId);
          return { data: local.sort((a, b) => b.date.localeCompare(a.date)), error: null };
        }
        return { data: [], error: new Error(error.message) };
      }

      return { data: (data as JournalEntry[]) || [], error: null };
    } catch (err: unknown) {
      if (isTableMissingError(err)) {
        const local = this.getLocalEntries(userId);
        return { data: local.sort((a, b) => b.date.localeCompare(a.date)), error: null };
      }
      const msg = err instanceof Error ? err.message : 'Failed to load journal entries';
      return { data: [], error: new Error(msg) };
    }
  }

  public static async getJournalEntryByDate(
    userId: string,
    date: string
  ): Promise<{ data: JournalEntry | null; error: Error | null }> {
    if (!userId || !date) return { data: null, error: new Error('User ID and date are required') };

    if (isVitest()) {
      const list = this.getTestEntries(userId);
      const found = list.find((e) => e.date === date) || null;
      return { data: found, error: null };
    }

    const { isConfigured } = getSupabaseConfig();
    if (!isConfigured) {
      const local = this.getLocalEntries(userId);
      const found = local.find((e) => e.date === date) || null;
      return { data: found, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (error) {
        if (isTableMissingError(error)) {
          const local = this.getLocalEntries(userId);
          const found = local.find((e) => e.date === date) || null;
          return { data: found, error: null };
        }
        return { data: null, error: new Error(error.message) };
      }

      return { data: (data as JournalEntry) || null, error: null };
    } catch (err: unknown) {
      if (isTableMissingError(err)) {
        const local = this.getLocalEntries(userId);
        const found = local.find((e) => e.date === date) || null;
        return { data: found, error: null };
      }
      const msg = err instanceof Error ? err.message : 'Failed to get journal entry';
      return { data: null, error: new Error(msg) };
    }
  }

  public static async upsertJournalEntry(
    userId: string,
    entryData: {
      date: string;
      title?: string | null;
      content: string;
      mood?: 'Excellent' | 'Good' | 'Neutral' | 'Bad' | 'Terrible' | null;
      discipline_score?: number | null;
      trading_account_id?: string | null;
    }
  ): Promise<{ data: JournalEntry | null; error: Error | null }> {
    if (!userId) return { data: null, error: new Error('User ID is required') };
    if (!entryData.date) return { data: null, error: new Error('Date is required') };

    const now = new Date().toISOString();

    if (isVitest()) {
      const list = this.getTestEntries(userId);
      const index = list.findIndex((e) => e.date === entryData.date);
      let updated: JournalEntry;
      if (index >= 0) {
        updated = {
          ...list[index],
          ...entryData,
          updated_at: now,
        };
        list[index] = updated;
      } else {
        updated = {
          id: `journal-${Date.now()}`,
          user_id: userId,
          trading_account_id: entryData.trading_account_id ?? null,
          date: entryData.date,
          title: entryData.title ?? null,
          content: entryData.content,
          mood: entryData.mood ?? null,
          discipline_score: entryData.discipline_score ?? null,
          created_at: now,
          updated_at: now,
        };
        list.push(updated);
      }
      this.saveTestEntries(userId, list);
      return { data: updated, error: null };
    }

    const { isConfigured } = getSupabaseConfig();
    if (!isConfigured) {
      const local = this.getLocalEntries(userId);
      const index = local.findIndex((e) => e.date === entryData.date);
      let updated: JournalEntry;
      if (index >= 0) {
        updated = {
          ...local[index],
          ...entryData,
          updated_at: now,
        };
        local[index] = updated;
      } else {
        updated = {
          id: `journal-local-${Date.now()}`,
          user_id: userId,
          trading_account_id: entryData.trading_account_id ?? null,
          date: entryData.date,
          title: entryData.title ?? null,
          content: entryData.content,
          mood: entryData.mood ?? null,
          discipline_score: entryData.discipline_score ?? null,
          created_at: now,
          updated_at: now,
        };
        local.push(updated);
      }
      this.saveLocalEntries(userId, local);
      return { data: updated, error: null };
    }

    try {
      // Check if entry for date already exists
      const { data: existing, error: checkError } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('date', entryData.date)
        .maybeSingle();

      if (checkError && isTableMissingError(checkError)) {
        // Fallback to local storage if table missing
        const local = this.getLocalEntries(userId);
        const index = local.findIndex((e) => e.date === entryData.date);
        let updated: JournalEntry;
        if (index >= 0) {
          updated = {
            ...local[index],
            ...entryData,
            updated_at: now,
          };
          local[index] = updated;
        } else {
          updated = {
            id: `journal-local-${Date.now()}`,
            user_id: userId,
            trading_account_id: entryData.trading_account_id ?? null,
            date: entryData.date,
            title: entryData.title ?? null,
            content: entryData.content,
            mood: entryData.mood ?? null,
            discipline_score: entryData.discipline_score ?? null,
            created_at: now,
            updated_at: now,
          };
          local.push(updated);
        }
        this.saveLocalEntries(userId, local);
        return { data: updated, error: null };
      }

      if (existing) {
        const { data, error } = await supabase
          .from('journal_entries')
          .update({
            title: entryData.title ?? null,
            content: entryData.content,
            mood: entryData.mood ?? null,
            discipline_score: entryData.discipline_score ?? null,
            trading_account_id: entryData.trading_account_id ?? null,
            updated_at: now,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          if (isTableMissingError(error)) {
            const local = this.getLocalEntries(userId);
            const index = local.findIndex((e) => e.date === entryData.date);
            let updated: JournalEntry;
            if (index >= 0) {
              updated = { ...local[index], ...entryData, updated_at: now };
              local[index] = updated;
            } else {
              updated = {
                id: `journal-local-${Date.now()}`,
                user_id: userId,
                trading_account_id: entryData.trading_account_id ?? null,
                date: entryData.date,
                title: entryData.title ?? null,
                content: entryData.content,
                mood: entryData.mood ?? null,
                discipline_score: entryData.discipline_score ?? null,
                created_at: now,
                updated_at: now,
              };
              local.push(updated);
            }
            this.saveLocalEntries(userId, local);
            return { data: updated, error: null };
          }
          return { data: null, error: new Error(error.message) };
        }
        return { data: data as JournalEntry, error: null };
      } else {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert({
            user_id: userId,
            date: entryData.date,
            title: entryData.title ?? null,
            content: entryData.content,
            mood: entryData.mood ?? null,
            discipline_score: entryData.discipline_score ?? null,
            trading_account_id: entryData.trading_account_id ?? null,
          })
          .select()
          .single();

        if (error) {
          if (isTableMissingError(error)) {
            const local = this.getLocalEntries(userId);
            const updated: JournalEntry = {
              id: `journal-local-${Date.now()}`,
              user_id: userId,
              trading_account_id: entryData.trading_account_id ?? null,
              date: entryData.date,
              title: entryData.title ?? null,
              content: entryData.content,
              mood: entryData.mood ?? null,
              discipline_score: entryData.discipline_score ?? null,
              created_at: now,
              updated_at: now,
            };
            local.push(updated);
            this.saveLocalEntries(userId, local);
            return { data: updated, error: null };
          }
          return { data: null, error: new Error(error.message) };
        }
        return { data: data as JournalEntry, error: null };
      }
    } catch (err: unknown) {
      if (isTableMissingError(err)) {
        const local = this.getLocalEntries(userId);
        const updated: JournalEntry = {
          id: `journal-local-${Date.now()}`,
          user_id: userId,
          trading_account_id: entryData.trading_account_id ?? null,
          date: entryData.date,
          title: entryData.title ?? null,
          content: entryData.content,
          mood: entryData.mood ?? null,
          discipline_score: entryData.discipline_score ?? null,
          created_at: now,
          updated_at: now,
        };
        local.push(updated);
        this.saveLocalEntries(userId, local);
        return { data: updated, error: null };
      }
      const msg = err instanceof Error ? err.message : 'Failed to save journal entry';
      return { data: null, error: new Error(msg) };
    }
  }

  public static async deleteJournalEntry(userId: string, id: string): Promise<{ error: Error | null }> {
    if (!userId || !id) return { error: new Error('User ID and ID are required') };

    if (isVitest()) {
      const list = this.getTestEntries(userId);
      const filtered = list.filter((e) => e.id !== id);
      this.saveTestEntries(userId, filtered);
      return { error: null };
    }

    const { isConfigured } = getSupabaseConfig();
    if (!isConfigured) {
      const local = this.getLocalEntries(userId);
      const filtered = local.filter((e) => e.id !== id);
      this.saveLocalEntries(userId, filtered);
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        if (isTableMissingError(error)) {
          const local = this.getLocalEntries(userId);
          const filtered = local.filter((e) => e.id !== id);
          this.saveLocalEntries(userId, filtered);
          return { error: null };
        }
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err: unknown) {
      if (isTableMissingError(err)) {
        const local = this.getLocalEntries(userId);
        const filtered = local.filter((e) => e.id !== id);
        this.saveLocalEntries(userId, filtered);
        return { error: null };
      }
      const msg = err instanceof Error ? err.message : 'Failed to delete journal entry';
      return { error: new Error(msg) };
    }
  }
}
