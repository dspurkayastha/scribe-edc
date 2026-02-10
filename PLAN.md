# SCRIBE EDC Platform — v2 Greenfield Plan

## Universal, Trial-Agnostic Clinical Research EDC

> **SCRIBE** = Study Capture, Reporting, Integrity & Backend Engine
>
> **This is a new project, new repo.** MC-LASER continues on its current dedicated EDC. This platform is designed from scratch for any clinical trial, any study design, any institution.

**Document version**: 2.0
**Created**: 2026-02-10
**Authors**: Dev + Claude (SCRIBE EDC)
**Status**: Draft — awaiting review

---

## Table of Contents

1. [Vision & Scope](#1-vision--scope)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Database Design](#4-database-design)
5. [Form Engine](#5-form-engine)
6. [Expression Engine](#6-expression-engine)
7. [Longitudinal & Event System](#7-longitudinal--event-system)
8. [Randomization Engine](#8-randomization-engine)
9. [Multi-Tenancy & Access Control](#9-multi-tenancy--access-control)
10. [Routing & Navigation](#10-routing--navigation)
11. [Monitoring, Reporting & Export](#11-monitoring-reporting--export)
12. [Notification System](#12-notification-system)
13. [Regulatory Compliance (21 CFR Part 11)](#13-regulatory-compliance-21-cfr-part-11)
14. [Performance & Scalability](#14-performance--scalability)
15. [Edge Cases & Mitigations](#15-edge-cases--mitigations)
16. [Phase Roadmap](#16-phase-roadmap)
17. [Repo Structure](#17-repo-structure)
18. [Competitive Positioning](#18-competitive-positioning)

---

## 1. Vision & Scope

### What SCRIBE Is

A **free, open-source, cloud-native EDC platform** that can run any clinical research study — from a 20-patient single-arm observational study to a 10,000-patient multi-site, multi-arm RCT. It replaces REDCap with a modern stack while matching (and exceeding) its configurability.

### What SCRIBE Is Not

- Not a migration of MC-LASER. That trial runs independently on its own codebase.
- Not a general-purpose survey tool. Every design decision prioritizes clinical data integrity, regulatory compliance, and audit trail completeness.
- Not an EHR/EMR. SCRIBE captures research data alongside clinical care, not clinical care itself.

### Supported Study Designs

| Study Design | Support Level | Phase |
|---|---|---|
| Parallel-group RCT | Full | 1 |
| Single-arm interventional | Full | 1 |
| Observational cohort | Full | 1 |
| Case-control | Full | 1 |
| Cross-over RCT | Full (periods + washout) | 3 |
| Factorial design | Full (composite arms) | 3 |
| Cluster-randomized | Full (site-level allocation) | 4 |
| Registry / data bank | Full (open-ended enrollment) | 2 |
| Adaptive / MAMS | Partial (arm dropping) | 6 |

### Design Principles

1. **Configuration over code** — Every study-specific element is data in a database, not logic in source code
2. **Regulatory by default** — Audit trail, reason-for-change, form locking, and e-signatures ship in Phase 1, not bolted on later
3. **Performance at scale** — Designed for 100K+ form responses from day 1 (partitioning, materialized views, connection pooling)
4. **Progressive complexity** — A simple single-arm study uses 10% of the features. Complexity is opt-in, never forced.
5. **Zero trust on client** — All validation runs server-side. Client-side validation is UX sugar.

---

## 2. Architecture

### 2.1 Conceptual Layers

```
┌──────────────────────────────────────────────────────────────┐
│                      SCRIBE Platform                          │
├─────────────┬───────────────┬────────────────────────────────┤
│  Layer 4    │  Presentation │  Next.js pages, form renderer, │
│  (UI)       │               │  dashboard, PDF export          │
├─────────────┼───────────────┼────────────────────────────────┤
│  Layer 3    │  Study Data   │  Participants, form responses,  │
│  (runtime)  │               │  AEs, randomization allocations,│
│             │               │  audit log, signatures          │
├─────────────┼───────────────┼────────────────────────────────┤
│  Layer 2    │  Study        │  Protocol definition, CRF       │
│  (config)   │  Definition   │  schemas, visit schedule, arms, │
│             │               │  strata, eligibility, option    │
│             │               │  lists, notification rules      │
├─────────────┼───────────────┼────────────────────────────────┤
│  Layer 1    │  Platform     │  Auth, roles, multi-tenancy,    │
│  (core)     │  Core         │  form engine, expression engine,│
│             │               │  audit framework, export engine,│
│             │               │  notification router, API       │
└─────────────┴───────────────┴────────────────────────────────┘
```

### 2.2 Data Flow

```
Study Admin defines:
  study → arms → strata → events → forms → fields
         ↓
Form Engine renders:
  JSON schema → dynamic Zod → React form → server validation → JSONB storage
         ↓
Audit System captures:
  every INSERT/UPDATE → append-only log with WHO/WHAT/WHEN/WHY
         ↓
Export Engine outputs:
  JSONB → CSV | SPSS | Stata | CDISC ODM (via JSON_TABLE)
```

---

## 3. Tech Stack

### 3.1 Core Stack (locked for v2)

| Technology | Version | Role | Why |
|---|---|---|---|
| **Next.js** | 16.x | Full-stack framework | Turbopack (50-60% faster builds), React 19, Server Components, Server Actions, async route params |
| **React** | 19.x | UI library | Server Components, Suspense, use() hook, improved concurrent rendering |
| **TypeScript** | 6.x | Type safety | Bridge release; `--moduleResolution bundler`; ready for TS 7 native perf |
| **Tailwind CSS** | 4.x | Styling | CSS-first configuration, faster builds, improved composability |
| **shadcn/ui** | latest | Component library | Accessible, customizable, Tailwind-native, Radix primitives |
| **Supabase** | latest | Database + Auth + RLS + Realtime + Storage | PostgreSQL 17, RLS built-in, Auth hooks, Realtime subscriptions, generous free tier, self-hostable |
| **PostgreSQL** | 17 | Database | `JSON_TABLE()`, `JSON_EXISTS()`, `JSON_VALUE()` for JSONB; parallel BRIN indexes; 2x write throughput |
| **Zod** | 3.x | Validation | Dynamic schema generation from form definitions; runtime type inference |
| **react-hook-form** | 7.x | Form state | Battle-tested, great DX, Zod resolver integration |
| **filtrex** | 2.x | Expression engine | Safe expression evaluation; compiles to JS functions; no eval/Function; never throws during execution |
| **Vitest** | 2.x | Unit testing | Fast, ESM-native, coverage built-in |
| **Playwright** | 1.58+ | E2E testing | Cross-browser, network interception, auth state persistence |

### 3.2 Additional Dependencies

| Technology | Role | Why |
|---|---|---|
| **@react-pdf/renderer** | PDF export | Dynamic CRF PDFs from form schemas |
| **Supabase Realtime** | Live updates | Dashboard enrollment counts, form status, query notifications |
| **Supabase Storage** | File uploads | Consent documents, source documents, images |
| **Resend** | Transactional email | SAE alerts, query notifications, password resets |
| **PgBouncer** | Connection pooling | Supabase includes this; configure pool mode = transaction |
| **pg_jsonschema** | DB-level JSON validation | Validate JSONB data against form schema at database layer |

### 3.3 Evaluate Later

| Technology | When | Why |
|---|---|---|
| SurveyJS Creator | Phase 2 | Visual drag-and-drop form builder (evaluate vs. custom) |
| Supabase Edge Functions | Phase 5 | Scheduled reports, email digests, cron jobs |
| OpenTelemetry | Phase 5 | Observability, latency tracking at scale |
| Service Worker + IndexedDB | Phase 6 | Offline-first PWA for field data collection |

### 3.4 Explicitly Rejected

| Technology | Why Not |
|---|---|
| Dynamic DDL (CREATE TABLE per form) | Fragile, unpredictable schemas, impossible RLS |
| GraphQL | Unnecessary complexity; PostgREST + Server Actions sufficient |
| Prisma / Drizzle ORM | Conflicts with Supabase RLS patterns; no added value |
| MongoDB | No ACID for audit trail; PostgreSQL JSONB gives us the best of both |
| Next.js 14 / React 18 | Two major versions behind; missing Turbopack, async params, React 19 features |

---

## 4. Database Design

### 4.1 Design Philosophy

- **Fixed schema** for platform tables — typed columns, proper constraints
- **JSONB** for study data — form responses stored as flexible documents
- **PostgreSQL 17 JSON functions** — `JSON_TABLE()` for performant JSONB → relational queries in exports/dashboards
- **Partitioning** — `form_responses` partitioned by `study_id` for tenant isolation at the storage layer
- **Audit everything** — append-only log with reason-for-change from day 1

### 4.2 Core Platform Tables

```sql
-- ══════════════════════════════════════════════════════════════
-- LAYER 1: PLATFORM CORE
-- ══════════════════════════════════════════════════════════════

-- Organization (institution, research group, company)
CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
    logo_url    TEXT,
    settings    JSONB DEFAULT '{}',    -- timezone, locale defaults
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- User profile (global, not study-specific)
CREATE TABLE user_profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT NOT NULL,
    phone       TEXT,
    avatar_url  TEXT,
    preferences JSONB DEFAULT '{}',    -- UI prefs: theme, locale, notification settings
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
```

### 4.3 Study Definition Tables

```sql
-- ══════════════════════════════════════════════════════════════
-- LAYER 2: STUDY DEFINITION (configuration)
-- ══════════════════════════════════════════════════════════════

-- Clinical study / trial
CREATE TABLE studies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name            TEXT NOT NULL,              -- "M-C-LASER Trial"
    short_name      TEXT NOT NULL,              -- "MC-LASER"
    protocol_id     TEXT,                       -- "CTRI/2026/01/123456"
    id_prefix       TEXT NOT NULL CHECK (id_prefix ~ '^[A-Z0-9-]+$'),
    study_type      TEXT NOT NULL DEFAULT 'parallel_rct'
                    CHECK (study_type IN (
                        'parallel_rct', 'crossover_rct', 'factorial',
                        'cluster_rct', 'single_arm', 'observational',
                        'case_control', 'registry'
                    )),
    target_sample   INTEGER,                   -- NULL = open-ended (registries)
    status          TEXT DEFAULT 'setup'
                    CHECK (status IN ('setup', 'recruiting', 'paused', 'closed', 'archived')),
    settings        JSONB DEFAULT '{}'::jsonb,
    -- settings contains:
    --   locale: "en-IN"
    --   timezone: "Asia/Kolkata"
    --   institution: "IPGME&R, Kolkata"
    --   require_reason_for_change: true
    --   randomization_enabled: true
    --   longitudinal: true
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Sites within a study (multi-center / Data Access Groups)
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
    name        TEXT NOT NULL,              -- "Control"
    label       TEXT NOT NULL,              -- "Standard hemorrhoidectomy"
    allocation  NUMERIC DEFAULT 1,         -- allocation ratio weight (1:1 = equal)
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, name)
);

-- Study periods (for cross-over designs)
CREATE TABLE study_periods (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    name        TEXT NOT NULL,              -- "Period 1", "Washout", "Period 2"
    label       TEXT NOT NULL,
    period_type TEXT NOT NULL
                CHECK (period_type IN ('treatment', 'washout', 'run_in', 'follow_up')),
    duration_days INTEGER,                 -- NULL = variable
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
    rule        TEXT,                       -- filtrex expression: "{demographics.goligher_grade} == 'II'"
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, name)
);

-- External option lists (ICD codes, drug lists, etc.)
CREATE TABLE option_lists (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE,  -- NULL = global
    slug        TEXT NOT NULL,              -- "icd10", "medications", "institutions"
    label       TEXT NOT NULL,
    options     JSONB NOT NULL,             -- [{ "value": "E11", "label": "Type 2 diabetes" }, ...]
    is_searchable BOOLEAN DEFAULT false,   -- enables autocomplete vs. dropdown
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(COALESCE(study_id, '00000000-0000-0000-0000-000000000000'::uuid), slug)
);

-- Visit/event schedule
CREATE TABLE study_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    arm_id          UUID REFERENCES study_arms(id) ON DELETE SET NULL,  -- NULL = all arms
    period_id       UUID REFERENCES study_periods(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,           -- "screening", "d30", "unscheduled"
    label           TEXT NOT NULL,           -- "Day 30 Follow-up"
    event_type      TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (event_type IN ('scheduled', 'unscheduled', 'repeating', 'as_needed')),
    day_offset      INTEGER,                -- days from anchor (NULL for unscheduled/as_needed)
    anchor          TEXT DEFAULT 'enrollment'
                    CHECK (anchor IN ('enrollment', 'randomization', 'surgery', 'custom')),
    anchor_event_id UUID REFERENCES study_events(id),  -- for custom anchor
    window_before   INTEGER DEFAULT 0,
    window_after    INTEGER DEFAULT 7,
    max_repeats     INTEGER,                -- NULL = unlimited (for repeating events)
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
    schema      JSONB NOT NULL,             -- field definitions, sections, pages
    rules       JSONB DEFAULT '[]'::jsonb,  -- branching logic, calculations, validations
    settings    JSONB DEFAULT '{}'::jsonb,
    -- settings contains:
    --   require_signature: false
    --   allow_partial_save: true
    --   auto_calculate: true
    --   visibility_roles: ["pi", "co_investigator"]  -- form-level permissions
    is_active   BOOLEAN DEFAULT true,
    is_locked   BOOLEAN DEFAULT false,      -- locked after data collection starts
    locked_by   UUID REFERENCES auth.users(id),
    locked_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, slug, version)
);

-- Which forms are collected at which events
CREATE TABLE event_forms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES study_events(id) ON DELETE CASCADE NOT NULL,
    form_id     UUID REFERENCES form_definitions(id) ON DELETE CASCADE NOT NULL,
    is_required BOOLEAN DEFAULT true,
    sort_order  INTEGER DEFAULT 0,
    UNIQUE(event_id, form_id)
);

-- Eligibility criteria (expression-based)
CREATE TABLE eligibility_criteria (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    label       TEXT NOT NULL,              -- "Age 18-70"
    rule        TEXT NOT NULL,              -- "{demographics.age} >= 18 and {demographics.age} <= 70"
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
    block_sizes     INTEGER[],              -- [4, 6] for permuted blocks
    allocation_unit TEXT DEFAULT 'participant'
                    CHECK (allocation_unit IN ('participant', 'site', 'cluster')),
    password_hash   TEXT,                   -- bcrypt hash for randomization password
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
    participant_id  UUID,                   -- set when allocated
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, stratum_id, sequence_number)
);
-- Performance index for allocation lookup
CREATE INDEX idx_rand_seq_next ON randomization_sequence (study_id, stratum_id, sequence_number)
    WHERE used_at IS NULL;

-- Notification rules (per-study)
CREATE TABLE notification_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    event_type  TEXT NOT NULL,              -- "sae_reported", "query_created", "visit_overdue", "form_locked"
    channel     TEXT NOT NULL DEFAULT 'in_app'
                CHECK (channel IN ('in_app', 'email', 'both')),
    recipients  TEXT NOT NULL DEFAULT 'pi'
                CHECK (recipients IN ('pi', 'co_investigator', 'all_staff', 'site_coordinator', 'monitor', 'custom')),
    custom_user_ids UUID[],                -- when recipients = 'custom'
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 4.4 Study Data Tables (runtime)

```sql
-- ══════════════════════════════════════════════════════════════
-- LAYER 3: STUDY DATA (runtime — partitioned by study_id)
-- ══════════════════════════════════════════════════════════════

-- User-study membership
CREATE TABLE study_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    site_id     UUID REFERENCES study_sites(id) ON DELETE SET NULL,  -- NULL = all sites
    role        TEXT NOT NULL
                CHECK (role IN ('pi', 'co_investigator', 'data_entry', 'read_only', 'monitor')),
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, user_id)
);

-- Participants (generic — zero study-specific columns)
CREATE TABLE participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
    site_id         UUID REFERENCES study_sites(id) ON DELETE SET NULL,
    study_number    TEXT NOT NULL,           -- "MCL-001" (auto from id_prefix + sequence)
    status          TEXT DEFAULT 'screening'
                    CHECK (status IN (
                        'screening', 'eligible', 'ineligible',
                        'enrolled', 'randomized', 'on_treatment',
                        'completed', 'withdrawn', 'lost_to_followup',
                        'screen_failure'
                    )),
    enrolled_at     TIMESTAMPTZ,
    created_by      UUID REFERENCES auth.users(id),
    deleted_at      TIMESTAMPTZ,            -- soft delete
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, study_number)
);

-- Form responses — THE universal data store
-- Partitioned by study_id for multi-tenant performance
CREATE TABLE form_responses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) NOT NULL,
    participant_id  UUID REFERENCES participants(id) NOT NULL,
    form_id         UUID REFERENCES form_definitions(id) NOT NULL,
    form_version    INTEGER NOT NULL,
    event_id        UUID REFERENCES study_events(id),
    instance_number INTEGER DEFAULT 1,       -- for repeating events (visit 1, visit 2, etc.)
    data            JSONB NOT NULL DEFAULT '{}'::jsonb,
    status          TEXT DEFAULT 'draft'
                    CHECK (status IN ('draft', 'complete', 'verified', 'locked', 'signed')),
    completed_by    UUID REFERENCES auth.users(id),
    completed_at    TIMESTAMPTZ,
    verified_by     UUID REFERENCES auth.users(id),
    verified_at     TIMESTAMPTZ,
    locked_by       UUID REFERENCES auth.users(id),
    locked_at       TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ DEFAULT now(),  -- for optimistic locking
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(participant_id, form_id, form_version, event_id, instance_number)
) PARTITION BY HASH (study_id);

-- Create 16 partitions (scales well up to millions of rows)
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
    participant_id  UUID REFERENCES participants(id) NOT NULL UNIQUE,
    arm_id          UUID REFERENCES study_arms(id) NOT NULL,
    stratum_id      UUID REFERENCES study_strata(id),
    sequence_id     UUID REFERENCES randomization_sequence(id),
    period_id       UUID REFERENCES study_periods(id),   -- for cross-over: which period
    randomized_by   UUID REFERENCES auth.users(id) NOT NULL,
    randomized_at   TIMESTAMPTZ DEFAULT now()
);

-- Adverse events (ICH-GCP standard structure)
CREATE TABLE adverse_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) NOT NULL,
    participant_id  UUID REFERENCES participants(id) NOT NULL,
    event_number    INTEGER NOT NULL,        -- sequential per participant
    description     TEXT NOT NULL,
    onset_date      DATE NOT NULL CHECK (onset_date <= CURRENT_DATE),
    resolution_date DATE CHECK (resolution_date IS NULL OR resolution_date >= onset_date),
    severity        TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
    relatedness     TEXT NOT NULL CHECK (relatedness IN (
                        'unrelated', 'unlikely', 'possible', 'probable', 'definite'
                    )),
    outcome         TEXT NOT NULL CHECK (outcome IN (
                        'resolved', 'ongoing', 'resolved_with_sequelae', 'fatal', 'unknown'
                    )),
    is_sae          BOOLEAN DEFAULT false,
    sae_criteria    TEXT[],                  -- which SAE criteria apply
    sae_reported_at TIMESTAMPTZ,
    sae_acknowledged_by UUID REFERENCES auth.users(id),
    sae_acknowledged_at TIMESTAMPTZ,
    reported_by     UUID REFERENCES auth.users(id) NOT NULL,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(study_id, participant_id, event_number)
);

-- Data queries (discrepancy management)
CREATE TABLE data_queries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) NOT NULL,
    participant_id  UUID REFERENCES participants(id) NOT NULL,
    form_response_id UUID REFERENCES form_responses(id),
    field_id        TEXT,                    -- which field has the issue
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

-- Query responses (threaded conversation)
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
    form_response_id UUID REFERENCES form_responses(id) NOT NULL,
    signer_id       UUID REFERENCES auth.users(id) NOT NULL,
    signer_name     TEXT NOT NULL,           -- full name at time of signing
    signer_role     TEXT NOT NULL,           -- role at time of signing
    meaning         TEXT NOT NULL,           -- "I certify this data is accurate and complete"
    ip_address      INET,
    user_agent      TEXT,
    signed_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(form_response_id, signer_id, meaning)
);

-- In-app notifications
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) NOT NULL,
    user_id         UUID REFERENCES auth.users(id) NOT NULL,
    type            TEXT NOT NULL,            -- "sae_alert", "query_assigned", "visit_overdue"
    title           TEXT NOT NULL,
    body            TEXT,
    link            TEXT,                     -- relative URL to navigate to
    is_read         BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Unblinding events (for emergency unblinding)
CREATE TABLE unblinding_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id        UUID REFERENCES studies(id) NOT NULL,
    participant_id  UUID REFERENCES participants(id) NOT NULL,
    reason          TEXT NOT NULL,
    unblinded_by    UUID REFERENCES auth.users(id) NOT NULL,
    disclosed_to    TEXT[],                  -- who was told the allocation
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- AUDIT LOG (append-only, partitioned by month)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
    id              UUID DEFAULT gen_random_uuid(),
    study_id        UUID,
    table_name      TEXT NOT NULL,
    record_id       UUID NOT NULL,
    action          TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data        JSONB,
    new_data        JSONB,
    changed_fields  TEXT[],                  -- which fields actually changed (for UPDATE)
    reason          TEXT,                    -- reason for change (required for completed forms)
    changed_by      UUID,
    ip_address      INET,
    user_agent      TEXT,
    changed_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (id, changed_at)
) PARTITION BY RANGE (changed_at);

-- Create partitions for the next 5 years
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
```

### 4.5 Indexing Strategy

```sql
-- Critical indexes for query performance and RLS
CREATE INDEX idx_form_responses_study       ON form_responses (study_id);
CREATE INDEX idx_form_responses_participant ON form_responses (participant_id);
CREATE INDEX idx_form_responses_form        ON form_responses (form_id);
CREATE INDEX idx_form_responses_event       ON form_responses (event_id);
CREATE INDEX idx_form_responses_status      ON form_responses (study_id, status);
CREATE INDEX idx_form_responses_data        ON form_responses USING GIN (data);

CREATE INDEX idx_participants_study         ON participants (study_id);
CREATE INDEX idx_participants_study_number  ON participants (study_id, study_number);
CREATE INDEX idx_participants_status        ON participants (study_id, status);

CREATE INDEX idx_study_members_user         ON study_members (user_id);
CREATE INDEX idx_study_members_study        ON study_members (study_id);
CREATE INDEX idx_study_members_active       ON study_members (study_id, user_id) WHERE is_active = true;

CREATE INDEX idx_audit_log_study            ON audit_log (study_id, changed_at);
CREATE INDEX idx_audit_log_record           ON audit_log (record_id, changed_at);

CREATE INDEX idx_notifications_user         ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX idx_data_queries_study         ON data_queries (study_id, status);
CREATE INDEX idx_adverse_events_sae         ON adverse_events (study_id) WHERE is_sae = true;
```

### 4.6 Audit Trigger

```sql
-- JSONB diff function — stores only changed fields
CREATE OR REPLACE FUNCTION jsonb_diff(old_val JSONB, new_val JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
    SELECT COALESCE(
        jsonb_object_agg(key, new_val -> key),
        '{}'::jsonb
    )
    FROM jsonb_each(new_val)
    WHERE new_val -> key IS DISTINCT FROM old_val -> key;
$$;

-- Audit trigger — captures reason-for-change
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
        v_study_id := CASE WHEN OLD ? 'study_id' THEN (OLD->>'study_id')::UUID ELSE NULL END;
    ELSE
        v_study_id := CASE WHEN to_jsonb(NEW) ? 'study_id' THEN (to_jsonb(NEW)->>'study_id')::UUID ELSE NULL END;
    END IF;

    -- Extract changed field names for UPDATE
    IF TG_OP = 'UPDATE' THEN
        SELECT array_agg(key) INTO v_changed
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key;
    END IF;

    -- Extract reason from session variable (set by application before UPDATE)
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

-- Apply to all data tables
CREATE TRIGGER audit_participants     AFTER INSERT OR UPDATE OR DELETE ON participants     FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_form_responses   AFTER INSERT OR UPDATE OR DELETE ON form_responses   FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_randomization    AFTER INSERT OR UPDATE OR DELETE ON randomization_allocations FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_adverse_events   AFTER INSERT OR UPDATE OR DELETE ON adverse_events   FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_data_queries     AFTER INSERT OR UPDATE OR DELETE ON data_queries     FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_signatures       AFTER INSERT ON signatures FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
```

### 4.7 JWT Claims Optimization

```sql
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
```

---

## 5. Form Engine

### 5.1 Form Schema Specification

Every CRF is defined as a JSON document in `form_definitions.schema`. The schema supports **pages**, **sections**, **repeating groups**, and **external option lists** — all gaps identified in the v1 audit.

```typescript
// ══════════════════════════════════════════════════════════════
// COMPLETE FORM SCHEMA INTERFACE
// ══════════════════════════════════════════════════════════════

interface FormSchema {
  pages: Page[];                    // top-level pagination (NEW in v2)
}

interface Page {
  id: string;
  title: string;
  description?: string;
  visibility?: string;              // expression — hide entire page conditionally
  sections: Section[];
}

interface Section {
  id: string;
  title: string;
  description?: string;
  visibility?: string;              // expression — hide entire section
  repeatable?: boolean;             // NEW: repeating group (medications, surgeries)
  minRepeat?: number;               // default 1
  maxRepeat?: number;               // default 10; null = unlimited
  repeatLabel?: string;             // "Medication #{n}"
  fields: Field[];
}

interface Field {
  id: string;                       // MUST match ^[a-z][a-z0-9_]*$ (enforced)
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean | string;      // boolean or expression
  disabled?: boolean | string;
  visibility?: string;              // expression
  defaultValue?: unknown;

  // Type-specific
  validation?: ValidationRules;
  options?: Option[];               // inline options for radio/checkbox/dropdown
  optionListSlug?: string;          // NEW: reference to option_lists table
  expression?: string;              // for calculated fields
  dependsOn?: string[];             // field IDs this depends on (same form)
  crossFormRef?: string;            // NEW: "{form_slug.field_id}" for cross-form reads
  min?: number;                     // slider, likert
  max?: number;
  step?: number;
  accept?: string;                  // file upload MIME types
  maxFileSize?: number;             // bytes
  rows?: number;                    // textarea
  columns?: MatrixColumn[];         // matrix type
}

type FieldType =
  | 'text' | 'textarea' | 'number' | 'integer'
  | 'date' | 'datetime' | 'time'
  | 'radio' | 'checkbox' | 'dropdown'
  | 'slider' | 'likert' | 'matrix'
  | 'calculated' | 'file' | 'signature'
  | 'descriptive'                   // static text/heading, no data
  | 'lookup';                       // NEW: autocomplete from option_lists

interface Option {
  value: string;
  label: string;
}

interface ValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;                 // regex (max 200 chars, tested for ReDoS safety)
  patternMessage?: string;
  custom?: string;                  // filtrex expression returning boolean
  customMessage?: string;
}

interface MatrixColumn {
  id: string;
  label: string;
  type: 'radio' | 'checkbox' | 'number' | 'text';
  options?: Option[];
}

// Rule definitions (branching logic, calculations, validations)
interface Rule {
  id: string;
  trigger: string;                  // filtrex expression
  action: RuleAction;
  target: string;                   // field ID, section ID, or page ID
  value?: string;                   // expression (for calculate)
  message?: string;                 // for validate/warn/query
}

type RuleAction =
  | 'show' | 'hide'
  | 'require' | 'unrequire'
  | 'enable' | 'disable'
  | 'calculate'
  | 'validate' | 'warn'
  | 'auto_query';                   // auto-create data query
```

### 5.2 Supported Field Types (18 types)

| Type | Renders As | Stored As | Notes |
|---|---|---|---|
| `text` | Text input | `string` | Supports pattern validation |
| `textarea` | Multi-line | `string` | Configurable rows |
| `number` | Numeric input | `number` | min/max, decimal |
| `integer` | Integer input | `integer` | No decimals |
| `date` | Date picker | `string` (ISO) | Timezone-aware display |
| `datetime` | DateTime picker | `string` (ISO) | |
| `time` | Time picker | `string` (HH:MM) | |
| `radio` | Radio group | `string` | Inline or optionListSlug |
| `checkbox` | Checkbox group | `string[]` | |
| `dropdown` | Select/combobox | `string` | |
| `lookup` | Autocomplete | `string` | **NEW**: searches option_lists |
| `slider` | Range slider | `number` | min/max/step |
| `likert` | Likert scale | `number` | |
| `matrix` | Grid | `object` | Rows x columns |
| `calculated` | Read-only | `number \| string` | filtrex expression |
| `file` | File upload | `string` (URL) | Supabase Storage |
| `signature` | Drawing pad | `string` (data URI) | |
| `descriptive` | Static text | — | No data stored |

### 5.3 Repeating Sections Data Model

When `section.repeatable = true`, the data is stored as an array in the JSONB:

```jsonc
// Form schema defines a repeating "medications" section
{
  "pages": [{
    "id": "page1",
    "title": "Medical History",
    "sections": [{
      "id": "medications",
      "title": "Current Medications",
      "repeatable": true,
      "minRepeat": 0,
      "maxRepeat": 20,
      "repeatLabel": "Medication #{n}",
      "fields": [
        { "id": "drug_name", "type": "lookup", "optionListSlug": "medications", "required": true },
        { "id": "dose", "type": "text", "required": true },
        { "id": "frequency", "type": "dropdown", "options": [...] },
        { "id": "start_date", "type": "date" }
      ]
    }]
  }]
}

// Stored in form_responses.data:
{
  "medications": [
    { "drug_name": "Metformin", "dose": "500mg", "frequency": "bd", "start_date": "2025-01-15" },
    { "drug_name": "Atorvastatin", "dose": "20mg", "frequency": "od", "start_date": "2024-06-01" }
  ]
}
```

### 5.4 Dynamic Zod Generation

```typescript
function generateZodSchema(schema: FormSchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const page of schema.pages) {
    for (const section of page.sections) {
      if (section.repeatable) {
        // Repeating section → array of objects
        const itemShape = buildFieldShapes(section.fields);
        let arraySchema = z.array(z.object(itemShape));
        if (section.minRepeat) arraySchema = arraySchema.min(section.minRepeat);
        if (section.maxRepeat) arraySchema = arraySchema.max(section.maxRepeat);
        shape[section.id] = section.minRepeat && section.minRepeat > 0
          ? arraySchema
          : arraySchema.optional();
      } else {
        // Flat section → merge fields into top-level shape
        Object.assign(shape, buildFieldShapes(section.fields));
      }
    }
  }

  return z.object(shape);
}

function buildFieldShapes(fields: Field[]): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    if (field.type === 'descriptive') continue;

    let schema: z.ZodTypeAny;

    switch (field.type) {
      case 'text': case 'textarea':
        schema = z.string();
        if (field.validation?.minLength) schema = (schema as z.ZodString).min(field.validation.minLength);
        if (field.validation?.maxLength) schema = (schema as z.ZodString).max(field.validation.maxLength);
        if (field.validation?.pattern) {
          validateRegexSafety(field.validation.pattern); // ReDoS protection
          schema = (schema as z.ZodString).regex(new RegExp(field.validation.pattern));
        }
        break;
      case 'number': case 'slider': case 'likert':
        schema = z.number();
        if (field.validation?.min !== undefined) schema = (schema as z.ZodNumber).min(field.validation.min);
        if (field.validation?.max !== undefined) schema = (schema as z.ZodNumber).max(field.validation.max);
        break;
      case 'integer':
        schema = z.number().int();
        if (field.validation?.min !== undefined) schema = (schema as z.ZodNumber).min(field.validation.min);
        if (field.validation?.max !== undefined) schema = (schema as z.ZodNumber).max(field.validation.max);
        break;
      case 'date':
        schema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
        break;
      case 'datetime':
        schema = z.string().datetime();
        break;
      case 'time':
        schema = z.string().regex(/^\d{2}:\d{2}$/);
        break;
      case 'radio': case 'dropdown': case 'lookup':
        if (field.options) {
          schema = z.enum(field.options.map(o => o.value) as [string, ...string[]]);
        } else {
          schema = z.string(); // option_list validated server-side
        }
        break;
      case 'checkbox':
        schema = z.array(z.string());
        break;
      case 'matrix':
        schema = z.record(z.string(), z.union([z.string(), z.number()]));
        break;
      case 'calculated':
        schema = z.union([z.string(), z.number()]);
        break;
      case 'file': case 'signature':
        schema = z.string().url();
        break;
      default:
        schema = z.unknown();
    }

    shape[field.id] = field.required === true ? schema : schema.optional().nullable();
  }

  return shape;
}
```

### 5.5 Form Rendering Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│ 1. LOAD (Server Component)                                    │
│    - Fetch form_definitions.schema + rules from DB            │
│    - Fetch existing form_responses.data (if editing)          │
│    - Generate Zod schema                                      │
│    - Detect visible fields (evaluate visibility expressions)  │
│    - Pass serialized config to client                         │
├──────────────────────────────────────────────────────────────┤
│ 2. RENDER (Client Component)                                  │
│    - <FormRenderer schema={schema} rules={rules} data={data}>│
│    - Map each Page → <FormPage>                               │
│    - Map each Section → <FormSection> or <RepeatableSection>  │
│    - Map each Field → <FormField type={field.type}>           │
│    - Wire react-hook-form + Zod resolver                      │
│    - Evaluate visibility rules on field change                │
│    - Compute calculated fields on dependency change           │
│    - Paginated navigation (prev/next/save draft)              │
├──────────────────────────────────────────────────────────────┤
│ 3. SUBMIT (Server Action)                                     │
│    - Validate against Zod schema (server-side)                │
│    - If editing completed form: require reason_for_change     │
│    - Optimistic lock check: compare updated_at                │
│    - Upsert to form_responses.data (JSONB)                    │
│    - Audit trigger fires automatically                        │
│    - Evaluate auto_query rules → create data_queries          │
│    - Return success/error                                     │
└──────────────────────────────────────────────────────────────┘
```

