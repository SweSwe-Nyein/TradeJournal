-- Create trading_accounts table
CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('personal', 'prop_firm', 'demo')),
  broker_name TEXT,
  starting_balance NUMERIC(14, 2) NOT NULL CHECK (starting_balance >= 0),
  current_balance NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for user_id to ensure fast queries and joins
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON public.trading_accounts(user_id);

-- Enable Row Level Security
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can ONLY access their own accounts
-- SELECT: Users can only view their own trading accounts
CREATE POLICY "Users can view own trading accounts"
  ON public.trading_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert trading accounts with their own user_id
CREATE POLICY "Users can insert own trading accounts"
  ON public.trading_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own trading accounts
CREATE POLICY "Users can update own trading accounts"
  ON public.trading_accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own trading accounts
CREATE POLICY "Users can delete own trading accounts"
  ON public.trading_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to maintain updated_at
CREATE OR REPLACE TRIGGER on_trading_accounts_updated
  BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
