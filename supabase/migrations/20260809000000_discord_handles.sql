-- =========================================================================
-- SAKIDO DISCORD-STYLE USER HANDLES (username#1234)
-- =========================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS discriminator text;

-- RPC function to lookup profile by username + discriminator or handle string
CREATE OR REPLACE FUNCTION public.find_user_handle(search_query text)
RETURNS TABLE (
  id uuid,
  username text,
  discriminator text,
  public_key text
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  parsed_name text;
  parsed_disc text;
BEGIN
  IF search_query LIKE '%#%' THEN
    parsed_name := split_part(search_query, '#', 1);
    parsed_disc := split_part(search_query, '#', 2);
    RETURN QUERY
      SELECT p.id, p.username, p.discriminator, p.public_key
      FROM public.profiles p
      WHERE LOWER(p.username) = LOWER(parsed_name)
        AND p.discriminator = parsed_disc;
  ELSE
    RETURN QUERY
      SELECT p.id, p.username, p.discriminator, p.public_key
      FROM public.profiles p
      WHERE LOWER(p.username) = LOWER(search_query)
         OR p.id::text = search_query;
  END IF;
END;
$$;