### 5.6 Schema Validation at Save Time

Before a form definition can be saved, it must pass structural validation:

```typescript
function validateFormSchema(schema: FormSchema): ValidationError[] {
  const errors: ValidationError[] = [];
  const allFieldIds = new Set<string>();
  const fieldIdRegex = /^[a-z][a-z0-9_]*$/;

  for (const page of schema.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        // 1. Field ID format
        if (!fieldIdRegex.test(field.id)) {
          errors.push({ field: field.id, message: 'Field ID must be lowercase alphanumeric + underscore' });
        }
        // 2. Field ID uniqueness
        if (allFieldIds.has(field.id) && !section.repeatable) {
          errors.push({ field: field.id, message: 'Duplicate field ID' });
        }
        allFieldIds.add(field.id);
        // 3. Regex safety (ReDoS protection)
        if (field.validation?.pattern) {
          if (field.validation.pattern.length > 200) {
            errors.push({ field: field.id, message: 'Pattern too long (max 200 chars)' });
          }
          if (isReDoSVulnerable(field.validation.pattern)) {
            errors.push({ field: field.id, message: 'Pattern is vulnerable to ReDoS' });
          }
        }
        // 4. Option list reference exists
        if (field.optionListSlug) {
          // verify against option_lists table
        }
      }
    }
  }

  // 5. Expression dependency cycle detection
  errors.push(...detectExpressionCycles(schema));

  return errors;
}
```

