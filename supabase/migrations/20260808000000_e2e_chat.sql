-- =========================================================================
-- SAKIDO E2E ENCRYPTED CHAT — SCHEMA, RLS, RATE LIMITING
-- =========================================================================

-- ─── 1. ADD PUBLIC KEY TO PROFILES ───────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_key text,
  ADD COLUMN IF NOT EXISTS public_key_updated_at timestamptz;

-- Scoped RPC function: returns ONLY public_key for a given user.
-- Does NOT open full profiles row to other users.
CREATE OR REPLACE FUNCTION public.get_public_key(target_user_id uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT public_key FROM public.profiles WHERE id = target_user_id;
$$;

-- ─── 2. MESSAGES TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ciphertext    text NOT NULL,
  nonce         text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT no_self_message CHECK (sender_id != recipient_id),
  CONSTRAINT ciphertext_max_length CHECK (length(ciphertext) <= 13500),
  CONSTRAINT nonce_max_length CHECK (length(nonce) <= 64),
  CONSTRAINT valid_base64_ciphertext CHECK (ciphertext ~ '^[A-Za-z0-9+/]+=*$'),
  CONSTRAINT valid_base64_nonce CHECK (nonce ~ '^[A-Za-z0-9+/]+=*$')
);

-- Conversation lookup index (works for both directions)
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON public.messages (
    LEAST(sender_id, recipient_id),
    GREATEST(sender_id, recipient_id),
    created_at DESC
  );

-- Rate-limit trigger index
CREATE INDEX IF NOT EXISTS idx_messages_sender_recent
  ON public.messages (sender_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ─── 3. RLS POLICIES ────────────────────────────────────────────────────

-- SELECT: only sender or recipient
DROP POLICY IF EXISTS "Users read own messages" ON public.messages;
CREATE POLICY "Users read own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- INSERT: must be sender, can't message self, recipient must exist
DROP POLICY IF EXISTS "Users send messages as themselves" ON public.messages;
CREATE POLICY "Users send messages as themselves"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_id != recipient_id
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = recipient_id)
  );

-- No UPDATE or DELETE — messages are immutable once encrypted and sent

-- ─── 4. RATE LIMIT TRIGGER ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  -- ═══════════════════════════════════════════════
  -- TUNABLE CONSTANTS
  -- ═══════════════════════════════════════════════
  BURST_LIMIT   CONSTANT int := 5;
  BURST_WINDOW  CONSTANT interval := '10 seconds';
  DAILY_LIMIT   CONSTANT int := 500;

  burst_count   int;
  daily_count   int;
BEGIN
  -- Serialize rate-limit checks per sender to prevent race condition bypass
  PERFORM pg_advisory_xact_lock(hashtext('msg_rate_' || NEW.sender_id::text));

  -- Burst check
  SELECT COUNT(*) INTO burst_count
  FROM public.messages
  WHERE sender_id = NEW.sender_id
    AND created_at > (now() - BURST_WINDOW);

  IF burst_count >= BURST_LIMIT THEN
    RAISE EXCEPTION 'RATE_LIMIT_BURST: You are sending messages too fast. Please wait a few seconds.'
      USING ERRCODE = 'P0429';
  END IF;

  -- Daily check
  SELECT COUNT(*) INTO daily_count
  FROM public.messages
  WHERE sender_id = NEW.sender_id
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  IF daily_count >= DAILY_LIMIT THEN
    RAISE EXCEPTION 'RATE_LIMIT_DAILY: Daily message limit reached. Try again tomorrow.'
      USING ERRCODE = 'P0430';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_message_rate_limit ON public.messages;
CREATE TRIGGER trg_message_rate_limit
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_message_rate_limit();
