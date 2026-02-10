-- ══════════════════════════════════════════════════════════════
-- Seed Data: Test organization, study, and sample form definition
-- Run with: psql -f supabase/seed/seed.sql
-- ══════════════════════════════════════════════════════════════

-- Test Organization
INSERT INTO organizations (id, name, slug, settings)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Demo Research Institute',
    'demo-research',
    '{"timezone": "America/New_York"}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Test Study
INSERT INTO studies (id, organization_id, name, short_name, slug, protocol_id, id_prefix, study_type, target_sample, status, settings)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Demo Parallel-Group RCT',
    'DEMO-RCT',
    'demo-rct',
    'DEMO/2026/001',
    'DRC',
    'parallel_rct',
    100,
    'recruiting',
    '{"timezone": "America/New_York", "require_reason_for_change": true, "randomization_enabled": true, "longitudinal": true}'::jsonb
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Study Sites
INSERT INTO study_sites (id, study_id, name, code) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Main Hospital', 'MH'),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Community Clinic', 'CC')
ON CONFLICT (study_id, code) DO NOTHING;

-- Study Arms
INSERT INTO study_arms (id, study_id, name, label, allocation, sort_order) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Control', 'Standard Treatment', 1, 0),
    ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Experimental', 'New Treatment', 1, 1)
ON CONFLICT (study_id, name) DO NOTHING;

-- Study Events
INSERT INTO study_events (id, study_id, name, label, event_type, day_offset, window_before, window_after, sort_order) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'screening', 'Screening', 'scheduled', 0, 0, 7, 0),
    ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'baseline', 'Baseline', 'scheduled', 0, 0, 3, 1),
    ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'd30', 'Day 30 Follow-up', 'scheduled', 30, 3, 7, 2),
    ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'd90', 'Day 90 Follow-up', 'scheduled', 90, 7, 14, 3),
    ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'unscheduled', 'Unscheduled Visit', 'unscheduled', NULL, 0, 0, 99)
ON CONFLICT (study_id, name) DO NOTHING;

-- Demographics Form Definition
INSERT INTO form_definitions (id, study_id, slug, title, version, schema, settings)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'demographics',
    'Demographics',
    1,
    '{
        "pages": [{
            "id": "page1",
            "title": "Demographics",
            "sections": [{
                "id": "basic_info",
                "title": "Basic Information",
                "fields": [
                    {
                        "id": "full_name",
                        "type": "text",
                        "label": "Full Name",
                        "required": true,
                        "validation": { "minLength": 2, "maxLength": 100 }
                    },
                    {
                        "id": "date_of_birth",
                        "type": "date",
                        "label": "Date of Birth",
                        "required": true
                    },
                    {
                        "id": "age",
                        "type": "integer",
                        "label": "Age (years)",
                        "required": true,
                        "validation": { "min": 0, "max": 120 }
                    },
                    {
                        "id": "sex",
                        "type": "radio",
                        "label": "Sex",
                        "required": true,
                        "options": [
                            { "value": "male", "label": "Male" },
                            { "value": "female", "label": "Female" },
                            { "value": "other", "label": "Other" }
                        ]
                    },
                    {
                        "id": "ethnicity",
                        "type": "dropdown",
                        "label": "Ethnicity",
                        "options": [
                            { "value": "hispanic", "label": "Hispanic or Latino" },
                            { "value": "not_hispanic", "label": "Not Hispanic or Latino" },
                            { "value": "unknown", "label": "Unknown" }
                        ]
                    },
                    {
                        "id": "phone",
                        "type": "text",
                        "label": "Phone Number",
                        "placeholder": "+1 (555) 000-0000"
                    },
                    {
                        "id": "email",
                        "type": "text",
                        "label": "Email",
                        "validation": { "pattern": "^[^@]+@[^@]+\\.[^@]+$", "patternMessage": "Invalid email" }
                    }
                ]
            }]
        }]
    }'::jsonb,
    '{"require_signature": false, "allow_partial_save": true}'::jsonb
) ON CONFLICT (study_id, slug, version) DO NOTHING;

-- Vitals Form Definition
INSERT INTO form_definitions (id, study_id, slug, title, version, schema, settings)
VALUES (
    'f0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'vitals',
    'Vital Signs',
    1,
    '{
        "pages": [{
            "id": "page1",
            "title": "Vital Signs",
            "sections": [{
                "id": "vitals",
                "title": "Measurements",
                "fields": [
                    {
                        "id": "weight",
                        "type": "number",
                        "label": "Weight (kg)",
                        "required": true,
                        "validation": { "min": 20, "max": 300 }
                    },
                    {
                        "id": "height",
                        "type": "number",
                        "label": "Height (cm)",
                        "required": true,
                        "validation": { "min": 50, "max": 250 }
                    },
                    {
                        "id": "bmi",
                        "type": "calculated",
                        "label": "BMI",
                        "expression": "round({weight} / ({height}/100)^2, 1)",
                        "dependsOn": ["weight", "height"]
                    },
                    {
                        "id": "systolic_bp",
                        "type": "integer",
                        "label": "Systolic BP (mmHg)",
                        "required": true,
                        "validation": { "min": 60, "max": 300 }
                    },
                    {
                        "id": "diastolic_bp",
                        "type": "integer",
                        "label": "Diastolic BP (mmHg)",
                        "required": true,
                        "validation": { "min": 30, "max": 200 }
                    },
                    {
                        "id": "heart_rate",
                        "type": "integer",
                        "label": "Heart Rate (bpm)",
                        "required": true,
                        "validation": { "min": 30, "max": 250 }
                    },
                    {
                        "id": "temperature",
                        "type": "number",
                        "label": "Temperature (°C)",
                        "validation": { "min": 34, "max": 42 },
                        "step": 0.1
                    },
                    {
                        "id": "notes",
                        "type": "textarea",
                        "label": "Notes",
                        "rows": 3
                    }
                ]
            }]
        }]
    }'::jsonb,
    '{"require_signature": false, "allow_partial_save": true}'::jsonb
) ON CONFLICT (study_id, slug, version) DO NOTHING;

-- Assign forms to events
INSERT INTO event_forms (event_id, form_id, is_required, sort_order) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', true, 0),
    ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', true, 0),
    ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', true, 0),
    ('e0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002', true, 0)
ON CONFLICT (event_id, form_id) DO NOTHING;
