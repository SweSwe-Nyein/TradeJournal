-- =========================================================================
-- FOREX MARKET CONFIRMATION TABLE MIGRATION
-- Supports 8 major/cross forex pairs with Twelve Data market structure,
-- ADR calculations, session levels, and liquidity sweep tracking.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.forex_market_confirmation (
  pair TEXT PRIMARY KEY,
  price NUMERIC NOT NULL,
  price_timestamp TIMESTAMPTZ NOT NULL,
  adr_5 NUMERIC,
  adr_10 NUMERIC,
  adr_20 NUMERIC,
  today_high NUMERIC NOT NULL,
  today_low NUMERIC NOT NULL,
  today_range_pips NUMERIC NOT NULL,
  adr_percentage NUMERIC,
  pdh NUMERIC,
  pdl NUMERIC,
  pwh NUMERIC,
  pwl NUMERIC,
  asian_high NUMERIC,
  asian_low NUMERIC,
  liquidity_sweep_status TEXT NOT NULL DEFAULT 'None',
  sweep_level NUMERIC,
  sweep_timeframe TEXT,
  h1_bias TEXT NOT NULL DEFAULT 'NEUTRAL',
  m15_confirmation TEXT NOT NULL DEFAULT 'NONE',
  final_bias TEXT NOT NULL DEFAULT 'NEUTRAL',
  setup_status TEXT NOT NULL DEFAULT 'NO SETUP',
  setup_reason TEXT NOT NULL DEFAULT 'No setup detected',
  data_freshness TEXT NOT NULL DEFAULT 'UNAVAILABLE',
  delta_status TEXT NOT NULL DEFAULT 'N/A — unavailable from source',
  tick_volume NUMERIC,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  raw_meta JSONB
);

-- Index for quick sorting and filtering
CREATE INDEX IF NOT EXISTS idx_forex_market_confirmation_last_updated ON public.forex_market_confirmation(last_updated_at);

-- Enable RLS
ALTER TABLE public.forex_market_confirmation ENABLE ROW LEVEL SECURITY;

-- Allow public read access to market data confirmations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'forex_market_confirmation' 
    AND policyname = 'Public read access to forex confirmation'
  ) THEN
    CREATE POLICY "Public read access to forex confirmation" 
      ON public.forex_market_confirmation 
      FOR SELECT 
      USING (true);
  END IF;
  
  -- Allow service role and authenticated users to insert/update market confirmation data
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'forex_market_confirmation' 
    AND policyname = 'Allow insert and update for market data'
  ) THEN
    CREATE POLICY "Allow insert and update for market data" 
      ON public.forex_market_confirmation 
      FOR ALL 
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
