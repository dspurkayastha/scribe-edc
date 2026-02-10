-- ══════════════════════════════════════════════════════════════
-- Migration 0006: JWT Claims Hook
-- Embeds study memberships in JWT for efficient RLS
-- ══════════════════════════════════════════════════════════════

-- Custom Auth hook: embed study memberships in JWT
CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
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

-- Grant necessary permissions for the auth hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON study_members TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION custom_access_token_hook TO supabase_auth_admin;

-- Revoke function from public/anon for security
REVOKE EXECUTE ON FUNCTION custom_access_token_hook FROM authenticated, anon, public;
