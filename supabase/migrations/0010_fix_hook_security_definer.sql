-- Fix custom_access_token_hook to use SECURITY DEFINER.
-- The hook is called by supabase_auth_admin which cannot bypass RLS
-- on study_members. SECURITY DEFINER runs the function as the owner
-- (postgres), which bypasses RLS. This is the standard Supabase pattern
-- for auth hooks that need to read RLS-protected tables.

CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims JSONB;
    memberships JSONB;
BEGIN
    SELECT jsonb_agg(jsonb_build_object(
        'study_id', sm.study_id,
        'role', sm.role,
        'site_id', sm.site_id
    ))
    INTO memberships
    FROM study_members sm
    WHERE sm.user_id = (event->>'user_id')::UUID
      AND sm.is_active = true;

    claims := event->'claims';
    claims := jsonb_set(claims, '{memberships}', COALESCE(memberships, '[]'::jsonb));
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;

-- Re-apply grants (CREATE OR REPLACE preserves them, but be explicit)
GRANT EXECUTE ON FUNCTION custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION custom_access_token_hook FROM authenticated, anon, public;
