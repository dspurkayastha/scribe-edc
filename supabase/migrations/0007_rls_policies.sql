-- ══════════════════════════════════════════════════════════════
-- Migration 0007: Row Level Security Policies
-- Study/site isolation using JWT-embedded memberships
-- ══════════════════════════════════════════════════════════════

-- Helper: get current user's memberships from JWT
CREATE OR REPLACE FUNCTION get_user_memberships()
RETURNS TABLE(study_id UUID, role TEXT, site_id UUID)
LANGUAGE sql STABLE
AS $$
    SELECT
        (m->>'study_id')::UUID,
        m->>'role',
        (m->>'site_id')::UUID
    FROM jsonb_array_elements(
        COALESCE(
            (current_setting('request.jwt.claims', true)::jsonb)->'memberships',
            '[]'::jsonb
        )
    ) AS m;
$$;

-- ─── Enable RLS on all tables ───

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_arms ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_strata ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE randomization_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE randomization_sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE randomization_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE adverse_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE unblinding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ─── Organization policies ───

CREATE POLICY "Users can view orgs they belong to" ON organizations
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT s.organization_id FROM studies s
            WHERE s.id IN (SELECT study_id FROM get_user_memberships())
        )
    );

CREATE POLICY "Authenticated users can create orgs" ON organizations
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ─── User profile policies ───

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can view profiles of study members" ON user_profiles
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT sm.user_id FROM study_members sm
            WHERE sm.study_id IN (SELECT study_id FROM get_user_memberships())
            AND sm.is_active = true
        )
    );

-- ─── Study policies ───

CREATE POLICY "Members can view their studies" ON studies
    FOR SELECT TO authenticated
    USING (id IN (SELECT study_id FROM get_user_memberships()));

CREATE POLICY "PI can update study" ON studies
    FOR UPDATE TO authenticated
    USING (
        id IN (SELECT study_id FROM get_user_memberships() WHERE role = 'pi')
    );

CREATE POLICY "Authenticated users can create studies" ON studies
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ─── Study definition table policies (study_sites, arms, periods, etc.) ───

-- Study sites
CREATE POLICY "Members can view study sites" ON study_sites
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

CREATE POLICY "PI can manage study sites" ON study_sites
    FOR ALL TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships() WHERE role = 'pi'));

-- Study arms
CREATE POLICY "Members can view study arms" ON study_arms
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

CREATE POLICY "PI can manage study arms" ON study_arms
    FOR ALL TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships() WHERE role = 'pi'));

-- Study periods
CREATE POLICY "Members can view study periods" ON study_periods
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

-- Study strata
CREATE POLICY "Members can view study strata" ON study_strata
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

-- Option lists
CREATE POLICY "Members can view option lists" ON option_lists
    FOR SELECT TO authenticated
    USING (
        study_id IS NULL
        OR study_id IN (SELECT study_id FROM get_user_memberships())
    );

-- Study events
CREATE POLICY "Members can view study events" ON study_events
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

-- Form definitions
CREATE POLICY "Members can view form definitions" ON form_definitions
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

CREATE POLICY "PI can manage form definitions" ON form_definitions
    FOR ALL TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships() WHERE role = 'pi'));

-- Event forms
CREATE POLICY "Members can view event forms" ON event_forms
    FOR SELECT TO authenticated
    USING (
        event_id IN (
            SELECT id FROM study_events
            WHERE study_id IN (SELECT study_id FROM get_user_memberships())
        )
    );

-- Eligibility criteria
CREATE POLICY "Members can view eligibility criteria" ON eligibility_criteria
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

-- Randomization config
CREATE POLICY "Members can view randomization config" ON randomization_config
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

-- Randomization sequence (only PI/Co-I can see)
CREATE POLICY "PI/Co-I can view randomization sequence" ON randomization_sequence
    FOR SELECT TO authenticated
    USING (
        study_id IN (SELECT study_id FROM get_user_memberships() WHERE role IN ('pi', 'co_investigator'))
    );

