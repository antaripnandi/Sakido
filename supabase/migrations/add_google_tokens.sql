-- Supabase Migration: Create google_tokens table with Write-Only RLS policies
CREATE TABLE IF NOT EXISTS public.google_tokens (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- 1. Client can write its own row on initial OAuth sign-in / reconnect
CREATE POLICY "user_can_insert_token" ON public.google_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Client can update its own row if re-authorizing
CREATE POLICY "user_can_update_token" ON public.google_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Client can delete its own row when clicking Disconnect
CREATE POLICY "user_can_delete_token" ON public.google_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- INTENTIONAL: No SELECT policy is created for client roles.
-- Front-end browser scripts can write/update/delete their own row, but CANNOT query/read refresh tokens.
-- Only server-side functions with SUPABASE_SERVICE_ROLE_KEY can read.
