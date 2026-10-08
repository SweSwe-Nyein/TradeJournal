-- Seed file for local Supabase development
-- Note: When using Supabase Auth, profiles are populated via the handle_new_user trigger.
-- This file can be used to insert mock data or default trading configurations.

-- Example profile update after creating a test user in Auth:
-- INSERT INTO public.profiles (id, full_name, avatar_url, timezone)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Demo Trader', null, 'America/New_York')
-- ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, timezone = EXCLUDED.timezone;
