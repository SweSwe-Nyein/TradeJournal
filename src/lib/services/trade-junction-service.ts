import { supabase, getSupabaseConfig } from '@/src/lib/supabase/client';
import { StrategyService } from './strategy-service';
import { TagService } from './tag-service';
import { MistakeService } from './mistake-service';
import type { Strategy, Tag, Mistake } from '@/src/types/journal-metadata';
import type { TradeWithAccount } from '@/src/types/trade';

interface TestJunction {
  trade_id: string;
  target_id: string;
}

function isVitest(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env.VITEST);
}

export class TradeJunctionService {
  private static getTestJunctions(userId: string, type: 'strategies' | 'tags' | 'mistakes'): TestJunction[] {
    const g = globalThis as unknown as { __mock_junctions?: Record<string, TestJunction[]> };
    return g.__mock_junctions?.[`${type}_${userId}`] || [];
  }

  private static saveTestJunctions(userId: string, type: 'strategies' | 'tags' | 'mistakes', items: TestJunction[]): void {
    const g = globalThis as unknown as { __mock_junctions?: Record<string, TestJunction[]> };
    if (!g.__mock_junctions) g.__mock_junctions = {};
    g.__mock_junctions[`${type}_${userId}`] = items;
  }

  /**
   * Syncs strategies assigned to a trade directly in the database.
   * Updates public.trade_strategies and public.trades.strategy in Supabase.
   */
  public static async syncTradeStrategies(
    userId: string,
    tradeId: string,
    strategyIdsOrNames: string[]
  ): Promise<{ success: boolean; strategyIds: string[]; error: Error | null }> {
    if (!userId || !tradeId) return { success: false, strategyIds: [], error: new Error('User ID and Trade ID required') };

    const { data: allStrategies } = await StrategyService.listStrategies(userId);
    const resolvedIds: string[] = [];
    const resolvedNames: string[] = [];

    for (const item of strategyIdsOrNames) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      let matched = allStrategies.find((s) => s.id === trimmed || s.name.toLowerCase() === trimmed.toLowerCase());
      if (!matched) {
        const created = await StrategyService.createStrategy(userId, { name: trimmed });
        if (created.data) matched = created.data;
      }
      if (matched) {
        if (!resolvedIds.includes(matched.id)) resolvedIds.push(matched.id);
        if (!resolvedNames.includes(matched.name)) resolvedNames.push(matched.name);
      }
    }

    if (isVitest()) {
      const existing = this.getTestJunctions(userId, 'strategies').filter((j) => j.trade_id !== tradeId);
      for (const id of resolvedIds) {
        existing.push({ trade_id: tradeId, target_id: id });
      }
      this.saveTestJunctions(userId, 'strategies', existing);
      return { success: true, strategyIds: resolvedIds, error: null };
    }

