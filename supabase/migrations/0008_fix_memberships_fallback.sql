-- Fix get_user_memberships() to fall back to direct table query
-- when JWT claims don't include memberships (hook not yet enabled).
-- This ensures RLS works even without the custom_access_token_hook.

CREATE OR REPLACE FUNCTION get_user_memberships()
RETURNS TABLE(study_id UUID, role TEXT, site_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    -- Try JWT claims first (fast path when hook is enabled)
    SELECT
        (m->>'study_id')::UUID,
        m->>'role',
        (m->>'site_id')::UUID
    FROM jsonb_array_elements(
        COALESCE(
            (current_setting('request.jwt.claims', true)::jsonb)->'memberships',
            '[]'::jsonb
        )
    ) AS m
    WHERE jsonb_array_length(
        COALESCE(
            (current_setting('request.jwt.claims', true)::jsonb)->'memberships',
            '[]'::jsonb
        )
    ) > 0

    UNION ALL

    -- Fallback: query study_members directly when JWT has no memberships
    SELECT
        sm.study_id,
        sm.role::TEXT,
        sm.site_id
    FROM study_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.is_active = true
      AND jsonb_array_length(
          COALESCE(
              (current_setting('request.jwt.claims', true)::jsonb)->'memberships',
              '[]'::jsonb
          )
      ) = 0;
$$;
