-- ══════════════════════════════════════════════════════════════
-- Migration 0012: Phase 3 — RLS policies + schema additions
-- Adds INSERT/UPDATE/DELETE policies for event_forms,
-- study_periods, eligibility_criteria, and study_events.
-- Adds is_active column to study_periods.
-- ══════════════════════════════════════════════════════════════

-- ─── Add is_active to study_periods ───
ALTER TABLE study_periods ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ─── study_events: INSERT/UPDATE/DELETE for PI/Co-I ───
CREATE POLICY "PI/Co-I can insert study events" ON study_events
    FOR INSERT TO authenticated
    WITH CHECK (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator')
        )
    );

CREATE POLICY "PI/Co-I can update study events" ON study_events
    FOR UPDATE TO authenticated
    USING (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator')
        )
    );

CREATE POLICY "PI/Co-I can delete study events" ON study_events
    FOR DELETE TO authenticated
    USING (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator')
        )
    );

-- ─── event_forms: INSERT/UPDATE/DELETE for PI/Co-I ───
-- (join through study_events to get study_id)
CREATE POLICY "PI/Co-I can insert event forms" ON event_forms
    FOR INSERT TO authenticated
    WITH CHECK (
        event_id IN (
            SELECT se.id FROM study_events se
            WHERE se.study_id IN (
                SELECT study_id FROM get_user_memberships()
                WHERE role IN ('pi', 'co_investigator')
            )
        )
    );

CREATE POLICY "PI/Co-I can update event forms" ON event_forms
    FOR UPDATE TO authenticated
    USING (
        event_id IN (
            SELECT se.id FROM study_events se
            WHERE se.study_id IN (
                SELECT study_id FROM get_user_memberships()
                WHERE role IN ('pi', 'co_investigator')
            )
        )
    );

CREATE POLICY "PI/Co-I can delete event forms" ON event_forms
    FOR DELETE TO authenticated
    USING (
        event_id IN (
            SELECT se.id FROM study_events se
            WHERE se.study_id IN (
                SELECT study_id FROM get_user_memberships()
                WHERE role IN ('pi', 'co_investigator')
            )
        )
    );

-- ─── study_periods: INSERT/UPDATE/DELETE for PI/Co-I ───
CREATE POLICY "PI/Co-I can insert study periods" ON study_periods
    FOR INSERT TO authenticated
    WITH CHECK (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator')
        )
    );

CREATE POLICY "PI/Co-I can update study periods" ON study_periods
    FOR UPDATE TO authenticated
    USING (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator')
        )
    );

CREATE POLICY "PI/Co-I can delete study periods" ON study_periods
    FOR DELETE TO authenticated
    USING (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator')
        )
    );

-- ─── eligibility_criteria: INSERT/UPDATE/DELETE for PI/Co-I ───
CREATE POLICY "PI/Co-I can insert eligibility criteria" ON eligibility_criteria
    FOR INSERT TO authenticated
    WITH CHECK (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator')
        )
    );

CREATE POLICY "PI/Co-I can update eligibility criteria" ON eligibility_criteria
    FOR UPDATE TO authenticated
    USING (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator')
        )
    );

CREATE POLICY "PI/Co-I can delete eligibility criteria" ON eligibility_criteria
    FOR DELETE TO authenticated
    USING (
        study_id IN (
            SELECT study_id FROM get_user_memberships()
            WHERE role IN ('pi', 'co_investigator')
        )
    );
