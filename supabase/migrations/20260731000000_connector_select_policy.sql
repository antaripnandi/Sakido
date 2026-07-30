-- =========================================================================
-- SAKIDO CONNECTOR FLAGS: COLUMN-LEVEL SELECT GRANTS
-- =========================================================================
-- Adds flag columns (idempotent), backfills any existing NULL values,
-- enforces NOT NULL, then applies column-level grants so authenticated
-- clients can read flag columns but NOT refresh_token.
--
-- RLS is row-level, not column-level. A SELECT policy alone would expose
-- the entire row including refresh_token. Column-level grants restrict
-- which columns the client role can access.
--
-- Only the 'authenticated' role gets SELECT grants, not 'anon' (least
-- privilege). The row-level policy (auth.uid() = user_id) would block
-- anon in practice, but Prevents future policy additions from
-- accidentally widening access.
-- =========================================================================

-- 1. Ensure flag columns exist (idempotent — no NOT NULL here yet because
--    IF NOT EXISTS skips existing columns and would miss backfill)
ALTER TABLE public.google_tokens
  ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_drive_connected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gmail_connected BOOLEAN DEFAULT false;

-- 2. Backfill any NULL values that may exist from pre-migration upserts
--    (Issue 3 in audit: App.tsx upsert without flags could leave NULLs)
UPDATE public.google_tokens
  SET google_calendar_connected = COALESCE(google_calendar_connected, false),
      google_drive_connected    = COALESCE(google_drive_connected, false),
      gmail_connected           = COALESCE(gmail_connected, false);

-- 3. Enforce NOT NULL now that existing rows are clean
ALTER TABLE public.google_tokens
  ALTER COLUMN google_calendar_connected SET NOT NULL,
  ALTER COLUMN google_calendar_connected SET DEFAULT false,
  ALTER COLUMN google_drive_connected SET NOT NULL,
  ALTER COLUMN google_drive_connected SET DEFAULT false,
  ALTER COLUMN gmail_connected SET NOT NULL,
  ALTER COLUMN gmail_connected SET DEFAULT false;

-- 4. Row-level SELECT policy (only own row)
DROP POLICY IF EXISTS "user_can_read_flags" ON public.google_tokens;
CREATE POLICY "user_can_read_flags" ON public.google_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Column-level grants — grant SELECT only on non-sensitive columns.
--    Revoke from both authenticated and anon for cleanliness, but only
--    re-grant to authenticated (least privilege — anon has no business
--    reading connector flags).
--    refresh_token remains inaccessible to clients even via direct query.
REVOKE SELECT ON public.google_tokens FROM authenticated, anon;
GRANT SELECT (user_id, google_calendar_connected, google_drive_connected, gmail_connected, updated_at)
  ON public.google_tokens TO authenticated;

-- Note: INSERT/UPDATE/DELETE policies remain unchanged from
-- add_google_tokens.sql. user_id is included in the SELECT grant because
-- existing policy expressions reference it via USING (auth.uid() = user_id).
-- Without it, the UPDATE and DELETE policies themselves could break.