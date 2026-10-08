-- =========================================================================
-- COMPLETE TRADEJOURNAL SUPABASE DATABASE SETUP MIGRATION
-- Paste this entire script into your Supabase SQL Editor and click "Run":
-- https://supabase.com/dashboard/project/psnoqlfyugqoolrzudqx/sql/new
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. PROFILES TABLE & TRIGGERS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Generic function to automatically manage updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to automatically create a profile when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, timezone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill profile for existing user(s) in auth.users
INSERT INTO public.profiles (id, full_name, timezone)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Trader'), 'UTC'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 2. TRADING ACCOUNTS TABLE
-- -------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON public.trading_accounts(user_id);
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_accounts' AND policyname = 'Users can view own trading accounts') THEN
    CREATE POLICY "Users can view own trading accounts" ON public.trading_accounts FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_accounts' AND policyname = 'Users can insert own trading accounts') THEN
    CREATE POLICY "Users can insert own trading accounts" ON public.trading_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_accounts' AND policyname = 'Users can update own trading accounts') THEN
    CREATE POLICY "Users can update own trading accounts" ON public.trading_accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_accounts' AND policyname = 'Users can delete own trading accounts') THEN
    CREATE POLICY "Users can delete own trading accounts" ON public.trading_accounts FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS on_trading_accounts_updated ON public.trading_accounts;
CREATE TRIGGER on_trading_accounts_updated
  BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------------------------------------