### 5.7 Form Builder (Phase 2)

| Approach | Phase | Description |
|---|---|---|
| **Data Dictionary CSV upload** | 2a | REDCap-compatible CSV upload; maps 18 REDCap DD columns to SCRIBE schema |
| **Visual field editor** | 2b | UI to add/edit/reorder fields, set validation, configure branching |
| **Template library** | 2c | Pre-built form templates (demographics, vitals, labs, AE reporting, consent) |

**REDCap Data Dictionary column mapping** (for CSV import):

| REDCap Column | SCRIBE Mapping |
|---|---|
| `Variable / Field Name` | `field.id` |
| `Form Name` | `form_definitions.slug` |
| `Section Header` | `section.title` |
| `Field Type` | `field.type` (map: text→text, radio→radio, calc→calculated, etc.) |
| `Field Label` | `field.label` |
| `Choices, Calculations, OR Slider Labels` | `field.options[]` or `field.expression` |
| `Field Note` | `field.description` |
| `Text Validation Type OR Show Slider Number` | `field.validation` |
| `Text Validation Min` | `field.validation.min` |
| `Text Validation Max` | `field.validation.max` |
| `Branching Logic` | Converted to `rule` (REDCap syntax → filtrex syntax) |
| `Required Field?` | `field.required` |
| `Custom Alignment` | Ignored (Tailwind handles layout) |
| `Field Annotation` | `field.description` (appended) |
| `Matrix Group Name` | `section.id` for matrix sections |

