import { supabase, getSupabaseConfig } from '@/src/lib/supabase/client';
import type { Strategy, StrategyInsert, StrategyUpdate } from '@/src/types/journal-metadata';

export const DEFAULT_STRATEGIES: Array<{ name: string; description: string }> = [
  {
    name: 'Opening Range Breakout (ORB)',
    description: 'High-momentum opening drive break of the first 5 or 15-minute range with heavy volume.',
  },
  {
    name: 'VWAP Mean Reversion',
    description: 'Fading extreme deviations from volume-weighted average price back into value.',
  },
  {
    name: 'Break & Retest',
    description: 'Entering on confirmed retest and rejection of a broken horizontal key support or resistance level.',
  },
  {
    name: 'Supply & Demand Bounce',
    description: 'Reaction and order block rejection from higher timeframe institutional supply/demand zones.',
  },
];

function isVitest(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env.VITEST);
}

export class StrategyService {
  private static getTestStrategies(userId: string): Strategy[] {
    const g = globalThis as unknown as { __mock_strategies?: Record<string, Strategy[]> };
    return g.__mock_strategies?.[userId] || [];
  }

  private static saveTestStrategies(userId: string, items: Strategy[]): void {
    const g = globalThis as unknown as { __mock_strategies?: Record<string, Strategy[]> };
    if (!g.__mock_strategies) g.__mock_strategies = {};
    g.__mock_strategies[userId] = items;
  }

