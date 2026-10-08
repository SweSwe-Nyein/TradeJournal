-- Migration: Create strategies, tags, mistakes, and their trade junction tables with RLS

-- 1. STRATEGIES TABLE
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

-- 2. TRADE_STRATEGIES (Many-to-Many junction)
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

-- 3. TAGS TABLE
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

-- 4. TRADE_TAGS (Many-to-Many junction)
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

-- 5. MISTAKES TABLE
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

-- 6. TRADE_MISTAKES (Many-to-Many junction)
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

NOTIFY pgrst, 'reload schema';
