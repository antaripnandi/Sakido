-- =========================================================================
-- SAKIDO CONNECTOR FLAGS: COLUMN-LEVEL SELECT GRANTS
-- =========================================================================
-- Adds flag columns (if not already present), a row-level SELECT policy,
-- and column-level grants so authenticated clients can read flag columns
-- but NOT refresh_token. This is required for cross-device connector sync.
--
-- RLS is row-level, not column-level. A SELECT policy alone would expose
-- the entire row including refresh_token. Column-level grants restrict
-- which columns the client role can access.
-- =========================================================================

-- 1. Ensure flag columns exist (idempotent)
ALTER TABLE public.google_tokens 
  ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_drive_connected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gmail_connected BOOLEAN NOT NULL DEFAULT false;

-- 2. Row-level SELECT policy (only own row)
DROP POLICY IF EXISTS "user_can_read_flags" ON public.google_tokens;
CREATE POLICY "user_can_read_flags" ON public.google_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Column-level grants: revoke SELECT on all columns for authenticated role,
--    then grant SELECT only on the non-sensitive columns.
--    refresh_token remains inaccessible to clients even via direct query.
REVOKE SELECT ON public.google_tokens FROM authenticated, anon;
GRANT SELECT (user_id, google_calendar_connected, google_drive_connected, gmail_connected, updated_at)
  ON public.google_tokens TO authenticated, anon;

-- Note: INSERT/UPDATE/DELETE policies remain unchanged from
-- add_google_tokens.sql. user_id is included in the SELECT grant because
-- existing policy expressions reference it via USING (auth.uid() = user_id).
-- Without it, the UPDATE and DELETE policies themselves could break.
