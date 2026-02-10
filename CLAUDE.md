# SCRIBE EDC — Agent Constitution

## Project Overview
SCRIBE EDC is a free, open-source, cloud-native Electronic Data Capture (EDC) platform for clinical research. It replaces REDCap with a modern stack while matching its configurability.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Server Components, Server Actions, Turbopack)
- **Language**: TypeScript 6 (strict mode)
- **Styling**: Tailwind CSS 4 (CSS-first config, no tailwind.config.ts)
- **Components**: shadcn/ui (Radix primitives)
- **Database**: Supabase (PostgreSQL 17, Auth, RLS, Realtime, Storage)
- **Validation**: Zod 3 + react-hook-form 7
- **Expression Engine**: filtrex 3
- **Testing**: Vitest (unit/integration), Playwright (E2E)

## Architecture Conventions

### File Organization
- `app/` — Next.js App Router pages and layouts
- `components/` — React components (ui/ for shadcn, domain-specific folders)
- `lib/` — Pure logic, utilities, engine code (no React)
- `server/actions/` — All Server Actions (one file per domain)
- `types/` — TypeScript type definitions
- `supabase/migrations/` — SQL migrations (numbered)
- `tests/` — unit/, integration/, e2e/

### Naming Conventions
- Files: `kebab-case.ts` (e.g., `form-renderer.tsx`, `expression-engine.ts`)
- Components: `PascalCase` (e.g., `FormRenderer`)
- Server Actions: `camelCase` verbs (e.g., `createParticipant`, `saveFormDraft`)
- Types/Interfaces: `PascalCase` (e.g., `FormSchema`, `StudyMember`)
- Database: `snake_case` (e.g., `form_responses`, `study_members`)
- Route params: `camelCase` (e.g., `[orgSlug]`, `[studySlug]`)

### Code Patterns
- **Server Components by default** — Only add `'use client'` when needed (interactivity, hooks, browser APIs)
- **Server Actions for mutations** — All writes go through `server/actions/*.ts`
- **Zod for all validation** — Both client-side (UX) and server-side (security)
- **RLS for authorization** — Supabase RLS policies enforce data access; app code adds role checks
- **Optimistic locking** — Compare `updated_at` before writes to prevent concurrent edit conflicts
- **Audit trail** — Database triggers capture all changes; app sets `app.reason_for_change` session var

### Security Rules
- **Zero trust on client** — All validation runs server-side; client-side is UX sugar
- **No raw SQL in app code** — Use Supabase client methods; SQL only in migrations
- **Never bypass RLS** — Admin client (`service_role`) only in seed/migration scripts
- **Sanitize expressions** — filtrex only; never eval() or Function()
- **ReDoS protection** — All regex patterns validated with safe-regex2 before storage

### Testing
- Unit tests: `tests/unit/` — Expression engine, Zod generator, utilities
- Integration tests: `tests/integration/` — Server actions, RLS policies
- E2E tests: `tests/e2e/` — Full user flows with Playwright

## Common Commands
```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npx vitest run       # Run unit tests
npx playwright test  # Run E2E tests
npx supabase db push # Push migrations to cloud
npx supabase gen types typescript --project-id ivvhflooqhcsjmmsvlka > types/supabase.ts
```

## Database
- Project ref: `ivvhflooqhcsjmmsvlka`
- Cloud-only development (no Docker/local Supabase)
- Migrations in `supabase/migrations/` (push with `supabase db push`)
