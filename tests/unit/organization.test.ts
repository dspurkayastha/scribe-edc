import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER_ID } from './helpers'

// ─── Hoisted Mocks (available inside vi.mock factories) ───

const { mockSupabase, mockRequireAuth } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
  }

  const mockRequireAuth = vi.fn()

  return { mockSupabase, mockRequireAuth }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

vi.mock('@/lib/auth/session', () => ({
  requireAuth: mockRequireAuth,
}))

import { createOrganization, getOrganization } from '@/server/actions/organization'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAuth.mockResolvedValue({ id: TEST_USER_ID })
})

// ═══════════════════════════════════════════════════════════════
// createOrganization
// ═══════════════════════════════════════════════════════════════

describe('createOrganization', () => {
  it('creates an organization successfully', async () => {
    const orgData = { id: 'org-1', name: 'ACME Research', slug: 'acme-research' }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: orgData, error: null }),
        }),
      }),
    })

    const result = await createOrganization({ name: 'ACME Research', slug: 'acme-research' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.slug).toBe('acme-research')
    }
  })

  it('returns validation error for invalid input', async () => {
    const result = await createOrganization({ name: '', slug: 'X' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
    }
  })

  it('returns validation error for slug with uppercase', async () => {
    const result = await createOrganization({ name: 'ACME', slug: 'Invalid_Slug' })
    expect(result.success).toBe(false)
  })

  it('returns error on duplicate slug (23505)', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'unique_violation' },
          }),
        }),
      }),
    })

    const result = await createOrganization({ name: 'ACME', slug: 'acme' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('slug already taken')
    }
  })

  it('returns generic error on other DB errors', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '42000', message: 'Some DB error' },
          }),
        }),
      }),
    })

    const result = await createOrganization({ name: 'ACME', slug: 'acme' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Some DB error')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// getOrganization
// ═══════════════════════════════════════════════════════════════

describe('getOrganization', () => {
  it('returns organization by slug', async () => {
    const org = { id: 'org-1', name: 'ACME', slug: 'acme' }
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: org, error: null }),
        }),
      }),
    })

    const result = await getOrganization('acme')
    expect(result).toEqual(org)
  })

  it('returns null when not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const result = await getOrganization('nonexistent')
    expect(result).toBeNull()
  })
})

