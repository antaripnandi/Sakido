-- =========================================================================
-- SAKIDO: ADD GOOGLE CLASSROOM CONNECTOR
-- =========================================================================
-- Adds support for Google Classroom integration:
--   1. classroom_refresh_token (secure, per-service refresh token)
--   2. google_classroom_connected flag (client-visible status flag)
--   3. Updates column-level SELECT grant for authenticated users
-- =========================================================================

-- 1. Per-service token column and connected status flag
ALTER TABLE public.google_tokens
  ADD COLUMN IF NOT EXISTS classroom_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_classroom_connected BOOLEAN DEFAULT false;

-- 2. Backfill existing rows
UPDATE public.google_tokens
SET google_classroom_connected = COALESCE(google_classroom_connected, false);

-- 3. Enforce default and NOT NULL constraint on status flag
ALTER TABLE public.google_tokens
  ALTER COLUMN google_classroom_connected SET DEFAULT false,
  ALTER COLUMN google_classroom_connected SET NOT NULL;

-- 4. Update column-level SELECT grant: allow authenticated users to read status flag
--    (classroom_refresh_token remains secret to server-side service role only)
REVOKE SELECT ON public.google_tokens FROM authenticated, anon;
GRANT SELECT (
  user_id,
  google_calendar_connected,
  google_drive_connected,
  gmail_connected,
  google_classroom_connected,
  updated_at
) ON public.google_tokens TO authenticated;
