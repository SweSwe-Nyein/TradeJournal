import type { Database } from './database.types';
import type { TradingAccount } from './account';
import type { Strategy, Tag, Mistake } from './journal-metadata';

export type TradeDirection = 'long' | 'short';
export type TradeStatus = 'open' | 'closed';
export type TradePnlOutcome = 'all' | 'win' | 'loss' | 'breakeven';

/**
 * Normalized database record for a trade in TradeJournal.
 * Matches Supabase `public.trades` row exactly.
 */
export type Trade = Database['public']['Tables']['trades']['Row'];
export type TradeInsert = Database['public']['Tables']['trades']['Insert'] & {
  strategies?: string[];
  strategy_ids?: string[];
  tag_ids?: string[];
  mistake_ids?: string[];
};

export type TradeUpdate = Database['public']['Tables']['trades']['Update'] & {
  strategies?: string[];
  strategy_ids?: string[];
  tag_ids?: string[];
  mistake_ids?: string[];
};

export type TradeWithAccount = Trade & {
  account?: TradingAccount | null;
  strategies?: Strategy[];
  strategy_ids?: string[];
  tags_list?: Tag[];
  tag_ids?: string[];
  mistakes_list?: Mistake[];
  mistake_ids?: string[];
};

/**
 * Normalized trade calculation payload
 */
export interface TradeCalculationInputs {
  symbol: string;
  direction: TradeDirection;
  entry_price: number;
  exit_price?: number | null;
  quantity: number;
  commission?: number;
  fees?: number;
  swap?: number;
  risk_amount?: number | null;
  usdJpyRate?: number;
  gross_pnl?: number | null;
}

/**
 * Calculated financial results for a trade
 */
export interface TradeCalculationResults {
  gross_pnl: number;
  net_pnl: number;
  r_multiple: number | null;
}

/**
 * Filter parameters for querying trades across views (journal, explorer, analytics)
 */
export interface TradeFilters {
  trading_account_id?: string;
  symbol?: string;
  direction?: TradeDirection;
  status?: TradeStatus;
  strategy?: string;
  strategy_id?: string;
  strategy_ids?: string[];
  tag?: string;
  tag_id?: string;
  tag_ids?: string[];
  mistake?: string;
  mistake_id?: string;
  mistake_ids?: string[];
  pnl_outcome?: 'win' | 'loss' | 'breakeven';
  search_query?: string;
  from_date?: string;
  to_date?: string;
  sort_by?: 'entry_time' | 'exit_time' | 'net_pnl' | 'symbol' | 'quantity' | 'r_multiple' | 'created_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
