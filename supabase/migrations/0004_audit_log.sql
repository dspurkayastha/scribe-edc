-- ══════════════════════════════════════════════════════════════
-- Migration 0004: Audit Log
-- Append-only audit trail with partitioning and triggers
-- ══════════════════════════════════════════════════════════════

-- Audit log table (partitioned by changed_at for retention management)
CREATE TABLE audit_log (
    id              UUID DEFAULT gen_random_uuid(),
    study_id        UUID,
    table_name      TEXT NOT NULL,
    record_id       UUID NOT NULL,
    action          TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data        JSONB,
    new_data        JSONB,
    changed_fields  TEXT[],
    reason          TEXT,
    changed_by      UUID,
    ip_address      INET,
    user_agent      TEXT,
    changed_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (id, changed_at)
) PARTITION BY RANGE (changed_at);

-- Create partitions for 2026-2030 (half-year intervals)
CREATE TABLE audit_log_2026_h1 PARTITION OF audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-07-01');
CREATE TABLE audit_log_2026_h2 PARTITION OF audit_log
    FOR VALUES FROM ('2026-07-01') TO ('2027-01-01');
CREATE TABLE audit_log_2027_h1 PARTITION OF audit_log
    FOR VALUES FROM ('2027-01-01') TO ('2027-07-01');
CREATE TABLE audit_log_2027_h2 PARTITION OF audit_log
    FOR VALUES FROM ('2027-07-01') TO ('2028-01-01');
CREATE TABLE audit_log_2028_h1 PARTITION OF audit_log
    FOR VALUES FROM ('2028-01-01') TO ('2028-07-01');
CREATE TABLE audit_log_2028_h2 PARTITION OF audit_log
    FOR VALUES FROM ('2028-07-01') TO ('2029-01-01');
CREATE TABLE audit_log_2029_h1 PARTITION OF audit_log
    FOR VALUES FROM ('2029-01-01') TO ('2029-07-01');
CREATE TABLE audit_log_2029_h2 PARTITION OF audit_log
    FOR VALUES FROM ('2029-07-01') TO ('2030-01-01');
CREATE TABLE audit_log_2030_h1 PARTITION OF audit_log
    FOR VALUES FROM ('2030-01-01') TO ('2030-07-01');
CREATE TABLE audit_log_2030_h2 PARTITION OF audit_log
    FOR VALUES FROM ('2030-07-01') TO ('2031-01-01');

-- JSONB diff function — returns only changed fields
CREATE OR REPLACE FUNCTION jsonb_diff(old_val JSONB, new_val JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
    SELECT COALESCE(
        jsonb_object_agg(key, new_val -> key),
        '{}'::jsonb
    )
    FROM jsonb_each(new_val)
    WHERE new_val -> key IS DISTINCT FROM old_val -> key;
$$;

-- Audit trigger function — captures reason-for-change
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_study_id UUID;
    v_changed TEXT[];
    v_reason TEXT;
BEGIN
    -- Extract study_id if present
    IF TG_OP = 'DELETE' THEN
        v_study_id := CASE WHEN to_jsonb(OLD) ? 'study_id' THEN (to_jsonb(OLD)->>'study_id')::UUID ELSE NULL END;
    ELSE
        v_study_id := CASE WHEN to_jsonb(NEW) ? 'study_id' THEN (to_jsonb(NEW)->>'study_id')::UUID ELSE NULL END;
    END IF;

    -- Extract changed field names for UPDATE
    IF TG_OP = 'UPDATE' THEN
        SELECT array_agg(key) INTO v_changed
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key;
    END IF;

    -- Extract reason from session variable
    v_reason := current_setting('app.reason_for_change', true);

    INSERT INTO audit_log (study_id, table_name, record_id, action, old_data, new_data, changed_fields, reason, changed_by, changed_at)
    VALUES (
        v_study_id,
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        v_changed,
        v_reason,
        auth.uid(),
        now()
    );

    -- Clear session variable
    PERFORM set_config('app.reason_for_change', '', true);

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Apply audit triggers to all data tables
CREATE TRIGGER audit_participants
    AFTER INSERT OR UPDATE OR DELETE ON participants
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_form_responses
    AFTER INSERT OR UPDATE OR DELETE ON form_responses
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_randomization
    AFTER INSERT OR UPDATE OR DELETE ON randomization_allocations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_adverse_events
    AFTER INSERT OR UPDATE OR DELETE ON adverse_events
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_data_queries
    AFTER INSERT OR UPDATE OR DELETE ON data_queries
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_signatures
    AFTER INSERT ON signatures
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
