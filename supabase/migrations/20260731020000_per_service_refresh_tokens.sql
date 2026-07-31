-- =========================================================================
-- SAKIDO: PER-SERVICE GOOGLE REFRESH TOKENS
-- =========================================================================
-- Root-cause fix for the "Google Calendar Invalid" incident (2026-07-31).
--
-- The bug: google_tokens had ONE refresh_token column shared by all three
-- connector flows (Calendar, Drive, Gmail). Each connect ran its own OAuth
-- flow with different scopes and overwrote the same column with a token
-- scoped only to that service — silently revoking whichever service was
-- connected before, while its _connected flag stayed true. Google then
-- rejected the wrong-scoped token as "insufficient", which surfaced as
-- "Calendar invalid" despite a live, valid refresh token.
--
-- This migration:
--   1. Adds one refresh-token column per service
--   2. Makes the legacy shared column nullable — the app no longer writes it,
--      and add_google_tokens.sql created it NOT NULL, which would reject the
--      first per-service INSERT
--   3. Migrates existing rows: copies the shared token into the service that
--      is flagged connected. If multiple flags are true, we cannot know which
--      scope the token has, so flags + tokens are cleared and the user is
--      prompted to reconnect (safer than silently keeping a wrong token)
--
-- After one week of stable production, drop the legacy column:
--   ALTER TABLE public.google_tokens DROP COLUMN refresh_token;
-- =========================================================================

-- 1. Per-service token columns
ALTER TABLE public.google_tokens
  ADD COLUMN IF NOT EXISTS calendar_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS drive_refresh_token    TEXT,
  ADD COLUMN IF NOT EXISTS gmail_refresh_token    TEXT;

-- 2. Legacy shared column becomes nullable (app no longer writes it)
ALTER TABLE public.google_tokens
  ALTER COLUMN refresh_token DROP NOT NULL;

-- 3. Data migration — copy the existing shared token into the service(s)
--    currently flagged connected.
UPDATE public.google_tokens
SET
  calendar_refresh_token = CASE WHEN google_calendar_connected THEN refresh_token ELSE NULL END,
  drive_refresh_token    = CASE WHEN google_drive_connected    THEN refresh_token ELSE NULL END,
  gmail_refresh_token    = CASE WHEN gmail_connected           THEN refresh_token ELSE NULL END;

-- 4. If multiple flags were true, the single stored token can only carry one
--    service's scope — we cannot know which. Clear flags AND tokens so the
--    user is forced to reconnect cleanly per service (no lying state).
UPDATE public.google_tokens
SET
  google_calendar_connected = false,
  google_drive_connected    = false,
  gmail_connected           = false,
  calendar_refresh_token    = NULL,
  drive_refresh_token       = NULL,
  gmail_refresh_token       = NULL
WHERE
  (google_calendar_connected::int + google_drive_connected::int + gmail_connected::int) > 1;

-- Note: the per-service token columns are intentionally NOT added to the
-- authenticated SELECT grant (see 20260731000000_connector_select_policy.sql,
-- which only grants SELECT on the flag columns + user_id + updated_at).
-- Clients can insert/update their own row but can never read tokens back —
-- only the service role can. No change needed here.