---

## 6. Expression Engine

### 6.1 Architecture

Uses **filtrex** for safe expression evaluation. Expressions appear in:
- Field visibility rules
- Branching logic (rules)
- Calculated fields
- Eligibility criteria
- Stratum determination
- Custom validation

### 6.2 Expression Syntax

```
// Simple comparisons
{age} >= 18 and {age} <= 70

// Cross-field
{sex} == "female" and {age} >= 12 and {age} <= 55

// Cross-form references (NEW in v2)
{demographics.goligher_grade} == "II"

// Calculations
round({weight} / ({height}/100)^2, 1)

// String functions
lower({drug_name}) == "metformin"

// Array checks (for checkbox fields)
"diabetes" in {comorbidities}

// Null checks
{pregnancy_test} != null
```

### 6.3 Safety Measures

1. **No eval() or Function()** — filtrex compiles to safe JS functions
2. **Whitelist of allowed functions**: `round`, `floor`, `ceil`, `abs`, `min`, `max`, `sqrt`, `pow`, `lower`, `upper`, `length`, `if`
3. **Expression complexity limit**: Max 500 characters, max 10 nested parentheses
4. **Circular dependency detection**: Build directed graph of field dependencies; reject cycles at form definition save time
5. **Timeout**: Expression evaluation capped at 50ms per field (prevent DoS via complex expressions)
6. **Cross-form reads are read-only**: Expressions can reference other forms' data but never write to them