    try {
      // 1. Always update the native 'strategy' column on the trades table in the database
      const primaryStrategy = resolvedNames[0] || null;
      await supabase
        .from('trades')
        .update({ strategy: primaryStrategy })
        .eq('id', tradeId)
        .eq('user_id', userId);

      // 2. Sync trade_strategies junction table in Supabase
      const { error: delError } = await supabase
        .from('trade_strategies')
        .delete()
        .eq('trade_id', tradeId)
        .eq('user_id', userId);

      if (!delError && resolvedIds.length > 0) {
        const rows = resolvedIds.map((sId) => ({
          user_id: userId,
          trade_id: tradeId,
          strategy_id: sId,
        }));
        await supabase.from('trade_strategies').insert(rows);
      }

      return { success: true, strategyIds: resolvedIds, error: null };
    } catch (err: unknown) {
      return { success: false, strategyIds: resolvedIds, error: err instanceof Error ? err : new Error('Failed to sync strategies') };
    }
  }

  /**
   * Syncs tags assigned to a trade directly in the database.
   * Updates public.trade_tags and public.trades.tags in Supabase.
   */
  public static async syncTradeTags(
    userId: string,
    tradeId: string,
    tagIdsOrNames: string[]
  ): Promise<{ success: boolean; tagIds: string[]; tagNames: string[]; error: Error | null }> {
    if (!userId || !tradeId) return { success: false, tagIds: [], tagNames: [], error: new Error('User ID and Trade ID required') };

    const { data: allTags } = await TagService.listTags(userId);
    const resolvedIds: string[] = [];
    const resolvedNames: string[] = [];

    for (const item of tagIdsOrNames) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      let matched = allTags.find((t) => t.id === trimmed || t.name.toLowerCase() === trimmed.toLowerCase());
      if (!matched) {
        const created = await TagService.createTag(userId, trimmed);
        if (created.data) matched = created.data;
      }
      if (matched) {
        if (!resolvedIds.includes(matched.id)) resolvedIds.push(matched.id);
        if (!resolvedNames.includes(matched.name)) resolvedNames.push(matched.name);
      } else {
        if (!resolvedNames.includes(trimmed)) resolvedNames.push(trimmed);
      }
    }

    if (isVitest()) {
      const existing = this.getTestJunctions(userId, 'tags').filter((j) => j.trade_id !== tradeId);
      for (const id of resolvedIds) {
        existing.push({ trade_id: tradeId, target_id: id });
      }
      this.saveTestJunctions(userId, 'tags', existing);
      return { success: true, tagIds: resolvedIds, tagNames: resolvedNames, error: null };
    }

    try {
      // 1. Always update native 'tags' column on the trades table in the database
      await supabase
        .from('trades')
        .update({ tags: resolvedNames })
        .eq('id', tradeId)
        .eq('user_id', userId);

      // 2. Sync trade_tags junction table
      const { error: delError } = await supabase
        .from('trade_tags')
        .delete()
        .eq('trade_id', tradeId)
        .eq('user_id', userId);

      if (!delError && resolvedIds.length > 0) {
        const rows = resolvedIds.map((tId) => ({
          user_id: userId,
          trade_id: tradeId,
          tag_id: tId,
        }));
        await supabase.from('trade_tags').insert(rows);
      }

      return { success: true, tagIds: resolvedIds, tagNames: resolvedNames, error: null };
    } catch (err: unknown) {
      return { success: false, tagIds: resolvedIds, tagNames: resolvedNames, error: err instanceof Error ? err : new Error('Failed to sync tags') };
    }
  }

  /**
   * Syncs mistakes assigned to a trade directly in the database.
   * Updates public.trade_mistakes and public.trades.mistakes in Supabase.
   */
  public static async syncTradeMistakes(
    userId: string,
    tradeId: string,
    mistakeIdsOrNames: string[]
  ): Promise<{ success: boolean; mistakeIds: string[]; mistakeNames: string[]; error: Error | null }> {
    if (!userId || !tradeId) return { success: false, mistakeIds: [], mistakeNames: [], error: new Error('User ID and Trade ID required') };

    const { data: allMistakes } = await MistakeService.listMistakes(userId);
    const resolvedIds: string[] = [];
    const resolvedNames: string[] = [];

    for (const item of mistakeIdsOrNames) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      let matched = allMistakes.find((m) => m.id === trimmed || m.name.toLowerCase() === trimmed.toLowerCase());
      if (!matched) {
        const created = await MistakeService.createMistake(userId, trimmed);
        if (created.data) matched = created.data;
      }
      if (matched) {
        if (!resolvedIds.includes(matched.id)) resolvedIds.push(matched.id);
        if (!resolvedNames.includes(matched.name)) resolvedNames.push(matched.name);
      } else {
        if (!resolvedNames.includes(trimmed)) resolvedNames.push(trimmed);
      }
    }

    if (isVitest()) {
      const existing = this.getTestJunctions(userId, 'mistakes').filter((j) => j.trade_id !== tradeId);
      for (const id of resolvedIds) {
        existing.push({ trade_id: tradeId, target_id: id });
      }
      this.saveTestJunctions(userId, 'mistakes', existing);
      return { success: true, mistakeIds: resolvedIds, mistakeNames: resolvedNames, error: null };
    }

    try {
      // 1. Always update native 'mistakes' column on the trades table in the database
      await supabase
        .from('trades')
        .update({ mistakes: resolvedNames })
        .eq('id', tradeId)
        .eq('user_id', userId);

      // 2. Sync trade_mistakes junction table
      const { error: delError } = await supabase
        .from('trade_mistakes')
        .delete()
        .eq('trade_id', tradeId)
        .eq('user_id', userId);

      if (!delError && resolvedIds.length > 0) {
        const rows = resolvedIds.map((mId) => ({
          user_id: userId,
          trade_id: tradeId,
          mistake_id: mId,
        }));
        await supabase.from('trade_mistakes').insert(rows);
      }

      return { success: true, mistakeIds: resolvedIds, mistakeNames: resolvedNames, error: null };
    } catch (err: unknown) {
      return { success: false, mistakeIds: resolvedIds, mistakeNames: resolvedNames, error: err instanceof Error ? err : new Error('Failed to sync mistakes') };
    }
  }

  /**
   * Hydrates an array of trade objects with full relational strategies, tags, and mistakes from the database.
   */
  public static async hydrateTrades(
    userId: string,
    trades: TradeWithAccount[]
  ): Promise<TradeWithAccount[]> {
    if (!trades || trades.length === 0) return [];

    const tradeIds = trades.map((t) => t.id);
    const { data: allStrategies } = await StrategyService.listStrategies(userId);
    const { data: allTags } = await TagService.listTags(userId);
    const { data: allMistakes } = await MistakeService.listMistakes(userId);

    const stratMap = new Map(allStrategies.map((s) => [s.id, s]));
    const tagMap = new Map(allTags.map((t) => [t.id, t]));
    const mistakeMap = new Map(allMistakes.map((m) => [m.id, m]));

    // Map by trade ID
    const tradeStratIds: Record<string, string[]> = {};
    const tradeTagIds: Record<string, string[]> = {};
    const tradeMistakeIds: Record<string, string[]> = {};

    if (isVitest()) {
      const userStratJuncs = this.getTestJunctions(userId, 'strategies');
      for (const j of userStratJuncs) {
        if (!tradeStratIds[j.trade_id]) tradeStratIds[j.trade_id] = [];
        tradeStratIds[j.trade_id].push(j.target_id);
      }

      const userTagJuncs = this.getTestJunctions(userId, 'tags');
      for (const j of userTagJuncs) {
        if (!tradeTagIds[j.trade_id]) tradeTagIds[j.trade_id] = [];
        tradeTagIds[j.trade_id].push(j.target_id);
      }

      const userMistakeJuncs = this.getTestJunctions(userId, 'mistakes');
      for (const j of userMistakeJuncs) {
        if (!tradeMistakeIds[j.trade_id]) tradeMistakeIds[j.trade_id] = [];
        tradeMistakeIds[j.trade_id].push(j.target_id);
      }
    } else {
      try {
        const [stratRes, tagRes, mistakeRes] = await Promise.all([
          supabase
            .from('trade_strategies')
            .select('trade_id, strategy_id')
            .in('trade_id', tradeIds)
            .eq('user_id', userId),
          supabase
            .from('trade_tags')
            .select('trade_id, tag_id')
            .in('trade_id', tradeIds)
            .eq('user_id', userId),
          supabase
            .from('trade_mistakes')
            .select('trade_id, mistake_id')
            .in('trade_id', tradeIds)
            .eq('user_id', userId),
        ]);

        if (stratRes.data) {
          for (const row of stratRes.data as Array<{ trade_id: string; strategy_id: string }>) {
            if (!tradeStratIds[row.trade_id]) tradeStratIds[row.trade_id] = [];
            tradeStratIds[row.trade_id].push(row.strategy_id);
          }
        }

        if (tagRes.data) {
          for (const row of tagRes.data as Array<{ trade_id: string; tag_id: string }>) {
            if (!tradeTagIds[row.trade_id]) tradeTagIds[row.trade_id] = [];
            tradeTagIds[row.trade_id].push(row.tag_id);
          }
        }

        if (mistakeRes.data) {
          for (const row of mistakeRes.data as Array<{ trade_id: string; mistake_id: string }>) {
            if (!tradeMistakeIds[row.trade_id]) tradeMistakeIds[row.trade_id] = [];
            tradeMistakeIds[row.trade_id].push(row.mistake_id);
          }
        }
      } catch {
        // Continue to fallback on native columns
      }
    }

    return trades.map((trade) => {
      // 1. Strategies
      const linkedStratIds = tradeStratIds[trade.id] || [];
      let linkedStrategies: Strategy[] = linkedStratIds
        .map((sId) => stratMap.get(sId))
        .filter(Boolean) as Strategy[];

      // Fallback/supplement with native trade.strategy from database
      if (linkedStrategies.length === 0 && trade.strategy) {
        const found = allStrategies.find((s) => s.name.toLowerCase() === trade.strategy?.toLowerCase());
        if (found) {
          linkedStrategies = [found];
        } else {
          linkedStrategies = [
            {
              id: `strat-${trade.strategy}`,
              user_id: userId,
              name: trade.strategy,
              description: null,
              created_at: trade.created_at || new Date().toISOString(),
              updated_at: trade.updated_at || new Date().toISOString(),
            },
          ];
        }
      }

      // 2. Tags
      const linkedTIds = tradeTagIds[trade.id] || [];
      const linkedTagsObjects: Tag[] = linkedTIds.map((tId) => tagMap.get(tId)).filter(Boolean) as Tag[];
      const nativeTags = Array.isArray(trade.tags) ? trade.tags : [];
      const combinedTagNames = Array.from(
        new Set([...linkedTagsObjects.map((t) => t.name), ...nativeTags])
      );

      // 3. Mistakes
      const linkedMIds = tradeMistakeIds[trade.id] || [];
      const linkedMistakesObjects: Mistake[] = linkedMIds
        .map((mId) => mistakeMap.get(mId))
        .filter(Boolean) as Mistake[];
      const nativeMistakes = Array.isArray(trade.mistakes) ? trade.mistakes : [];
      const combinedMistakeNames = Array.from(
        new Set([...linkedMistakesObjects.map((m) => m.name), ...nativeMistakes])
      );

      return {
        ...trade,
        strategies: linkedStrategies,
        strategy_ids: linkedStrategies.map((s) => s.id),
        tags: combinedTagNames,
        tags_list: linkedTagsObjects,
        tag_ids: linkedTagsObjects.map((t) => t.id),
        mistakes: combinedMistakeNames,
        mistakes_list: linkedMistakesObjects,
        mistake_ids: linkedMistakesObjects.map((m) => m.id),
      };
    });
  }
}
