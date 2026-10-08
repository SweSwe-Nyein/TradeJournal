-- Migration: Add journaling fields (strategy, tags, mistakes) to trades table
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS strategy TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS mistakes TEXT[] DEFAULT '{}'::TEXT[];

CREATE INDEX IF NOT EXISTS idx_trades_strategy ON public.trades(strategy);