### 6.4 REDCap Branching Logic Converter

For CSV import compatibility, convert REDCap syntax to filtrex:

```
REDCap: [sex] = '1'              → filtrex: {sex} == "1"
REDCap: [age] >= 18 and [age] <= 70 → filtrex: {age} >= 18 and {age} <= 70
REDCap: [checkbox(1)] = '1'     → filtrex: "1" in {checkbox}
REDCap: [form_name_complete] = '2' → filtrex: {_form_status.form_name} == "complete"
```

---

## 7. Longitudinal & Event System

### 7.1 Concepts

| Concept | Description | Example |
|---|---|---|
| **Arm** | A pathway through the study | Control, Experimental |
| **Period** | A phase within a cross-over design | Period 1, Washout, Period 2 |
| **Event** | A scheduled data collection point | Screening, Day 30 Follow-up |
| **Instrument** | A form assigned to an event | Demographics, Vitals |
| **Instance** | A repeat of a repeating event | Unscheduled Visit #1, #2, #3 |

### 7.2 Event Types

| Type | `day_offset` | `max_repeats` | Use Case |
|---|---|---|---|
| `scheduled` | Required | 1 (implicit) | Day 30 follow-up, Screening |
| `unscheduled` | NULL | NULL (unlimited) | Unscheduled visit, phone call |
| `repeating` | Required (interval) | Configurable | Weekly vitals, monthly labs |
| `as_needed` | NULL | NULL | Adverse event, protocol deviation |

### 7.3 Visit Window Calculation

```typescript
function calculateVisitWindow(
  event: StudyEvent,
  anchorDate: Date
): { due: Date; windowStart: Date; windowEnd: Date } {
  const due = addDays(anchorDate, event.day_offset);
  return {
    due,
    windowStart: addDays(due, -event.window_before),
    windowEnd: addDays(due, event.window_after),
  };
}
```

### 7.4 Overdue Detection

Computed dynamically — no hardcoded thresholds:

```sql
-- PostgreSQL 17 query using JSON_TABLE for dashboard
SELECT
    p.study_number,
    se.label AS event_label,
    (p.enrolled_at + (se.day_offset || ' days')::interval)::date AS due_date,
    (p.enrolled_at + (se.day_offset + se.window_after || ' days')::interval)::date AS deadline,
    CURRENT_DATE - (p.enrolled_at + (se.day_offset + se.window_after || ' days')::interval)::date AS days_overdue
FROM participants p
CROSS JOIN study_events se
LEFT JOIN form_responses fr
    ON fr.participant_id = p.id AND fr.event_id = se.id AND fr.deleted_at IS NULL
WHERE p.study_id = $1
  AND p.status IN ('enrolled', 'randomized', 'on_treatment')
  AND p.deleted_at IS NULL
  AND se.event_type = 'scheduled'
  AND se.day_offset IS NOT NULL
  AND fr.id IS NULL  -- no response exists
  AND CURRENT_DATE > (p.enrolled_at + (se.day_offset + se.window_after || ' days')::interval)::date;
```

### 7.5 Participant Timeline Component

A visual timeline showing:
```
Screening ──●── Baseline ──●── Day 30 ──○── Day 180 ──○── Day 365
           done          done     due in 5d    upcoming     upcoming

●  = completed (green)
○  = pending (grey)
⚠  = overdue (red)
◐  = partially complete (yellow)
```

---

## 8. Randomization Engine

### 8.1 Supported Methods

| Method | Use Case | Algorithm |
|---|---|---|
| `simple` | Small studies, no stratification | Random arm selection weighted by allocation ratio |
| `block` | Standard RCT | Permuted blocks of configurable sizes |
| `stratified_block` | Stratified RCT | Permuted blocks within each stratum |
| `minimization` | Many strata, small sample | Pocock & Simon: minimize imbalance across factors |
| `cluster` | Cluster-randomized | Site-level allocation via block randomization |

### 8.2 Generic Randomization RPC

```sql
CREATE OR REPLACE FUNCTION perform_randomization(
    p_study_id UUID,
    p_participant_id UUID,
    p_performed_by UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_config        randomization_config;
    v_stratum_id    UUID;
    v_sequence      randomization_sequence;
    v_allocation_id UUID;
    v_arm           study_arms;
BEGIN
    -- 1. Get config
    SELECT * INTO STRICT v_config FROM randomization_config WHERE study_id = p_study_id;

    -- 2. Check not already randomized
    IF EXISTS (SELECT 1 FROM randomization_allocations WHERE participant_id = p_participant_id) THEN
        RAISE EXCEPTION 'Participant already randomized';
    END IF;

    -- 3. Determine stratum (evaluate rules against participant's form data)
    IF v_config.method IN ('stratified_block', 'minimization') THEN
        v_stratum_id := determine_stratum(p_study_id, p_participant_id);
        IF v_stratum_id IS NULL THEN
            RAISE EXCEPTION 'Cannot determine stratum: required data missing';
        END IF;
    END IF;

    -- 4. Advisory lock (study + stratum scope)
    PERFORM pg_advisory_xact_lock(
        hashtext(p_study_id::text || COALESCE(v_stratum_id::text, ''))
    );

    -- 5. Get next allocation
    IF v_config.method = 'minimization' THEN
        -- Minimization: calculate arm that minimizes imbalance
        v_sequence := perform_minimization(p_study_id, v_stratum_id, v_config.settings);
    ELSE
        -- Block / simple: next unused sequence entry
        SELECT * INTO v_sequence
        FROM randomization_sequence
        WHERE study_id = p_study_id
          AND (stratum_id IS NOT DISTINCT FROM v_stratum_id)
          AND used_at IS NULL
        ORDER BY sequence_number
        LIMIT 1
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No allocations remaining in this stratum';
        END IF;
    END IF;

    -- 6. Mark used
    UPDATE randomization_sequence
    SET used_at = now(), used_by = p_performed_by, participant_id = p_participant_id
    WHERE id = v_sequence.id;

    -- 7. Create allocation
    INSERT INTO randomization_allocations (study_id, participant_id, arm_id, stratum_id, sequence_id, randomized_by)
    VALUES (p_study_id, p_participant_id, v_sequence.arm_id, v_stratum_id, v_sequence.id, p_performed_by)
    RETURNING id INTO v_allocation_id;

    -- 8. Update participant status
    UPDATE participants SET status = 'randomized', enrolled_at = COALESCE(enrolled_at, now())
    WHERE id = p_participant_id;

    -- 9. Return result
    SELECT * INTO v_arm FROM study_arms WHERE id = v_sequence.arm_id;
    RETURN jsonb_build_object(
        'allocation_id', v_allocation_id,
        'arm_name', v_arm.name,
        'arm_label', v_arm.label,
        'stratum_id', v_stratum_id,
        'sequence_number', v_sequence.sequence_number
    );
END;
$$;
```

### 8.3 Sequence Extension

When enrollment exceeds the initial sequence:

```sql
CREATE OR REPLACE FUNCTION extend_randomization_sequence(
    p_study_id UUID,
    p_additional_count INTEGER,
    p_stratum_id UUID DEFAULT NULL
) RETURNS INTEGER  -- number of new entries created
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
    -- Get current max sequence_number for this study+stratum
    -- Generate new block(s) continuing from max+1
    -- Insert new entries
    -- Return count
$$;
```

---

## 9. Multi-Tenancy & Access Control

### 9.1 Isolation Model

**Shared tables + RLS** with JWT claims optimization:

```sql
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
        COALESCE(auth.jwt()->'memberships', '[]'::jsonb)
    ) AS m;
$$;

-- Study-level isolation (all data tables)
CREATE POLICY study_isolation ON form_responses
    FOR ALL TO authenticated
    USING (
        study_id IN (SELECT study_id FROM get_user_memberships())
    );

-- Site-level isolation (Data Access Groups)
CREATE POLICY site_isolation ON participants
    FOR ALL TO authenticated
    USING (
        study_id IN (SELECT study_id FROM get_user_memberships())
        AND (
            site_id IS NULL  -- study-wide visible
            OR site_id IN (
                SELECT COALESCE(site_id, participants.site_id)
                FROM get_user_memberships() m
                WHERE m.study_id = participants.study_id
            )
        )
    );
```

### 9.2 Role Permissions Matrix (6 roles)

| Permission | PI | Co-I | Data Entry | Read Only | Monitor | Site Coordinator |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View all study data | All sites | All sites | Own site | Own site | All sites | Own site |
| Enter/edit data | Yes | Yes | Yes | No | No | Yes |
| Randomize | Yes | Yes | No | No | No | No |
| Soft-delete participants | Yes | Yes | No | No | No | No |
| Manage users | Yes | Yes | No | No | No | No |
| Export data | Yes | Yes | No | No | Yes | No |
| Create/manage queries | Yes | Yes | No | No | Yes | No |
| Acknowledge SAEs | Yes | No | No | No | No | No |
| Edit study config | Yes | No | No | No | No | No |
| Lock/unlock forms | Yes | Yes | No | No | No | No |
| Sign forms | Yes | Yes | No | No | No | No |
| View audit trail | Yes | Yes | Yes | No | Yes | Yes |
| View form (per form_definitions.settings.visibility_roles) | Configurable per form |

