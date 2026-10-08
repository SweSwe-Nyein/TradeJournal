import type { Database } from './database.types';

export type Strategy = Database['public']['Tables']['strategies']['Row'];
export type StrategyInsert = Database['public']['Tables']['strategies']['Insert'];
export type StrategyUpdate = Database['public']['Tables']['strategies']['Update'];

export type Tag = Database['public']['Tables']['tags']['Row'];
export type TagInsert = Database['public']['Tables']['tags']['Insert'];
export type TagUpdate = Database['public']['Tables']['tags']['Update'];

export type Mistake = Database['public']['Tables']['mistakes']['Row'];
export type MistakeInsert = Database['public']['Tables']['mistakes']['Insert'];
export type MistakeUpdate = Database['public']['Tables']['mistakes']['Update'];

export type TradeStrategy = Database['public']['Tables']['trade_strategies']['Row'];
export type TradeTag = Database['public']['Tables']['trade_tags']['Row'];
export type TradeMistake = Database['public']['Tables']['trade_mistakes']['Row'];

/**
 * Analytics summary for a strategy, tag, or mistake
 */
export interface CategoricalPerformanceMetrics {
  id: string;
  name: string;
  description?: string | null;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number; // 0 to 100
  grossProfit: number;
  grossLoss: number;
  netPnl: number;
  profitFactor: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  avgRMultiple: number | null;
  maxWin: number;
  maxLoss: number;
}
