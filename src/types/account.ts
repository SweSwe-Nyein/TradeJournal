import type { Database } from './database.types';

export type AccountType = 'personal' | 'prop_firm' | 'demo';

export interface PropFirmRules {
  profitTarget?: number;
  maxDrawdown?: number;
  dailyLossLimit?: number;
  minTradingDays?: number;
  consistencyTarget?: number;
}

export type TradingAccount = Database['public']['Tables']['trading_accounts']['Row'] & {
  prop_firm_rules?: PropFirmRules;
};
export type TradingAccountInsert = Database['public']['Tables']['trading_accounts']['Insert'];
export type TradingAccountUpdate = Database['public']['Tables']['trading_accounts']['Update'];

export interface Goal {
  id: string;
  user_id: string;
  trading_account_id?: string | null;
  name: string;
  target_type: 'pnl' | 'trade_count' | 'win_rate' | 'max_drawdown';
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type GoalInsert = Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'is_active'> & { current_value?: number };
export type GoalUpdate = Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export interface TradingAccountSummary {
  startingBalance: number;
  currentBalance: number;
  netPnL: number;
  netPnLPercentage: number;
  currency: string;
}