---

## 10. Routing & Navigation

### 10.1 URL Structure

Study context is **always in the URL**, solving the multi-study browser tab problem:

```
/                                           → Landing page
/login                                      → Login
/select-study                               → Study picker (after login)

/org/{org_slug}                             → Organization dashboard
/org/{org_slug}/studies                     → Study list
/org/{org_slug}/studies/new                 → Create study wizard

/org/{org_slug}/study/{study_slug}          → Study dashboard
/org/{org_slug}/study/{study_slug}/participants
/org/{org_slug}/study/{study_slug}/participants/{id}
/org/{org_slug}/study/{study_slug}/participants/{id}/forms/{form_slug}/{event_id?}
/org/{org_slug}/study/{study_slug}/randomize/{id}
/org/{org_slug}/study/{study_slug}/queries
/org/{org_slug}/study/{study_slug}/reports
/org/{org_slug}/study/{study_slug}/audit-log
/org/{org_slug}/study/{study_slug}/settings
/org/{org_slug}/study/{study_slug}/settings/forms
/org/{org_slug}/study/{study_slug}/settings/events
/org/{org_slug}/study/{study_slug}/settings/arms
/org/{org_slug}/study/{study_slug}/settings/randomization
/org/{org_slug}/study/{study_slug}/settings/users
```

### 10.2 Middleware

```typescript
// middleware.ts (Next.js 16 — renamed from 'proxy' in latest)
export async function middleware(request: NextRequest) {
  // 1. Refresh Supabase session
  // 2. Extract org_slug + study_slug from URL
  // 3. Verify user has study_members entry for this study
  // 4. Set active study context in headers (for Server Components)
  // 5. Redirect unauthorized users
}
```

---

## 11. Monitoring, Reporting & Export

### 11.1 Auto-Generated Dashboard

All metrics computed from study configuration — zero hardcoded values:

| Metric | Source |
|---|---|
| Enrollment progress | `COUNT(participants) / studies.target_sample` |
| Arm balance | `COUNT(randomization_allocations) GROUP BY arm_id` |
| Site enrollment | `COUNT(participants) GROUP BY site_id` |
| Overdue visits | Computed from `study_events` windows (see §7.4) |
| Open queries | `COUNT(data_queries WHERE status='open')` |
| SAE alerts | `COUNT(adverse_events WHERE is_sae AND sae_acknowledged_by IS NULL)` |
| Data completeness | For each event+form: % of expected responses that exist |
| Form status breakdown | `COUNT(form_responses) GROUP BY status` |

### 11.2 Export Formats

| Format | Method | Phase |
|---|---|---|
| **CSV (wide)** | PostgreSQL 17 `JSON_TABLE()` to flatten JSONB dynamically | 1 |
| **CSV (long)** | One row per form_response | 1 |
| **Data Dictionary CSV** | Export form schemas as REDCap-compatible Data Dictionary | 2 |
| **SPSS syntax + CSV** | Generate `.sps` file with variable labels + types | 5 |
| **Stata `.do` + CSV** | Generate `.do` file with variable definitions | 5 |
| **R script + CSV** | Generate `.R` file with `read.csv()` + type coercion | 5 |
| **CDISC ODM XML** | Map form schemas to ODM ClinicalData structure | 5 |
| **JSON** | Raw `form_responses` serialization | 1 |

### 11.3 Export Using JSON_TABLE (PostgreSQL 17)

```sql
-- Dynamic wide-format export leveraging PostgreSQL 17
SELECT
    p.study_number,
    p.status,
    demo.*
FROM participants p
JOIN form_responses fr ON fr.participant_id = p.id
JOIN form_definitions fd ON fd.id = fr.form_id AND fd.slug = 'demographics'
CROSS JOIN LATERAL JSON_TABLE(
    fr.data,
    '$' COLUMNS (
        name   TEXT PATH '$.name',
        age    INTEGER PATH '$.age',
        sex    TEXT PATH '$.sex',
        phone  TEXT PATH '$.phone',
        bmi    NUMERIC PATH '$.bmi'
    )
) AS demo
WHERE p.study_id = $1 AND p.deleted_at IS NULL;
```

The column definitions are **generated dynamically** from `form_definitions.schema` — no hardcoded column lists.

---

## 12. Notification System

### 12.1 Channels

| Channel | Implementation | Phase |
|---|---|---|
| **In-app** | `notifications` table + Supabase Realtime subscription | 1 |
| **Email** | Resend transactional email | 3 |

### 12.2 Notification Events

| Event | Default Recipients | Default Channel |
|---|---|---|
| SAE reported | PI | Both |
| Query created/assigned | Assigned user | Both |
| Visit overdue (first alert) | Data Entry + Site Coordinator | In-app |
| Visit overdue (escalation, +7 days) | PI + Co-I | Both |
| Form locked | Form submitter | In-app |
| Form signed | PI + Co-I | In-app |
| New participant enrolled | PI | In-app |
| Randomization performed | PI | In-app |
| User deactivated | PI | Email |

All configurable per-study via `notification_rules`.

---

## 13. Regulatory Compliance (21 CFR Part 11)

### 13.1 Compliance from Day 1

These features ship in **Phase 1**, not bolted on later:

| Requirement | Implementation |
|---|---|
| **Audit trail** | Append-only `audit_log`, SECURITY DEFINER trigger, WHO/WHAT/WHEN/WHY |
| **Reason for change** | Required `reason` field when editing completed forms; stored in audit_log |
| **Form locking** | Status workflow: draft → complete → verified → locked → signed |
| **Optimistic locking** | `updated_at` check on every form save; reject stale writes |
| **Electronic signatures** | `signatures` table: signer ID, name, role, meaning, IP, timestamp |
| **Access controls** | Supabase Auth + RLS + role-based permissions + form-level visibility |
| **System validation** | Vitest + Playwright test suite; IQ/OQ/PQ documentation templates |
| **Record retention** | No hard deletes; soft-delete + Supabase PITR backup |
| **Authority checks** | Server-side role verification in every server action |

### 13.2 E-Signature Requirements

To comply with 21 CFR Part 11 §11.100:

1. Signer must re-authenticate (password re-entry) before signing
2. Signature includes: full legal name, role, date/time, meaning ("I certify...")
3. IP address and user agent captured for non-repudiation
4. Each signature is unique to one person (tied to `auth.users.id`)
5. Signatures are immutable (no UPDATE/DELETE on `signatures` table)

### 13.3 Form Status Workflow

```
                  ┌─────────┐
                  │  draft   │ ← Initial save / partial data
                  └────┬─────┘
                       │ submit (all required fields filled)
                       ▼
                  ┌─────────┐
                  │ complete │ ← Data entry finished
                  └────┬─────┘
                       │ verify (by Co-I or Monitor)
                       ▼
                  ┌──────────┐
                  │ verified  │ ← Data quality confirmed
                  └────┬──────┘
                       │ lock (by PI or Co-I)
                       ▼
                  ┌─────────┐
                  │  locked  │ ← No more edits (PI can unlock)
                  └────┬─────┘
                       │ sign (by PI, with re-authentication)
                       ▼
                  ┌─────────┐
                  │  signed  │ ← Regulatory-grade finalization
                  └──────────┘

At any point, editing a completed/verified/locked form:
  → Requires reason_for_change
  → Resets status to 'draft'
  → Creates audit_log entry with reason
  → PI can unlock a locked form (with reason)
```

---

## 14. Performance & Scalability

### 14.1 Target Scale

| Metric | Phase 1 Target | Phase 5 Target |
|---|---|---|
| Studies | 5 | 100+ |
| Participants per study | 500 | 10,000 |
| Form responses total | 50,000 | 5,000,000 |
| Concurrent users | 20 | 200 |
| Dashboard load time | < 2s | < 3s |
| Form save latency | < 500ms | < 500ms |
| CSV export (1000 participants) | < 5s | < 10s |

### 14.2 Performance Architecture

| Technique | Implementation | When |
|---|---|---|
| **JSONB GIN index** | On `form_responses.data` | Phase 1 |
| **Hash partitioning** | `form_responses` by `study_id` (16 partitions) | Phase 1 |
| **Range partitioning** | `audit_log` by `changed_at` (semi-annual) | Phase 1 |
| **JWT claims caching** | Study memberships in JWT (avoid subquery in RLS) | Phase 1 |
| **Generated columns** | Extract frequently-queried JSONB fields as typed columns | Phase 3 |
| **Materialized views** | Dashboard aggregation queries | Phase 3 |
| **Connection pooling** | PgBouncer (transaction mode) via Supabase | Phase 1 |
| **Read replicas** | Dashboard queries on read replica | Phase 5 |
| **Query cost budget** | Limit expression engine to 50ms per evaluation | Phase 1 |

### 14.3 Caching Strategy

| Data | Cache | TTL | Invalidation |
|---|---|---|---|
| Form definitions | Next.js `unstable_cache` | 5 min | On form definition edit |
| Option lists | Next.js `unstable_cache` | 30 min | On option list edit |
| Study config | Next.js `unstable_cache` | 5 min | On study settings edit |
| Dashboard metrics | Supabase Realtime + client state | Real-time | On data change events |
| Form responses | No cache (always fresh) | — | — |

