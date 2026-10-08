-- Add prop_firm_rules to trading_accounts
ALTER TABLE public.trading_accounts ADD COLUMN IF NOT EXISTS prop_firm_rules JSONB;

-- Add currency and date_format to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'YYYY-MM-DD';

-- Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('pnl', 'trade_count', 'win_rate', 'max_drawdown')),
  target_value NUMERIC(14, 2) NOT NULL,
  current_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_goals_trading_account_id ON public.goals(trading_account_id);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER on_goals_updated
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
