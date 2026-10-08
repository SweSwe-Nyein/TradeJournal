-- Migration: Create trades table with strict constraints, indexes, and RLS policies
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ,
  entry_price NUMERIC(18, 8) NOT NULL CHECK (entry_price > 0),
  exit_price NUMERIC(18, 8) CHECK (exit_price IS NULL OR exit_price > 0),
  quantity NUMERIC(18, 8) NOT NULL CHECK (quantity > 0),
  stop_loss NUMERIC(18, 8) CHECK (stop_loss IS NULL OR stop_loss > 0),
  take_profit NUMERIC(18, 8) CHECK (take_profit IS NULL OR take_profit > 0),
  commission NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (commission >= 0),
  fees NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (fees >= 0),
  swap NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  gross_pnl NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  net_pnl NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  risk_amount NUMERIC(14, 4) CHECK (risk_amount IS NULL OR risk_amount >= 0),
  r_multiple NUMERIC(10, 4),
  status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Constraint: Exit time must not precede entry time when both exist
  CONSTRAINT chk_trades_exit_after_entry CHECK (exit_time IS NULL OR exit_time >= entry_time)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_trading_account_id ON public.trades(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON public.trades(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_exit_time ON public.trades(exit_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_account_entry ON public.trades(trading_account_id, entry_time DESC);

-- Enable Row Level Security
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Users can only view their own trades
CREATE POLICY "Users can view own trades"
  ON public.trades
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. INSERT: Users can only insert trades with their user_id AND referencing a trading account they own
CREATE POLICY "Users can insert own trades"
  ON public.trades
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.trading_accounts ta
      WHERE ta.id = trading_account_id
      AND ta.user_id = auth.uid()
    )
  );

-- 3. UPDATE: Users can only update their own trades AND maintain ownership of the trading account
CREATE POLICY "Users can update own trades"
  ON public.trades
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.trading_accounts ta
      WHERE ta.id = trading_account_id
      AND ta.user_id = auth.uid()
    )
  );

-- 4. DELETE: Users can only delete their own trades
CREATE POLICY "Users can delete own trades"
  ON public.trades
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: Automatically maintain updated_at
CREATE OR REPLACE TRIGGER on_trades_updated
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
