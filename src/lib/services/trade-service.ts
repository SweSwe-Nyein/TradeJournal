import { supabase, getSupabaseConfig } from '@/src/lib/supabase/client';
import { calculateTradeMetrics } from '@/src/lib/calculations/trades';
import { TradeJunctionService } from './trade-junction-service';
import { ScreenshotService } from './screenshot-service';
import type {
  Trade,
  TradeWithAccount,
  TradeInsert,
  TradeUpdate,
  TradeFilters,
  TradeCalculationResults,
} from '@/src/types/trade';

function isVitest(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env.VITEST);
}

/**
 * Trade service / repository layer encapsulating all trade data access operations.
 * Strictly executes direct database operations in Supabase, enforcing RLS and persistence.
 */
export class TradeService {
  private static getTestTrades(userId: string): TradeWithAccount[] {
    const g = globalThis as unknown as { __mock_trades?: Record<string, TradeWithAccount[]> };
    return g.__mock_trades?.[userId] || [];
  }

  private static saveTestTrades(userId: string, trades: TradeWithAccount[]): void {
    const g = globalThis as unknown as { __mock_trades?: Record<string, TradeWithAccount[]> };
    if (!g.__mock_trades) g.__mock_trades = {};
    g.__mock_trades[userId] = trades;
  }

  private static async syncTradeRelations(
    userId: string,
    tradeId: string,
    tradeData: Record<string, unknown>
  ): Promise<void> {
    try {
      const stratInputs =
        (tradeData.strategy_ids as string[]) ||
        (tradeData.strategies as string[]) ||
        (tradeData.strategy ? [tradeData.strategy as string] : []);
      const tagInputs =
        (tradeData.tag_ids as string[]) ||
        (tradeData.tags as string[]) ||
        [];
      const mistakeInputs =
        (tradeData.mistake_ids as string[]) ||
        (tradeData.mistakes as string[]) ||
        [];

      if (stratInputs && stratInputs.length > 0) {
        await TradeJunctionService.syncTradeStrategies(userId, tradeId, stratInputs);
      }
      if (tagInputs && tagInputs.length > 0) {
        await TradeJunctionService.syncTradeTags(userId, tradeId, tagInputs);
      }
      if (mistakeInputs && mistakeInputs.length > 0) {
        await TradeJunctionService.syncTradeMistakes(userId, tradeId, mistakeInputs);
      }
    } catch {
      // non-fatal relation sync
    }
  }

