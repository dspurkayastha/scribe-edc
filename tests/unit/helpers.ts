/**
 * Common test utilities and mock factories for SCRIBE EDC unit tests.
 */
import { vi } from 'vitest'
import type { FormSchema, Field, Section, Page } from '@/types/form-schema'
import type { MemberRole } from '@/types/database'

// ─── Supabase Mock Factory ───

/**
 * Creates a chainable mock Supabase query builder.
 * Each method returns the same mock for chaining, except terminal methods
 * which return the configured result.
 */
export function createMockSupabaseClient(overrides?: {
  data?: unknown
  error?: unknown
  count?: number | null
}) {
  const result = {
    data: overrides?.data ?? null,
    error: overrides?.error ?? null,
    count: overrides?.count ?? null,
  }

  const queryBuilder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: undefined as any,
  }

  // Make the builder itself thenable (when called without .single())
  queryBuilder.then = vi.fn((resolve: any) => resolve(result))

  const client = {
    from: vi.fn().mockReturnValue(queryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    _queryBuilder: queryBuilder,
    _result: result,
  }

  return client
}

/**
 * Creates a chainable mock where different from() tables can return different results.
 */
export function createMockSupabaseMultiTable(
  tableResults: Record<string, { data?: unknown; error?: unknown; count?: number | null }>
) {
  const builders: Record<string, any> = {}

  for (const [table, result] of Object.entries(tableResults)) {
    const resolvedResult = {
      data: result.data ?? null,
      error: result.error ?? null,
      count: result.count ?? null,
    }

    const qb: any = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(resolvedResult),
      maybeSingle: vi.fn().mockResolvedValue(resolvedResult),
      then: undefined as any,
    }
    qb.then = vi.fn((resolve: any) => resolve(resolvedResult))
    builders[table] = qb
  }

  const client = {
    from: vi.fn((table: string) => builders[table] ?? builders['__default'] ?? createMockSupabaseClient()._queryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    _builders: builders,
  }

  return client
}

// ─── Form Schema Factories ───

export function makeField(overrides: Partial<Field> & { id: string; type: Field['type']; label: string }): Field {
  return {
    required: false,
    disabled: false,
    ...overrides,
  }
}

export function makeSection(overrides: Partial<Section> & { id: string; title: string; fields: Field[] }): Section {
  return {
    repeatable: false,
    ...overrides,
  }
}

export function makePage(overrides: Partial<Page> & { id: string; title: string; sections: Section[] }): Page {
  return {
    ...overrides,
  }
}

export function makeFormSchema(pages: Page[]): FormSchema {
  return { pages }
}

/** Create a minimal valid form schema with a single field */
export function makeSimpleSchema(field: Field): FormSchema {
  return {
    pages: [{
      id: 'p1',
      title: 'Test Page',
      sections: [{
        id: 's1',
        title: 'Test Section',
        fields: [field],
      }],
    }],
  }
}

/** Create a form schema with multiple fields */
export function makeMultiFieldSchema(fields: Field[]): FormSchema {
  return {
    pages: [{
      id: 'p1',
      title: 'Test Page',
      sections: [{
        id: 's1',
        title: 'Test Section',
        fields,
      }],
    }],
  }
}

// ─── Test Data Constants ───

export const TEST_USER_ID = '00000000-0000-4000-8000-000000000001'
export const TEST_STUDY_ID = '00000000-0000-4000-8000-000000000002'
export const TEST_ORG_ID = '00000000-0000-4000-8000-000000000003'
export const TEST_PARTICIPANT_ID = '00000000-0000-4000-8000-000000000004'
export const TEST_FORM_ID = '00000000-0000-4000-8000-000000000005'
export const TEST_RESPONSE_ID = '00000000-0000-4000-8000-000000000006'
export const TEST_SITE_ID = '00000000-0000-4000-8000-000000000007'
export const TEST_ARM_ID = '00000000-0000-4000-8000-000000000008'

export const ALL_ROLES: MemberRole[] = ['pi', 'co_investigator', 'data_entry', 'read_only', 'monitor']

export function mockRequireStudyAccess(role: MemberRole = 'pi', userId = TEST_USER_ID, siteId: string | null = null) {
  return { userId, role, siteId }
}

export function mockRequireAuth(userId = TEST_USER_ID) {
  return { id: userId, email: 'test@example.com' }
}
