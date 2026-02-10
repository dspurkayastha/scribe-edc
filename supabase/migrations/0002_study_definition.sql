-- ══════════════════════════════════════════════════════════════
-- Migration 0002: Study Definition Tables
-- All configuration/metadata tables for study setup
-- ══════════════════════════════════════════════════════════════

-- Clinical study / trial
CREATE TABLE studies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name            TEXT NOT NULL,
    short_name      TEXT NOT NULL,
    slug            TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
    protocol_id     TEXT,
    id_prefix       TEXT NOT NULL CHECK (id_prefix ~ '^[A-Z0-9-]+$'),
    study_type      TEXT NOT NULL DEFAULT 'parallel_rct'
                    CHECK (study_type IN (
                        'parallel_rct', 'crossover_rct', 'factorial',
                        'cluster_rct', 'single_arm', 'observational',
                        'case_control', 'registry'
                    )),
    target_sample   INTEGER,
    status          TEXT DEFAULT 'setup'
                    CHECK (status IN ('setup', 'recruiting', 'paused', 'closed', 'archived')),
    settings        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, slug)
);

CREATE TRIGGER set_updated_at_studies
    BEFORE UPDATE ON studies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Sites within a study
CREATE TABLE study_sites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    name        TEXT NOT NULL,
    code        TEXT NOT NULL CHECK (code ~ '^[A-Z0-9]+$'),
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, code)
);

-- Study arms
CREATE TABLE study_arms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    name        TEXT NOT NULL,
    label       TEXT NOT NULL,
    allocation  NUMERIC DEFAULT 1,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, name)
);

-- Study periods (for cross-over designs)
CREATE TABLE study_periods (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    name        TEXT NOT NULL,
    label       TEXT NOT NULL,
    period_type TEXT NOT NULL
                CHECK (period_type IN ('treatment', 'washout', 'run_in', 'follow_up')),
    duration_days INTEGER,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, name)
);

-- Strata for stratified randomization
CREATE TABLE study_strata (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    name        TEXT NOT NULL,
    label       TEXT NOT NULL,
    rule        TEXT,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, name)
);

-- External option lists
CREATE TABLE option_lists (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE,
    slug        TEXT NOT NULL,
    label       TEXT NOT NULL,
    options     JSONB NOT NULL,
    is_searchable BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_option_lists_unique_slug
    ON option_lists (COALESCE(study_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

CREATE TRIGGER set_updated_at_option_lists
    BEFORE UPDATE ON option_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Visit/event schedule
CREATE TABLE study_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    arm_id          UUID REFERENCES study_arms(id) ON DELETE SET NULL,
    period_id       UUID REFERENCES study_periods(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    label           TEXT NOT NULL,
    event_type      TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (event_type IN ('scheduled', 'unscheduled', 'repeating', 'as_needed')),
    day_offset      INTEGER,
    anchor          TEXT DEFAULT 'enrollment'
                    CHECK (anchor IN ('enrollment', 'randomization', 'surgery', 'custom')),
    anchor_event_id UUID REFERENCES study_events(id),
    window_before   INTEGER DEFAULT 0,
    window_after    INTEGER DEFAULT 7,
    max_repeats     INTEGER,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, name)
);

-- CRF form definitions (JSON schema)
CREATE TABLE form_definitions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    slug        TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
    title       TEXT NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    schema      JSONB NOT NULL,
    rules       JSONB DEFAULT '[]'::jsonb,
    settings    JSONB DEFAULT '{}'::jsonb,
    is_active   BOOLEAN DEFAULT true,
    is_locked   BOOLEAN DEFAULT false,
    locked_by   UUID REFERENCES auth.users(id),
    locked_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, slug, version)
);

CREATE TRIGGER set_updated_at_form_definitions
    BEFORE UPDATE ON form_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Which forms are collected at which events
CREATE TABLE event_forms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES study_events(id) ON DELETE CASCADE NOT NULL,
    form_id     UUID REFERENCES form_definitions(id) ON DELETE CASCADE NOT NULL,
    is_required BOOLEAN DEFAULT true,
    sort_order  INTEGER DEFAULT 0,
    UNIQUE(event_id, form_id)
);

-- Eligibility criteria
CREATE TABLE eligibility_criteria (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    label       TEXT NOT NULL,
    rule        TEXT NOT NULL,
    type        TEXT DEFAULT 'inclusion'
                CHECK (type IN ('inclusion', 'exclusion')),
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Randomization configuration
CREATE TABLE randomization_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) ON DELETE CASCADE UNIQUE NOT NULL,
    method          TEXT NOT NULL
                    CHECK (method IN ('simple', 'block', 'stratified_block', 'minimization', 'cluster')),
    block_sizes     INTEGER[],
    allocation_unit TEXT DEFAULT 'participant'
                    CHECK (allocation_unit IN ('participant', 'site', 'cluster')),
    password_hash   TEXT,
    settings        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Randomization sequence (pre-generated)
CREATE TABLE randomization_sequence (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    stratum_id      UUID REFERENCES study_strata(id) ON DELETE SET NULL,
    sequence_number INTEGER NOT NULL,
    arm_id          UUID REFERENCES study_arms(id) NOT NULL,
    used_at         TIMESTAMPTZ,
    used_by         UUID REFERENCES auth.users(id),
    participant_id  UUID,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, stratum_id, sequence_number)
);

-- Notification rules (per-study)
CREATE TABLE notification_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    event_type  TEXT NOT NULL,
    channel     TEXT NOT NULL DEFAULT 'in_app'
                CHECK (channel IN ('in_app', 'email', 'both')),
    recipients  TEXT NOT NULL DEFAULT 'pi'
                CHECK (recipients IN ('pi', 'co_investigator', 'all_staff', 'site_coordinator', 'monitor', 'custom')),
    custom_user_ids UUID[],
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now()
);