---

## 15. Edge Cases & Mitigations

Every edge case from the v1 audit, plus additional ones discovered:

### 15.1 Form Engine

| # | Edge Case | Mitigation |
|---|---|---|
| 1 | Field ID collision across versions | Store `form_version` with every response; export includes version column; cross-version reports require explicit version selection |
| 2 | Circular expression dependency | Dependency graph cycle detection at form save time; reject form with error |
| 3 | Expression references deleted field | Schema validation checks all expression references against field IDs before save |
| 4 | ReDoS via regex pattern | Max 200 chars; `safe-regex2` library check at save time |
| 5 | Unicode in field IDs | Enforce `^[a-z][a-z0-9_]*$` regex at form save |
| 6 | Empty form save | Configurable: `allow_partial_save` in form settings; incomplete forms have status='draft' |
| 7 | Dropdown with 1000+ options | External `option_lists` table with `is_searchable: true`; autocomplete UI |
| 8 | Timezone handling | Store all dates as UTC; display in study's configured timezone; `studies.settings.timezone` |
| 9 | Form with 200+ fields | Pagination via `pages` in schema; lazy Zod generation per page; benchmark threshold: 100 fields/page max |
| 10 | Cross-form calculated field | `crossFormRef` syntax: `{demographics.weight}` resolved server-side at render time |

### 15.2 Randomization

| # | Edge Case | Mitigation |
|---|---|---|
| 11 | Sequence exhaustion | `extend_randomization_sequence()` function; PI notified at 80% usage |
| 12 | Missing stratum data | Explicit error: "Cannot randomize: required field {field} missing" |
| 13 | Emergency unblinding | `unblinding_events` table with reason, unblinder, and who was disclosed to |
| 14 | Password recovery | Super-admin can reset randomization password with audit trail entry |
| 15 | Cross-over re-randomization | `study_periods` + `randomization_allocations.period_id`; sequence per period |

### 15.3 Multi-Tenancy

| # | Edge Case | Mitigation |
|---|---|---|
| 16 | User in 2 studies, 2 browser tabs | Study context in URL (`/org/ipgmer/study/mclaser/...`); no session-level ambiguity |
| 17 | User deactivated mid-session | RLS checks `study_members.is_active` in addition to JWT claims; JWT refresh catches deactivation |
| 18 | Organization deleted | `ON DELETE CASCADE` from organizations → studies → all child tables |
| 19 | Quota abuse (1000 empty studies) | Organization-level limits in `organizations.settings.max_studies` |
| 20 | Cross-study same patient | Each study has independent `participants` rows; no automatic linkage (correct for isolation) |

### 15.4 Data Integrity

| # | Edge Case | Mitigation |
|---|---|---|
| 21 | Concurrent edit (two users, same form) | Optimistic lock: compare `updated_at` before save; reject stale with "Modified by another user" |
| 22 | JSONB document > 1MB | Check `pg_column_size()` on insert; reject > 1MB with error; suggest splitting form |
| 23 | Audit log growth | Partitioned by 6-month ranges; automatic partition creation cron job |
| 24 | Form definition edit after data collection | `is_locked` flag; only additive changes allowed (new optional fields, new options); destructive changes (field deletion, type change) blocked |
| 25 | Backup restore verification | Documented restore procedure; quarterly test schedule; automated restore test in CI |

---

## 16. Phase Roadmap

### Phase 1: Foundation (Weeks 1-8)

**Goal**: Platform running with one study; identical capability to MC-LASER EDC.

| Task | Details |
|---|---|
| Repo setup | Next.js 16, TS 6, Tailwind 4, shadcn/ui, Supabase, Vitest, Playwright |
| Database schema | All tables from §4 including partitioning + audit triggers |
| Auth + JWT hooks | Supabase Auth, custom JWT claims with study memberships |
| Multi-tenant RLS | All policies from §9, JWT-optimized |
| URL-based routing | `/org/{slug}/study/{slug}/...` structure |
| Study setup wizard | Create org → create study → basic settings |
| Form rendering engine | JSON schema → dynamic Zod → React renderer → JSONB save |
| Repeating sections | Array-based JSONB storage + UI for add/remove instances |
| Expression engine | filtrex integration with safety measures from §6 |
| Participant CRUD | Generic enrollment, listing, detail view |
| Form status workflow | draft → complete → verified → locked → signed |
| Optimistic locking | `updated_at` check on every save |
| Reason for change | Required when editing completed forms |
| E-signatures | Signatures table + re-auth flow |
| Audit trail | Append-only log with changed_fields + reason |
| Dashboard | Auto-generated from study config |
| CSV export | Wide + long format using `JSON_TABLE()` |
| In-app notifications | Notification table + Realtime subscription |
| Study templates | Pre-built: "Simple RCT", "Observational", "Single Arm" |

**Deliverable**: A working EDC that can run any simple parallel-group RCT or observational study.

### Phase 2: Form Builder + Import (Weeks 9-13)

| Task | Details |
|---|---|
| Data Dictionary CSV upload | REDCap-compatible format → form schema JSON |
| REDCap branching logic converter | REDCap syntax → filtrex expressions |
| Visual field editor | Add/edit/reorder fields, set validation, configure options |
| Option list management | Create/edit external option lists (ICD codes, drugs) |
| Form versioning | Version increment; existing data linked to old version |
| Form preview | Live preview as it will appear to data entry staff |
| Template library | Demographics, vitals, labs, consent, AE, completion templates |
| Data Dictionary export | Export form schemas as REDCap-compatible CSV |

**Deliverable**: Researchers can create CRFs without writing code.

### Phase 3: Longitudinal & Events (Weeks 14-18)

| Task | Details |
|---|---|
| Event schedule builder | Define visits with time windows per arm |
| Event-form matrix | Assign forms to events |
| Visit tracking | Per-participant timeline (§7.5) |
| Overdue detection | Auto-computed from event windows |
| Repeating events | Unscheduled visits, repeating instruments |
| Cross-over periods | Period-based event scheduling |
| Materialized views | Dashboard performance optimization |
| Generated columns | Frequently-queried JSONB fields extracted |
| Cross-form references | `{form_slug.field_id}` in expressions |

**Deliverable**: Full longitudinal study support including cross-over designs.

### Phase 4: Randomization Engine (Weeks 19-22)

| Task | Details |
|---|---|
| Randomization config UI | Method selection, strata, block sizes, allocation ratios |
| Sequence generator | Block, stratified block algorithms |
| Minimization algorithm | Pocock & Simon implementation |
| Cluster randomization | Site-level allocation |
| Stratum rule evaluation | Evaluate filtrex expressions against participant data |
| Allocation RPC | Generic SECURITY DEFINER with advisory lock |
| Unblinding workflow | Emergency unblind with audit trail |
| Sequence extension | Extend allocation list when running low |

**Deliverable**: Any RCT can configure and run randomization.

### Phase 5: Monitoring & Compliance (Weeks 23-28)

| Task | Details |
|---|---|
| Data query management | Create, assign, resolve queries; auto-generate from validation |
| AE/SAE management | Standardized reporting with SAE escalation |
| Missing data report | Which participants × which forms × which events |
| Statistical exports | SPSS/Stata/R scripts + typed CSV |
| CDISC ODM export | Form schemas → ODM StudyDef + ClinicalData |
| Email notifications | SAE alerts, query assignments, overdue escalation (Resend) |
| Custom report builder | Ad-hoc field selection, filters, aggregation, saved reports |
| Read replicas | Dashboard on read replica |
| Performance monitoring | OpenTelemetry integration |

**Deliverable**: Production-ready EDC with full regulatory compliance.

### Phase 6: Advanced (Weeks 29-40+)

| Task | Details |
|---|---|
| ePRO / patient-facing | Participant survey links with simplified UI |
| eConsent | Electronic informed consent with signature capture |
| Factorial design support | Multiple arm assignments per participant |
| Adaptive trial features | Interim analysis triggers, arm dropping |
| i18n / multi-language forms | Field label translations, RTL support |
| PWA / offline mode | Service Worker + IndexedDB, sync on reconnect |
| API | RESTful API with API keys for external integrations |
| AI-assisted data cleaning | LLM-powered anomaly detection, auto-query suggestions |
| Real-time collaboration | Live form editing indicators ("User X is editing...") |

---

## 17. Repo Structure