  /**
   * Retrieves all strategies for the authenticated user from the Supabase database.
   * If any strategies were previously recorded on trades in the database, they are also merged.
   */
  public static async listStrategies(userId: string): Promise<{ data: Strategy[]; error: Error | null }> {
    if (!userId) return { data: [], error: new Error('User ID is required') };

    if (isVitest()) {
      const list = this.getTestStrategies(userId);
      return { data: [...list], error: null };
    }

    const { isConfigured } = getSupabaseConfig();
    if (!isConfigured) {
      return { data: [], error: new Error('Supabase is not configured') };
    }

    try {
      // 1. Fetch from strategies table
      const { data: dbData, error: dbError } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (dbError) {
        // If table doesn't exist yet, query distinct strategy names from the trades table in the database
        if (dbError.code === 'PGRST205') {
          const { data: tradeRows } = await supabase
            .from('trades')
            .select('strategy')
            .eq('user_id', userId)
            .not('strategy', 'is', null);

          const uniqueNames = Array.from(
            new Set((tradeRows || []).map((t) => t.strategy).filter(Boolean) as string[])
          );

          const inferred: Strategy[] = uniqueNames.map((name, i) => ({
            id: `strat-inferred-${i}-${name}`,
            user_id: userId,
            name,
            description: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          return { data: inferred, error: null };
        }
        return { data: [], error: new Error(dbError.message) };
      }

      const strategies = (dbData as Strategy[]) || [];

      // 2. Also check if any trades in database have strategy names not yet in strategies table
      const { data: tradeRows } = await supabase
        .from('trades')
        .select('strategy')
        .eq('user_id', userId)
        .not('strategy', 'is', null);

      if (tradeRows && tradeRows.length > 0) {
        const existingNames = new Set(strategies.map((s) => s.name.toLowerCase()));
        const tradeNames = Array.from(
          new Set((tradeRows || []).map((t) => t.strategy).filter(Boolean) as string[])
        );

        for (const tName of tradeNames) {
          if (!existingNames.has(tName.toLowerCase())) {
            strategies.push({
              id: `strat-trade-${tName}`,
              user_id: userId,
              name: tName,
              description: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            existingNames.add(tName.toLowerCase());
          }
        }
      }

      return { data: strategies, error: null };
    } catch (err: unknown) {
      return { data: [], error: err instanceof Error ? err : new Error('Failed to load strategies') };
    }
  }

  /**
   * Retrieves a single strategy by ID from the database.
   */
  public static async getStrategy(userId: string, id: string): Promise<{ data: Strategy | null; error: Error | null }> {
    if (!userId || !id) return { data: null, error: new Error('User ID and Strategy ID are required') };

    if (isVitest()) {
      const list = this.getTestStrategies(userId);
      const found = list.find((s) => s.id === id && s.user_id === userId) || null;
      return { data: found, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Strategy, error: null };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err : new Error('Failed to fetch strategy') };
    }
  }

  /**
   * Creates a new strategy in the database table 'strategies'.
   */
  public static async createStrategy(
    userId: string,
    payload: { name: string; description?: string | null }
  ): Promise<{ data: Strategy | null; error: Error | null }> {
    if (!userId) return { data: null, error: new Error('User ID is required') };
    const trimmedName = payload.name.trim();
    if (!trimmedName) return { data: null, error: new Error('Strategy name cannot be empty') };

    if (isVitest()) {
      const list = this.getTestStrategies(userId);
      if (list.some((s) => s.name.toLowerCase() === trimmedName.toLowerCase())) {
        return { data: null, error: new Error(`Strategy "${trimmedName}" already exists`) };
      }
      const newStrat: Strategy = {
        id: `strat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
        name: trimmedName,
        description: payload.description?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.saveTestStrategies(userId, [...list, newStrat]);
      return { data: newStrat, error: null };
    }

    try {
      const insertPayload: StrategyInsert = {
        user_id: userId,
        name: trimmedName,
        description: payload.description?.trim() || null,
      };

      const { data, error } = await supabase
        .from('strategies')
        .insert(insertPayload)
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST205') {
          return {
            data: null,
            error: new Error(
              "Table 'strategies' does not exist in the database yet. Please click 'Initialize Database' in the top banner to run the migration script in your Supabase SQL Editor."
            ),
          };
        }
        if (error.code === '23505') {
          return { data: null, error: new Error(`Strategy "${trimmedName}" already exists`) };
        }
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Strategy, error: null };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err : new Error('Failed to create strategy in database') };
    }
  }

  /**
   * Updates an existing strategy in the database table 'strategies'.
   */
  public static async updateStrategy(
    userId: string,
    id: string,
    payload: { name?: string; description?: string | null }
  ): Promise<{ data: Strategy | null; error: Error | null }> {
    if (!userId || !id) return { data: null, error: new Error('User ID and Strategy ID are required') };

    if (isVitest()) {
      const list = this.getTestStrategies(userId);
      const index = list.findIndex((s) => s.id === id && s.user_id === userId);
      if (index === -1) return { data: null, error: new Error('Strategy not found') };
      const current = list[index];
      const updated: Strategy = {
        ...current,
        name: payload.name !== undefined ? payload.name.trim() : current.name,
        description: payload.description !== undefined ? payload.description?.trim() || null : current.description,
        updated_at: new Date().toISOString(),
      };
      const copy = [...list];
      copy[index] = updated;
      this.saveTestStrategies(userId, copy);
      return { data: updated, error: null };
    }

    try {
      const updatePayload: StrategyUpdate = {
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
      };

      const { data, error } = await supabase
        .from('strategies')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // If strategy name changed, sync trades table in database as well
      if (payload.name) {
        const { data: current } = await supabase.from('strategies').select('name').eq('id', id).single();
        if (current?.name && current.name !== payload.name.trim()) {
          await supabase
            .from('trades')
            .update({ strategy: payload.name.trim() })
            .eq('user_id', userId)
            .eq('strategy', current.name);
        }
      }

      return { data: data as Strategy, error: null };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err : new Error('Failed to update strategy in database') };
    }
  }

  /**
   * Deletes a strategy from the database table 'strategies'.
   */
  public static async deleteStrategy(userId: string, id: string): Promise<{ success: boolean; error: Error | null }> {
    if (!userId || !id) return { success: false, error: new Error('User ID and Strategy ID are required') };

    if (isVitest()) {
      const list = this.getTestStrategies(userId);
      this.saveTestStrategies(userId, list.filter((s) => s.id !== id));
      return { success: true, error: null };
    }

    try {
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, error: null };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err : new Error('Failed to delete strategy from database') };
    }
  }

  /**
   * Seeds default strategies into the database for the user.
   */
  public static async seedDefaultStrategies(userId: string): Promise<{ data: Strategy[]; error: Error | null }> {
    if (!userId) return { data: [], error: new Error('User ID is required') };

    const created: Strategy[] = [];
    for (const def of DEFAULT_STRATEGIES) {
      const res = await this.createStrategy(userId, def);
      if (res.data) created.push(res.data);
    }
    return { data: created, error: null };
  }
}
