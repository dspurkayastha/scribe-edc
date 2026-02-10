-- ══════════════════════════════════════════════════════════════
-- Migration 0003: Study Data Tables (runtime)
-- Partitioned tables for multi-tenant performance
-- ══════════════════════════════════════════════════════════════

-- User-study membership
CREATE TABLE study_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    site_id     UUID REFERENCES study_sites(id) ON DELETE SET NULL,
    role        TEXT NOT NULL
                CHECK (role IN ('pi', 'co_investigator', 'data_entry', 'read_only', 'monitor')),
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, user_id)
);

-- Participants
CREATE TABLE participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    site_id         UUID REFERENCES study_sites(id) ON DELETE SET NULL,
    study_number    TEXT NOT NULL,
    status          TEXT DEFAULT 'screening'
                    CHECK (status IN (
                        'screening', 'eligible', 'ineligible',
                        'enrolled', 'randomized', 'on_treatment',
                        'completed', 'withdrawn', 'lost_to_followup',
                        'screen_failure'
                    )),
    enrolled_at     TIMESTAMPTZ,
    created_by      UUID REFERENCES auth.users(id),
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, study_number)
);

CREATE TRIGGER set_updated_at_participants
    BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Form responses — THE universal data store
-- Partitioned by hash of study_id for multi-tenant performance
CREATE TABLE form_responses (
    id              UUID DEFAULT gen_random_uuid(),
    study_id        UUID NOT NULL,
    participant_id  UUID NOT NULL,
    form_id         UUID NOT NULL,
    form_version    INTEGER NOT NULL,
    event_id        UUID,
    instance_number INTEGER DEFAULT 1,
    data            JSONB NOT NULL DEFAULT '{}'::jsonb,
    status          TEXT DEFAULT 'draft'
                    CHECK (status IN ('draft', 'complete', 'verified', 'locked', 'signed')),
    completed_by    UUID,
    completed_at    TIMESTAMPTZ,
    verified_by     UUID,
    verified_at     TIMESTAMPTZ,
    locked_by       UUID,
    locked_at       TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (id, study_id)
) PARTITION BY HASH (study_id);

-- Create 16 partitions
CREATE TABLE form_responses_p0  PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE form_responses_p1  PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 1);
CREATE TABLE form_responses_p2  PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 2);
CREATE TABLE form_responses_p3  PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 3);
CREATE TABLE form_responses_p4  PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 4);
CREATE TABLE form_responses_p5  PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 5);
CREATE TABLE form_responses_p6  PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 6);
CREATE TABLE form_responses_p7  PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 7);
CREATE TABLE form_responses_p8  PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 8);
CREATE TABLE form_responses_p9  PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 9);
CREATE TABLE form_responses_p10 PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 10);
CREATE TABLE form_responses_p11 PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 11);
CREATE TABLE form_responses_p12 PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 12);
CREATE TABLE form_responses_p13 PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 13);
CREATE TABLE form_responses_p14 PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 14);
CREATE TABLE form_responses_p15 PARTITION OF form_responses FOR VALUES WITH (MODULUS 16, REMAINDER 15);

-- Randomization allocations
CREATE TABLE randomization_allocations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) NOT NULL,
    participant_id  UUID NOT NULL UNIQUE,
    arm_id          UUID REFERENCES study_arms(id) NOT NULL,
    stratum_id      UUID REFERENCES study_strata(id),
    sequence_id     UUID REFERENCES randomization_sequence(id),
    period_id       UUID REFERENCES study_periods(id),
    randomized_by   UUID REFERENCES auth.users(id) NOT NULL,
    randomized_at   TIMESTAMPTZ DEFAULT now()
);

-- Adverse events
CREATE TABLE adverse_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) NOT NULL,
    participant_id  UUID REFERENCES participants(id) NOT NULL,
    event_number    INTEGER NOT NULL,
    description     TEXT NOT NULL,
    onset_date      DATE NOT NULL,
    resolution_date DATE CHECK (resolution_date IS NULL OR resolution_date >= onset_date),
    severity        TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
    relatedness     TEXT NOT NULL CHECK (relatedness IN (
                        'unrelated', 'unlikely', 'possible', 'probable', 'definite'
                    )),
    outcome         TEXT NOT NULL CHECK (outcome IN (
                        'resolved', 'ongoing', 'resolved_with_sequelae', 'fatal', 'unknown'
                    )),
    is_sae          BOOLEAN DEFAULT false,
    sae_criteria    TEXT[],
    sae_reported_at TIMESTAMPTZ,
    sae_acknowledged_by UUID REFERENCES auth.users(id),
    sae_acknowledged_at TIMESTAMPTZ,
    reported_by     UUID REFERENCES auth.users(id) NOT NULL,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, participant_id, event_number)
);

CREATE TRIGGER set_updated_at_adverse_events
    BEFORE UPDATE ON adverse_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Data queries (discrepancy management)
CREATE TABLE data_queries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) NOT NULL,
    participant_id  UUID REFERENCES participants(id) NOT NULL,
    form_response_id UUID,
    field_id        TEXT,
    query_text      TEXT NOT NULL,
    status          TEXT DEFAULT 'open'
                    CHECK (status IN ('open', 'answered', 'closed', 'cancelled')),
    priority        TEXT DEFAULT 'normal'
                    CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    category        TEXT DEFAULT 'manual'
                    CHECK (category IN ('manual', 'auto_validation', 'auto_range', 'auto_missing')),
    raised_by       UUID REFERENCES auth.users(id),
    assigned_to     UUID REFERENCES auth.users(id),
    resolved_by     UUID REFERENCES auth.users(id),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Query responses
CREATE TABLE query_responses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id        UUID REFERENCES data_queries(id) ON DELETE CASCADE NOT NULL,
    response_text   TEXT NOT NULL,
    responded_by    UUID REFERENCES auth.users(id) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Electronic signatures (21 CFR Part 11)
CREATE TABLE signatures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) NOT NULL,
    form_response_id UUID NOT NULL,
    signer_id       UUID REFERENCES auth.users(id) NOT NULL,
    signer_name     TEXT NOT NULL,
    signer_role     TEXT NOT NULL,
    meaning         TEXT NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    signed_at       TIMESTAMPTZ DEFAULT now()
);

-- Create unique constraint separately to avoid issues with partition references
CREATE UNIQUE INDEX idx_signatures_unique ON signatures (form_response_id, signer_id, meaning);

-- In-app notifications
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) NOT NULL,
    user_id         UUID REFERENCES auth.users(id) NOT NULL,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT,
    link            TEXT,
    is_read         BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Unblinding events
CREATE TABLE unblinding_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) NOT NULL,
    participant_id  UUID REFERENCES participants(id) NOT NULL,
    reason          TEXT NOT NULL,
    unblinded_by    UUID REFERENCES auth.users(id) NOT NULL,
    disclosed_to    TEXT[],
    created_at      TIMESTAMPTZ DEFAULT now()
);