```
scribe-edc/
├── app/
│   ├── (marketing)/               # Landing, pricing, docs
│   ├── (auth)/                    # Login, signup, callback
│   ├── (platform)/                # Main app (authenticated)
│   │   ├── select-study/
│   │   └── org/
│   │       └── [orgSlug]/
│   │           ├── studies/
│   │           └── study/
│   │               └── [studySlug]/
│   │                   ├── dashboard/
│   │                   ├── participants/
│   │                   │   └── [participantId]/
│   │                   │       └── forms/
│   │                   │           └── [formSlug]/
│   │                   ├── queries/
│   │                   ├── reports/
│   │                   ├── audit-log/
│   │                   └── settings/
│   │                       ├── forms/
│   │                       ├── events/
│   │                       ├── arms/
│   │                       ├── randomization/
│   │                       └── users/
│   └── api/                       # API routes
├── components/
│   ├── ui/                        # shadcn/ui primitives
│   ├── form-engine/               # FormRenderer, FormField, RepeatableSection
│   ├── form-builder/              # Visual editor, DD import
│   ├── dashboard/                 # Auto-generated dashboard components
│   ├── participants/              # Participant list, detail, timeline
│   ├── queries/                   # Data query management
│   ├── layout/                    # Shell, sidebar, header
│   └── shared/                    # Common: loading, error, empty states
├── lib/
│   ├── form-engine/               # Schema parser, Zod generator, expression engine
│   │   ├── schema-parser.ts
│   │   ├── zod-generator.ts
│   │   ├── expression-engine.ts
│   │   ├── cycle-detector.ts
│   │   ├── redcap-importer.ts
│   │   └── schema-validator.ts
│   ├── supabase/                  # Client setup (browser, server, admin)
│   ├── auth/                      # Session, middleware helpers
│   ├── randomization/             # Sequence generator algorithms
│   ├── export/                    # CSV, SPSS, Stata, CDISC builders
│   └── utils/                     # Date, timezone, formatting
├── server/
│   └── actions/                   # All server actions
│       ├── study.ts
│       ├── participants.ts
│       ├── forms.ts
│       ├── randomization.ts
│       ├── queries.ts
│       ├── exports.ts
│       ├── notifications.ts
│       └── audit.ts
├── supabase/
│   ├── migrations/                # Numbered SQL migrations
│   ├── seed/                      # Sample data for development
│   └── tests/                     # pgTAP or SQL-based DB tests
├── types/
│   ├── database.ts                # Generated Supabase types
│   ├── form-schema.ts             # FormSchema, Field, Rule interfaces
│   └── app.ts                     # Application-level types
├── tests/
│   ├── unit/                      # Vitest unit tests
│   ├── integration/               # Supabase integration tests
│   └── e2e/                       # Playwright E2E tests
├── docs/
│   ├── architecture.md
│   ├── form-schema-spec.md
│   ├── api-reference.md
│   └── deployment.md
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint, test, build
│       ├── e2e.yml                # Playwright against staging
│       └── deploy.yml             # Vercel deployment
├── CLAUDE.md                      # Agent constitution
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── vitest.config.ts
```

---

## 18. Competitive Positioning

| Feature | REDCap | Castor EDC | Medidata | **SCRIBE v2** |
|---|:---:|:---:|:---:|:---:|
| Modern UI | No | Yes | Yes | **Yes** (Tailwind 4 + shadcn/ui) |
| Free / open-source | Yes (self-host) | No | No | **Yes** (cloud + self-host) |
| Cloud-native SaaS | No | Yes | Yes | **Yes** (Supabase) |
| No-code form builder | Partial | Yes | Yes | **Phase 2** |
| Data Dictionary import | Native | No | No | **Phase 2** (REDCap-compatible) |
| Branching logic | Yes | Yes | Yes | **Phase 1** (filtrex) |
| Repeating instruments | Yes | Yes | Yes | **Phase 1** |
| Repeating sections/groups | No | Yes | Yes | **Phase 1** |
| Longitudinal/events | Yes | Yes | Yes | **Phase 3** |
| Cross-over support | Partial | Yes | Yes | **Phase 3** |
| Randomization | No | Yes | Yes | **Phase 4** |
| Stratified block | No | Yes | Yes | **Phase 4** |
| Minimization | No | No | Yes | **Phase 4** |
| CDISC ODM export | No | Yes | Yes | **Phase 5** |
| ePRO | MyCap | Yes | Yes | **Phase 6** |
| eConsent | No | Yes | Yes | **Phase 6** |
| 21 CFR Part 11 | Partial | Yes | Yes | **Phase 1** (by design) |
| Real-time dashboard | No | Yes | Yes | **Phase 1** (Realtime) |
| AI-assisted | No | No | Partial | **Phase 6** |
| Self-hostable | Yes | No | No | **Yes** (Supabase OSS) |
| Offline mode | Partial | Yes | Yes | **Phase 6** (PWA) |
| Multi-language forms | Yes | Yes | Yes | **Phase 6** |

### SCRIBE v2 Differentiation

1. **Free + Open Source + Cloud-native** — REDCap is free but needs institutional IT; Castor is cloud but paid
2. **Regulatory from day 1** — 21 CFR Part 11 compliance baked into Phase 1, not an afterthought
3. **Modern DX** — Next.js 16, TypeScript, Tailwind 4, React 19 vs. REDCap's 2005 PHP
4. **PostgreSQL 17 JSON_TABLE** — Best-in-class JSONB performance for exports and reports
5. **REDCap-compatible import** — Zero switching cost for researchers migrating from REDCap
6. **Expression engine** — Safe, fast, sandboxed branching logic (filtrex > REDCap's custom parser)
7. **Self-hostable** — Entire stack runs on-premise for regulated environments (Supabase is OSS)

---

## 19. AI Integration (Suggestions)

> **Status**: These are proposed AI-assisted features, not committed scope. Each requires separate evaluation before inclusion in the phase roadmap.

### 19.1 Protocol-to-Study Setup ✅ Recommended

**Risk**: Low | **Reward**: High | **Suggested phase**: 2–3

Feed a protocol PDF (or free-text description) to an LLM. The model generates a **draft** study configuration:

- Study type, arms, allocation ratios
- Visit schedule with time windows
- Eligibility criteria (as filtrex expressions)
- Suggested form list (from template library)
- Stratification factors

**Why low risk**: The output is a draft presented in the study setup wizard. The PI reviews and edits every field before anything is saved. No patient data is involved — only protocol-level study design metadata.

**UX pattern**:
```
Upload PDF or paste protocol text
       ↓
LLM extracts structured config
       ↓
"AI-suggested — please verify" review screen
       ↓
PI edits / confirms → saved to DB
```

**Open questions**:
- Which LLM provider? (Claude API is the natural fit; could also support self-hosted models for air-gapped institutions)
- Acceptable latency for PDF parsing? (30–60s is fine for a one-time setup step)
- Fallback when the LLM can't parse a complex protocol? (Graceful degradation to manual setup)

---

### 19.2 Auto-Coding Free Text (MedDRA / WHO Drug Dictionary) — Needs Further Evaluation

**Risk**: Medium | **Reward**: High | **Suggested phase**: 4–5

Use an LLM to suggest MedDRA Preferred Terms and System Organ Classes for free-text adverse event descriptions, and WHO Drug Dictionary codes for medication names.

**Why medium risk**:
1. **Accuracy** — Miscoded AEs affect safety signal detection. "Headache" vs. "migraine" vs. "intracranial hypertension" have different regulatory implications. Reviewer anchoring on AI suggestions is a concern.
2. **Data privacy** — AE descriptions contain patient clinical data. Sending to an external LLM may violate HIPAA, GDPR, or IRB data handling agreements.

**Requires resolution before implementation**:
- [ ] Privacy architecture: self-hosted model, BAA-compliant API, or de-identification pipeline?
- [ ] Accuracy benchmarking: test against a gold-standard coded dataset before deploying
- [ ] Regulatory review: does AI-assisted coding require disclosure in the trial's data management plan?
- [ ] UX: how to present suggestions without inducing anchoring bias? (e.g., show top-3 candidates, not just one)

---

### 19.3 Smart Data Query Generation — Needs Further Evaluation

**Risk**: Medium | **Reward**: Medium–High | **Suggested phase**: 5

Go beyond the rule-based `auto_query` system (§5 form rules). An LLM reviews completed form responses and flags implausible data combinations that no one wrote explicit rules for:

- "Male" + pregnancy-related fields filled
- BMI of 4.2 (likely kg/m² entry error)
- Surgery date before enrollment date
- Lab values outside physiological range (not just study-defined range)

**Why medium risk**:
- Same **data privacy** concern as §19.2 — form response data contains PHI
- **False positives** waste investigator time and erode trust in the system
- Researchers may not want an opaque model second-guessing their data

**Requires resolution before implementation**:
- [ ] Can this be done with a local/self-hosted model to avoid sending PHI externally?
- [ ] What false-positive rate is acceptable? (Target: <5% to maintain trust)
- [ ] Should this be opt-in per study? (Likely yes)

---

### 19.4 Natural Language Data Explorer — Needs Further Evaluation

**Risk**: Low–Medium | **Reward**: Medium | **Suggested phase**: 5–6

Allow PIs and monitors to query study data in plain English:

```
"Show me all participants with BMI > 30 who haven't completed their Day 30 visit"
      ↓
LLM generates SQL/filter against the study's schema
      ↓
Results displayed in a table (read-only)
```

**Why lower risk**:
- **Read-only** — no data modification possible
- If the query is generated and executed **server-side**, no patient data leaves the platform; only the natural language prompt is sent to the LLM
- The generated SQL can be shown to the user for transparency

**Requires resolution before implementation**:
- [ ] Can the LLM reliably generate correct queries against JSONB form data? (Needs prototyping)
- [ ] Should the NL prompt be sent to an external LLM, or can a smaller local model handle SQL generation?
- [ ] Guardrails: prevent queries that bypass RLS or access data outside the user's permissions

---

### 19.5 Summary Matrix

| # | Feature | Risk | Reward | Data Privacy Concern | Phase | Status |
|---|---|---|---|---|---|---|
| 1 | Protocol-to-Study Setup | Low | High | None (study metadata only) | 2–3 | ✅ Recommended |
| 2 | Auto-Coding (MedDRA/WHO Drug) | Medium | High | Yes (AE descriptions = PHI) | 4–5 | Needs evaluation |
| 3 | Smart Data Query Generation | Medium | Medium–High | Yes (form response data = PHI) | 5 | Needs evaluation |
| 4 | Natural Language Data Explorer | Low–Medium | Medium | Low (if query runs server-side) | 5–6 | Needs evaluation |

---

*This plan supersedes `SCRIBE_PLATFORM_PLAN.md` (v1). MC-LASER EDC continues independently in its own repository.*