  /**
   * Create a new trade in the Supabase database.
   * Calculates gross P&L, net P&L, and R-multiple automatically.
   */
  public static async createTrade(
    userId: string,
    tradeData: Omit<
      TradeInsert,
      'id' | 'user_id' | 'gross_pnl' | 'net_pnl' | 'r_multiple' | 'created_at' | 'updated_at'
    >
  ): Promise<{ data: TradeWithAccount | null; error: Error | null }> {
    if (!userId) {
      return { data: null, error: new Error('User ID is required to create a trade') };
    }

    if (!tradeData.trading_account_id) {
      return { data: null, error: new Error('Trading account is required') };
    }

    const metrics = calculateTradeMetrics({
      direction: tradeData.direction,
      entry_price: tradeData.entry_price,
      exit_price: tradeData.exit_price ?? null,
      quantity: tradeData.quantity,
      commission: tradeData.commission ?? 0,
      fees: tradeData.fees ?? 0,
      swap: tradeData.swap ?? 0,
      risk_amount: tradeData.risk_amount ?? null,
    });

    // Resolve strategies, tags, mistakes
    const rawTrade = tradeData as Record<string, unknown>;
    const stratList =
      (rawTrade.strategies as string[]) ||
      (rawTrade.strategy_ids as string[]) ||
      (tradeData.strategy ? [tradeData.strategy] : []);
    const primaryStrategy = tradeData.strategy || stratList[0] || null;

    const tagList =
      (rawTrade.tags as string[]) ||
      (rawTrade.tag_ids as string[]) ||
      [];

    const mistakeList =
      (rawTrade.mistakes as string[]) ||
      (rawTrade.mistake_ids as string[]) ||
      [];

    if (isVitest()) {
      const newTrade: TradeWithAccount = {
        id: `trade-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
        trading_account_id: tradeData.trading_account_id,
        symbol: tradeData.symbol.trim().toUpperCase(),
        direction: tradeData.direction,
        entry_time: tradeData.entry_time,
        exit_time: tradeData.exit_time || null,
        entry_price: tradeData.entry_price,
        exit_price: tradeData.exit_price || null,
        quantity: tradeData.quantity,
        stop_loss: tradeData.stop_loss || null,
        take_profit: tradeData.take_profit || null,
        commission: tradeData.commission ?? 0,
        fees: tradeData.fees ?? 0,
        swap: tradeData.swap ?? 0,
        gross_pnl: metrics.gross_pnl,
        net_pnl: metrics.net_pnl,
        risk_amount: tradeData.risk_amount || null,
        r_multiple: metrics.r_multiple,
        status: tradeData.status || (tradeData.exit_price ? 'closed' : 'open'),
        notes: tradeData.notes || null,
        strategy: primaryStrategy,
        tags: tagList,
        mistakes: mistakeList,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const existing = this.getTestTrades(userId);
      this.saveTestTrades(userId, [newTrade, ...existing]);

      await this.syncTradeRelations(userId, newTrade.id, tradeData as Record<string, unknown>);
      const [hydrated] = await TradeJunctionService.hydrateTrades(userId, [newTrade]);
      return { data: hydrated || newTrade, error: null };
    }

    const { isConfigured } = getSupabaseConfig();
    if (!isConfigured) {
      return { data: null, error: new Error('Supabase is not configured') };
    }

    try {
      const payload = {
        user_id: userId,
        trading_account_id: tradeData.trading_account_id,
        symbol: tradeData.symbol.trim().toUpperCase(),
        direction: tradeData.direction,
        entry_time: tradeData.entry_time,
        exit_time: tradeData.exit_time || null,
        entry_price: tradeData.entry_price,
        exit_price: tradeData.exit_price || null,
        quantity: tradeData.quantity,
        stop_loss: tradeData.stop_loss || null,
        take_profit: tradeData.take_profit || null,
        commission: tradeData.commission ?? 0,
        fees: tradeData.fees ?? 0,
        swap: tradeData.swap ?? 0,
        gross_pnl: metrics.gross_pnl,
        net_pnl: metrics.net_pnl,
        risk_amount: tradeData.risk_amount || null,
        r_multiple: metrics.r_multiple,
        status: tradeData.status || (tradeData.exit_price ? 'closed' : 'open'),
        notes: tradeData.notes || null,
        strategy: primaryStrategy,
        tags: tagList,
        mistakes: mistakeList,
      };

      const { data, error } = await supabase
        .from('trades')
        .insert(payload)
        .select('*, trading_accounts(id, name, account_type, broker_name, currency)')
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      if (!data) {
        return { data: null, error: new Error('Failed to create trade: empty response from database') };
      }

      const raw = data as Record<string, unknown>;
      const createdTrade: TradeWithAccount = {
        ...(raw as unknown as Trade),
        account: (raw.trading_accounts as TradeWithAccount['account']) || null,
      };

      // Sync relations into junction tables and ensure trade is hydrated
      await this.syncTradeRelations(userId, createdTrade.id, tradeData as Record<string, unknown>);
      const [hydrated] = await TradeJunctionService.hydrateTrades(userId, [createdTrade]);
      return { data: hydrated || createdTrade, error: null };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err : new Error('Database error inserting trade') };
    }
  }

  /**
   * Retrieves a single trade with linked trading account details by ID directly from the database.
   */
  public static async getTrade(
    userId: string,
    tradeId: string
  ): Promise<{ data: TradeWithAccount | null; error: Error | null }> {
    if (!userId || !tradeId) {
      return { data: null, error: new Error('User ID and Trade ID are required') };
    }

    if (isVitest()) {
      const list = this.getTestTrades(userId);
      const found = list.find((t) => t.id === tradeId && t.user_id === userId) || null;
      if (found) {
        const [hydrated] = await TradeJunctionService.hydrateTrades(userId, [found]);
        return { data: hydrated || found, error: null };
      }
      return { data: null, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*, trading_accounts(*)')
        .eq('id', tradeId)
        .eq('user_id', userId)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      if (!data) return { data: null, error: null };

      const raw = data as Record<string, unknown>;
      const trade: TradeWithAccount = {
        ...(raw as unknown as Trade),
        account: (raw.trading_accounts as TradeWithAccount['account']) || null,
      };

      const [hydrated] = await TradeJunctionService.hydrateTrades(userId, [trade]);
      return { data: hydrated || trade, error: null };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err : new Error('Failed to retrieve trade') };
    }
  }

  /**
   * Retrieves trades with database filtering, searching, sorting, and pagination.
   */
  public static async getTrades(
    userId: string,
    filters?: TradeFilters
  ): Promise<{ data: TradeWithAccount[]; count: number; error: Error | null }> {
    if (!userId) {
      return { data: [], count: 0, error: new Error('User ID is required') };
    }

    if (isVitest()) {
      let list = this.getTestTrades(userId);
      list = await TradeJunctionService.hydrateTrades(userId, list);

      if (filters?.trading_account_id && filters.trading_account_id !== 'all') {
        list = list.filter((t) => t.trading_account_id === filters.trading_account_id);
      }
      if (filters?.symbol && filters.symbol.trim() !== '') {
        list = list.filter((t) => t.symbol.toUpperCase().includes(filters.symbol!.trim().toUpperCase()));
      }
      if (filters?.direction) {
        list = list.filter((t) => t.direction === filters.direction);
      }
      if (filters?.status) {
        list = list.filter((t) => t.status === filters.status);
      }
      if (filters?.strategy && filters.strategy !== 'all') {
        const sFilter = filters.strategy.toLowerCase();
        list = list.filter((t) =>
          t.strategy?.toLowerCase() === sFilter ||
          t.strategy_ids?.includes(filters.strategy!) ||
          t.strategies?.some((s) => s.id === filters.strategy || s.name.toLowerCase() === sFilter)
        );
      }
      if (filters?.tag && filters.tag !== 'all') {
        const tFilter = filters.tag.toLowerCase();
        list = list.filter((t) =>
          t.tags?.some((tg) => tg.toLowerCase() === tFilter) ||
          t.tag_ids?.includes(filters.tag!) ||
          t.tags_list?.some((tg) => tg.id === filters.tag || tg.name.toLowerCase() === tFilter)
        );
      }
      if (filters?.mistake && filters.mistake !== 'all') {
        const mFilter = filters.mistake.toLowerCase();
        list = list.filter((t) =>
          t.mistakes?.some((m) => m.toLowerCase() === mFilter) ||
          t.mistake_ids?.includes(filters.mistake!) ||
          t.mistakes_list?.some((m) => m.id === filters.mistake || m.name.toLowerCase() === mFilter)
        );
      }
      if (filters?.from_date) {
        const fTime = new Date(filters.from_date).getTime();
        list = list.filter((t) => new Date(t.entry_time).getTime() >= fTime);
      }
      if (filters?.to_date) {
        const tTime = new Date(filters.to_date).getTime();
        list = list.filter((t) => new Date(t.entry_time).getTime() <= tTime);
      }
      if (filters?.pnl_outcome === 'win') {
        list = list.filter((t) => (t.net_pnl || 0) > 0);
      } else if (filters?.pnl_outcome === 'loss') {
        list = list.filter((t) => (t.net_pnl || 0) < 0);
      } else if (filters?.pnl_outcome === 'breakeven') {
        list = list.filter((t) => (t.net_pnl || 0) === 0);
      }
      if (filters?.search_query && filters.search_query.trim() !== '') {
        const q = filters.search_query.toLowerCase();
        list = list.filter(
          (t) => t.symbol.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q))
        );
      }

      // Sort
      const sortBy = filters?.sort_by || 'entry_time';
      const asc = filters?.sort_order === 'asc';
      list.sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';
        if (sortBy === 'entry_time' || sortBy === 'exit_time' || sortBy === 'created_at') {
          valA = new Date(a[sortBy] || 0).getTime();
          valB = new Date(b[sortBy] || 0).getTime();
        } else if (sortBy === 'symbol') {
          valA = a.symbol;
          valB = b.symbol;
        } else {
          valA = (a[sortBy] as number) || 0;
          valB = (b[sortBy] as number) || 0;
        }
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });

      const totalCount = list.length;
      if (typeof filters?.limit === 'number') {
        const offset = filters.offset || 0;
        list = list.slice(offset, offset + filters.limit);
      }

      return { data: list, count: totalCount, error: null };
    }

    try {
      let query = supabase
        .from('trades')
        .select('*, trading_accounts(id, name, account_type, broker_name, currency)', { count: 'exact' })
        .eq('user_id', userId);

      if (filters?.trading_account_id && filters.trading_account_id !== 'all') {
        query = query.eq('trading_account_id', filters.trading_account_id);
      }
      if (filters?.symbol && filters.symbol.trim() !== '') {
        query = query.ilike('symbol', `%${filters.symbol.trim().toUpperCase()}%`);
      }
      if (filters?.direction) {
        query = query.eq('direction', filters.direction);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.strategy && filters.strategy !== 'all') {
        query = query.eq('strategy', filters.strategy);
      }
      if (filters?.tag && filters.tag !== 'all') {
        query = query.contains('tags', [filters.tag]);
      }
      if (filters?.mistake && filters.mistake !== 'all') {
        query = query.contains('mistakes', [filters.mistake]);
      }
      if (filters?.from_date) {
        query = query.gte('entry_time', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('entry_time', filters.to_date);
      }

      // P&L Outcome Filter
      if (filters?.pnl_outcome === 'win') {
        query = query.gt('net_pnl', 0);
      } else if (filters?.pnl_outcome === 'loss') {
        query = query.lt('net_pnl', 0);
      } else if (filters?.pnl_outcome === 'breakeven') {
        query = query.eq('net_pnl', 0);
      }

      // Search Query (symbol or notes)
      if (filters?.search_query && filters.search_query.trim() !== '') {
        const sq = filters.search_query.trim();
        query = query.or(`symbol.ilike.%${sq}%,notes.ilike.%${sq}%`);
      }

      // Sorting
      const sortBy = filters?.sort_by || 'entry_time';
      const ascending = filters?.sort_order === 'asc';
      query = query.order(sortBy, { ascending });

      // Pagination
      if (typeof filters?.limit === 'number') {
        const from = filters.offset || 0;
        const to = from + filters.limit - 1;
        query = query.range(from, to);
      }

      const { data, count, error } = await query;

      if (error) {
        return { data: [], count: 0, error: new Error(error.message) };
      }

      const tradesWithAccounts: TradeWithAccount[] = ((data as unknown as Record<string, unknown>[]) || []).map((item) => ({
        ...(item as unknown as Trade),
        account: (item.trading_accounts as TradeWithAccount['account']) || null,
      }));

      let hydratedList = await TradeJunctionService.hydrateTrades(userId, tradesWithAccounts);

      // Fine-grained filter fallback for strategies/tags/mistakes linked via junction tables
      if (filters?.strategy && filters.strategy !== 'all') {
        const sFilter = filters.strategy.toLowerCase();
        hydratedList = hydratedList.filter((t) =>
          t.strategy?.toLowerCase() === sFilter ||
          t.strategy_ids?.includes(filters.strategy!) ||
          t.strategies?.some((s) => s.id === filters.strategy || s.name.toLowerCase() === sFilter)
        );
      }
      if (filters?.tag && filters.tag !== 'all') {
        const tFilter = filters.tag.toLowerCase();
        hydratedList = hydratedList.filter((t) =>
          t.tags?.some((tg) => tg.toLowerCase() === tFilter) ||
          t.tag_ids?.includes(filters.tag!) ||
          t.tags_list?.some((tg) => tg.id === filters.tag || tg.name.toLowerCase() === tFilter)
        );
      }
      if (filters?.mistake && filters.mistake !== 'all') {
        const mFilter = filters.mistake.toLowerCase();
        hydratedList = hydratedList.filter((t) =>
          t.mistakes?.some((m) => m.toLowerCase() === mFilter) ||
          t.mistake_ids?.includes(filters.mistake!) ||
          t.mistakes_list?.some((m) => m.id === filters.mistake || m.name.toLowerCase() === mFilter)
        );
      }

      return {
        data: hydratedList,
        count: count !== null ? count : hydratedList.length,
        error: null,
      };
    } catch (err: unknown) {
      return { data: [], count: 0, error: err instanceof Error ? err : new Error('Database error querying trades') };
    }
  }

  /**
   * Updates an existing trade in the database, recalculating financial metrics.
   */
  public static async updateTrade(
    userId: string,
    tradeId: string,
    updates: TradeUpdate
  ): Promise<{ data: TradeWithAccount | null; error: Error | null }> {
    if (!userId || !tradeId) {
      return { data: null, error: new Error('User ID and Trade ID are required') };
    }

    const existingResult = await this.getTrade(userId, tradeId);
    if (existingResult.error || !existingResult.data) {
      return { data: null, error: existingResult.error || new Error('Trade not found') };
    }
    const current = existingResult.data;

    const direction = updates.direction ?? current.direction;
    const entryPrice = updates.entry_price ?? current.entry_price;
    const exitPrice = updates.exit_price !== undefined ? updates.exit_price : current.exit_price;
    const quantity = updates.quantity ?? current.quantity;
    const commission = updates.commission !== undefined ? updates.commission : current.commission;
    const fees = updates.fees !== undefined ? updates.fees : current.fees;
    const swap = updates.swap !== undefined ? updates.swap : current.swap;
    const riskAmount = updates.risk_amount !== undefined ? updates.risk_amount : current.risk_amount;

    const metrics = calculateTradeMetrics({
      direction,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      commission,
      fees,
      swap,
      risk_amount: riskAmount,
    });

    // Resolve strategies, tags, mistakes
    const rawUpdates = updates as Record<string, unknown>;
    const stratList =
      (rawUpdates.strategies as string[]) ||
      (rawUpdates.strategy_ids as string[]) ||
      (updates.strategy !== undefined ? (updates.strategy ? [updates.strategy] : []) : undefined);
    const primaryStrategy =
      updates.strategy !== undefined ? updates.strategy : stratList ? stratList[0] || null : current.strategy;

    const tagList =
      (rawUpdates.tags as string[]) ||
      (rawUpdates.tag_ids as string[]) ||
      (updates.tags !== undefined ? updates.tags : current.tags);

    const mistakeList =
      (rawUpdates.mistakes as string[]) ||
      (rawUpdates.mistake_ids as string[]) ||
      (updates.mistakes !== undefined ? updates.mistakes : current.mistakes);

    const computedPayload: TradeUpdate = {
      ...updates,
      strategy: primaryStrategy,
      tags: tagList,
      mistakes: mistakeList,
      gross_pnl: metrics.gross_pnl,
      net_pnl: metrics.net_pnl,
      r_multiple: metrics.r_multiple,
      updated_at: new Date().toISOString(),
    };

    if (isVitest()) {
      const list = this.getTestTrades(userId);
      const index = list.findIndex((t) => t.id === tradeId && t.user_id === userId);
      if (index === -1) return { data: null, error: new Error('Trade not found') };

      const updated = {
        ...list[index],
        ...computedPayload,
      } as TradeWithAccount;

      list[index] = updated;
      this.saveTestTrades(userId, list);

      await this.syncTradeRelations(userId, tradeId, updates as Record<string, unknown>);
      const [hydrated] = await TradeJunctionService.hydrateTrades(userId, [updated]);
      return { data: hydrated || updated, error: null };
    }

    try {
      const {
        strategies: _s,
        strategy_ids: _si,
        tag_ids: _ti,
        mistake_ids: _mi,
        ...dbPayload
      } = computedPayload;

      const { data, error } = await supabase
        .from('trades')
        .update(dbPayload)
        .eq('id', tradeId)
        .eq('user_id', userId)
        .select('*, trading_accounts(id, name, account_type, broker_name, currency)')
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      if (!data) return { data: null, error: new Error('Empty response updating trade') };

      const raw = data as Record<string, unknown>;
      const updatedTrade: TradeWithAccount = {
        ...(raw as unknown as Trade),
        account: (raw.trading_accounts as TradeWithAccount['account']) || null,
      };

      await this.syncTradeRelations(userId, tradeId, updates as Record<string, unknown>);
      const [hydrated] = await TradeJunctionService.hydrateTrades(userId, [updatedTrade]);
      return { data: hydrated || updatedTrade, error: null };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err : new Error('Database error updating trade') };
    }
  }

  /**
   * Deletes a trade by ID from the database.
   */
  public static async deleteTrade(
    userId: string,
    tradeId: string
  ): Promise<{ success: boolean; error: Error | null }> {
    if (!userId || !tradeId) {
      return { success: false, error: new Error('User ID and Trade ID are required') };
    }

    try {
      await ScreenshotService.deleteTradeScreenshots(userId, tradeId);
    } catch {
      // non-fatal
    }

    if (isVitest()) {
      const list = this.getTestTrades(userId);
      this.saveTestTrades(userId, list.filter((t) => t.id !== tradeId));
      return { success: true, error: null };
    }

    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, error: null };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err : new Error('Database error deleting trade') };
    }
  }
}