-- 3. TRADES TABLE
-- -------------------------------------------------------------------------
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
  strategy TEXT,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  mistakes TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT chk_trades_exit_after_entry CHECK (exit_time IS NULL OR exit_time >= entry_time)
);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_trading_account_id ON public.trades(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON public.trades(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_exit_time ON public.trades(exit_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON public.trades(strategy);
CREATE INDEX IF NOT EXISTS idx_trades_account_entry ON public.trades(trading_account_id, entry_time DESC);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trades' AND policyname = 'Users can view own trades') THEN
    CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trades' AND policyname = 'Users can insert own trades') THEN
    CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM public.trading_accounts ta
        WHERE ta.id = trading_account_id
        AND ta.user_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trades' AND policyname = 'Users can update own trades') THEN
    CREATE POLICY "Users can update own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM public.trading_accounts ta
        WHERE ta.id = trading_account_id
        AND ta.user_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trades' AND policyname = 'Users can delete own trades') THEN
    CREATE POLICY "Users can delete own trades" ON public.trades FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS on_trades_updated ON public.trades;
CREATE TRIGGER on_trades_updated
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------------------------------------
-- 4. STRATEGIES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_strategies_user_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON public.strategies(user_id);
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategies' AND policyname = 'Users can view own strategies') THEN
    CREATE POLICY "Users can view own strategies" ON public.strategies FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategies' AND policyname = 'Users can insert own strategies') THEN
    CREATE POLICY "Users can insert own strategies" ON public.strategies FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategies' AND policyname = 'Users can update own strategies') THEN
    CREATE POLICY "Users can update own strategies" ON public.strategies FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategies' AND policyname = 'Users can delete own strategies') THEN
    CREATE POLICY "Users can delete own strategies" ON public.strategies FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS on_strategies_updated ON public.strategies;
CREATE TRIGGER on_strategies_updated
  BEFORE UPDATE ON public.strategies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------------------------------------
-- 5. TRADE_STRATEGIES (Many-to-Many junction)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trade_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_trade_strategies_pair UNIQUE (trade_id, strategy_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_strategies_user_id ON public.trade_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_strategies_trade_id ON public.trade_strategies(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_strategies_strategy_id ON public.trade_strategies(strategy_id);
ALTER TABLE public.trade_strategies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_strategies' AND policyname = 'Users can view own trade_strategies') THEN
    CREATE POLICY "Users can view own trade_strategies" ON public.trade_strategies FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_strategies' AND policyname = 'Users can insert own trade_strategies') THEN
    CREATE POLICY "Users can insert own trade_strategies" ON public.trade_strategies FOR INSERT WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (SELECT 1 FROM public.trades t WHERE t.id = trade_id AND t.user_id = auth.uid())
      AND EXISTS (SELECT 1 FROM public.strategies s WHERE s.id = strategy_id AND s.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_strategies' AND policyname = 'Users can delete own trade_strategies') THEN
    CREATE POLICY "Users can delete own trade_strategies" ON public.trade_strategies FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 6. TAGS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_tags_user_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users can view own tags') THEN
    CREATE POLICY "Users can view own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users can insert own tags') THEN
    CREATE POLICY "Users can insert own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users can update own tags') THEN
    CREATE POLICY "Users can update own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users can delete own tags') THEN
    CREATE POLICY "Users can delete own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 7. TRADE_TAGS (Many-to-Many junction)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trade_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_trade_tags_pair UNIQUE (trade_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_tags_user_id ON public.trade_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_trade_id ON public.trade_tags(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_tag_id ON public.trade_tags(tag_id);
ALTER TABLE public.trade_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_tags' AND policyname = 'Users can view own trade_tags') THEN
    CREATE POLICY "Users can view own trade_tags" ON public.trade_tags FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_tags' AND policyname = 'Users can insert own trade_tags') THEN
    CREATE POLICY "Users can insert own trade_tags" ON public.trade_tags FOR INSERT WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (SELECT 1 FROM public.trades t WHERE t.id = trade_id AND t.user_id = auth.uid())
      AND EXISTS (SELECT 1 FROM public.tags tg WHERE tg.id = tag_id AND tg.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_tags' AND policyname = 'Users can delete own trade_tags') THEN
    CREATE POLICY "Users can delete own trade_tags" ON public.trade_tags FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 8. MISTAKES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_mistakes_user_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_mistakes_user_id ON public.mistakes(user_id);
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mistakes' AND policyname = 'Users can view own mistakes') THEN
    CREATE POLICY "Users can view own mistakes" ON public.mistakes FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mistakes' AND policyname = 'Users can insert own mistakes') THEN
    CREATE POLICY "Users can insert own mistakes" ON public.mistakes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mistakes' AND policyname = 'Users can update own mistakes') THEN
    CREATE POLICY "Users can update own mistakes" ON public.mistakes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mistakes' AND policyname = 'Users can delete own mistakes') THEN
    CREATE POLICY "Users can delete own mistakes" ON public.mistakes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 9. TRADE_MISTAKES (Many-to-Many junction)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trade_mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  mistake_id UUID NOT NULL REFERENCES public.mistakes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_trade_mistakes_pair UNIQUE (trade_id, mistake_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_mistakes_user_id ON public.trade_mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_mistakes_trade_id ON public.trade_mistakes(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_mistakes_mistake_id ON public.trade_mistakes(mistake_id);
ALTER TABLE public.trade_mistakes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_mistakes' AND policyname = 'Users can view own trade_mistakes') THEN
    CREATE POLICY "Users can view own trade_mistakes" ON public.trade_mistakes FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_mistakes' AND policyname = 'Users can insert own trade_mistakes') THEN
    CREATE POLICY "Users can insert own trade_mistakes" ON public.trade_mistakes FOR INSERT WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (SELECT 1 FROM public.trades t WHERE t.id = trade_id AND t.user_id = auth.uid())
      AND EXISTS (SELECT 1 FROM public.mistakes m WHERE m.id = mistake_id AND m.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_mistakes' AND policyname = 'Users can delete own trade_mistakes') THEN
    CREATE POLICY "Users can delete own trade_mistakes" ON public.trade_mistakes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 10. JOURNAL_ENTRIES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_account_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  mood TEXT CHECK (mood IS NULL OR mood IN ('Excellent', 'Good', 'Neutral', 'Bad', 'Terrible')),
  discipline_score INTEGER CHECK (discipline_score IS NULL OR (discipline_score >= 1 AND discipline_score <= 5)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_journal_user_date UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(date DESC);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_entries' AND policyname = 'Users can view own journal entries') THEN
    CREATE POLICY "Users can view own journal entries" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_entries' AND policyname = 'Users can insert own journal entries') THEN
    CREATE POLICY "Users can insert own journal entries" ON public.journal_entries FOR INSERT WITH CHECK (
      auth.uid() = user_id
      AND (trading_account_id IS NULL OR EXISTS (
        SELECT 1 FROM public.trading_accounts ta
        WHERE ta.id = trading_account_id
        AND ta.user_id = auth.uid()
      ))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_entries' AND policyname = 'Users can update own journal entries') THEN
    CREATE POLICY "Users can update own journal entries" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
      auth.uid() = user_id
      AND (trading_account_id IS NULL OR EXISTS (
        SELECT 1 FROM public.trading_accounts ta
        WHERE ta.id = trading_account_id
        AND ta.user_id = auth.uid()
      ))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_entries' AND policyname = 'Users can delete own journal entries') THEN
    CREATE POLICY "Users can delete own journal entries" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS on_journal_entries_updated ON public.journal_entries;
CREATE TRIGGER on_journal_entries_updated
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------------------------------------
-- 11. TRADE_SCREENSHOTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trade_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  screenshot_type TEXT CHECK (screenshot_type IS NULL OR screenshot_type IN ('Before Entry', 'During Trade', 'After Exit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_trade_screenshots_trade_id ON public.trade_screenshots(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_screenshots_user_id ON public.trade_screenshots(user_id);
ALTER TABLE public.trade_screenshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_screenshots' AND policyname = 'Users can view own trade screenshots') THEN
    CREATE POLICY "Users can view own trade screenshots" ON public.trade_screenshots FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_screenshots' AND policyname = 'Users can insert own trade screenshots') THEN
    CREATE POLICY "Users can insert own trade screenshots" ON public.trade_screenshots FOR INSERT WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (SELECT 1 FROM public.trades t WHERE t.id = trade_id AND t.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_screenshots' AND policyname = 'Users can delete own trade screenshots') THEN
    CREATE POLICY "Users can delete own trade screenshots" ON public.trade_screenshots FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- -------------------------------------------------------------------------
-- 12. STORAGE BUCKET & POLICIES FOR TRADE SCREENSHOTS
-- -------------------------------------------------------------------------
-- Note: You can also create the 'trade-screenshots' bucket manually in Supabase Storage dashboard.
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-screenshots', 'trade-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user-scoped trade screenshots
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload own trade screenshots') THEN
    CREATE POLICY "Users can upload own trade screenshots" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'trade-screenshots' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can view own trade screenshots') THEN
    CREATE POLICY "Users can view own trade screenshots" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'trade-screenshots' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete own trade screenshots') THEN
    CREATE POLICY "Users can delete own trade screenshots" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'trade-screenshots' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