-- Notification rules
CREATE POLICY "Members can view notification rules" ON notification_rules
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

-- ─── Study members policies ───

CREATE POLICY "Members can view study members" ON study_members
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

CREATE POLICY "PI/Co-I can manage study members" ON study_members
    FOR ALL TO authenticated
    USING (
        study_id IN (SELECT study_id FROM get_user_memberships() WHERE role IN ('pi', 'co_investigator'))
    );

-- ─── Participant policies (with site isolation) ───

CREATE POLICY "Members can view participants" ON participants
    FOR SELECT TO authenticated
    USING (
        study_id IN (SELECT study_id FROM get_user_memberships())
        AND (
            site_id IS NULL
            OR site_id IN (
                SELECT COALESCE(m.site_id, participants.site_id)
                FROM get_user_memberships() m
                WHERE m.study_id = participants.study_id
            )
        )
    );

CREATE POLICY "Data entry+ can create participants" ON participants
    FOR INSERT TO authenticated
    WITH CHECK (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator', 'data_entry')
        )
    );

CREATE POLICY "Data entry+ can update participants" ON participants
    FOR UPDATE TO authenticated
    USING (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator', 'data_entry')
        )
    );

-- ─── Form response policies ───

CREATE POLICY "Members can view form responses" ON form_responses
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

CREATE POLICY "Data entry+ can create form responses" ON form_responses
    FOR INSERT TO authenticated
    WITH CHECK (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator', 'data_entry')
        )
    );

CREATE POLICY "Data entry+ can update form responses" ON form_responses
    FOR UPDATE TO authenticated
    USING (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator', 'data_entry')
        )
    );

-- ─── Other data table policies ───

-- Randomization allocations
CREATE POLICY "Members can view allocations" ON randomization_allocations
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

-- Adverse events
CREATE POLICY "Members can view adverse events" ON adverse_events
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

CREATE POLICY "Data entry+ can manage adverse events" ON adverse_events
    FOR ALL TO authenticated
    USING (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator', 'data_entry')
        )
    );

-- Data queries
CREATE POLICY "Members can view data queries" ON data_queries
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

CREATE POLICY "PI/Co-I/Monitor can manage queries" ON data_queries
    FOR ALL TO authenticated
    USING (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator', 'monitor')
        )
    );

-- Query responses
CREATE POLICY "Members can view query responses" ON query_responses
    FOR SELECT TO authenticated
    USING (
        query_id IN (
            SELECT id FROM data_queries
            WHERE study_id IN (SELECT study_id FROM get_user_memberships())
        )
    );

CREATE POLICY "Authenticated can respond to queries" ON query_responses
    FOR INSERT TO authenticated
    WITH CHECK (
        query_id IN (
            SELECT id FROM data_queries
            WHERE study_id IN (
                SELECT study_id FROM get_user_memberships()
                WHERE role IN ('pi', 'co_investigator', 'data_entry', 'monitor')
            )
        )
    );

-- Signatures
CREATE POLICY "Members can view signatures" ON signatures
    FOR SELECT TO authenticated
    USING (study_id IN (SELECT study_id FROM get_user_memberships()));

CREATE POLICY "PI/Co-I can create signatures" ON signatures
    FOR INSERT TO authenticated
    WITH CHECK (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator')
        )
    );

-- Notifications (user can only see own)
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Unblinding events
CREATE POLICY "PI can view unblinding events" ON unblinding_events
    FOR SELECT TO authenticated
    USING (
        study_id IN (SELECT study_id FROM get_user_memberships() WHERE role = 'pi')
    );

-- Audit log (PI/Co-I/Data entry/Monitor can view)
CREATE POLICY "Authorized users can view audit log" ON audit_log
    FOR SELECT TO authenticated
    USING (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator', 'data_entry', 'monitor')
        )
        OR study_id IS NULL
    );
