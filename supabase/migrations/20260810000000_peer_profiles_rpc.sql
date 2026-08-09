-- =========================================================================
-- SAKIDO PEER PROFILES SECURITY DEFINER RPC
-- =========================================================================

-- Allows authenticated users to safely fetch basic peer profile metadata
-- (username, discriminator, public_key) for conversation listing without
-- opening full profile rows to broad SELECT policies.
CREATE OR REPLACE FUNCTION public.get_peer_profiles(peer_ids uuid[])
RETURNS TABLE (
  id uuid,
  username text,
  discriminator text,
  public_key text
)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT p.id, p.username, p.discriminator, p.public_key
  FROM public.profiles p
  WHERE p.id = ANY(peer_ids);
$$;
