-- ══════════════════════════════════════════════════════════════
-- Migration 0005: Indexes
-- Performance indexes for queries, RLS, and common access patterns
-- ══════════════════════════════════════════════════════════════

-- Form responses indexes
CREATE INDEX idx_form_responses_study       ON form_responses (study_id);
CREATE INDEX idx_form_responses_participant ON form_responses (participant_id);
CREATE INDEX idx_form_responses_form        ON form_responses (form_id);
CREATE INDEX idx_form_responses_event       ON form_responses (event_id);
CREATE INDEX idx_form_responses_status      ON form_responses (study_id, status);
CREATE INDEX idx_form_responses_data        ON form_responses USING GIN (data);

-- Participants indexes
CREATE INDEX idx_participants_study         ON participants (study_id);
CREATE INDEX idx_participants_study_number  ON participants (study_id, study_number);
CREATE INDEX idx_participants_status        ON participants (study_id, status);

-- Study members indexes
CREATE INDEX idx_study_members_user         ON study_members (user_id);
CREATE INDEX idx_study_members_study        ON study_members (study_id);
CREATE INDEX idx_study_members_active       ON study_members (study_id, user_id) WHERE is_active = true;

-- Audit log indexes
CREATE INDEX idx_audit_log_study            ON audit_log (study_id, changed_at);
CREATE INDEX idx_audit_log_record           ON audit_log (record_id, changed_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user         ON notifications (user_id, is_read, created_at DESC);

-- Data queries indexes
CREATE INDEX idx_data_queries_study         ON data_queries (study_id, status);

-- Adverse events indexes
CREATE INDEX idx_adverse_events_sae         ON adverse_events (study_id) WHERE is_sae = true;

-- Randomization sequence index
CREATE INDEX idx_rand_seq_next ON randomization_sequence (study_id, stratum_id, sequence_number)
    WHERE used_at IS NULL;
