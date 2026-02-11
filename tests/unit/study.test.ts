import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER_ID, TEST_STUDY_ID, TEST_ORG_ID } from './helpers'

// ─── Hoisted Mocks (available inside vi.mock factories) ───

const { mockSupabase, mockRequireStudyAccess, mockRequireAuth } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
  }

  const mockRequireStudyAccess = vi.fn()
  const mockRequireAuth = vi.fn()

  return { mockSupabase, mockRequireStudyAccess, mockRequireAuth }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

vi.mock('@/lib/auth/session', () => ({
  requireAuth: mockRequireAuth,
  requireStudyAccess: mockRequireStudyAccess,
}))

import {
  createStudy,
  getStudy,
  createStudyArm,
  createStudySite,
  createStudyEvent,
  addStudyMember,
  removeStudyMember,
  updateStudyArm,
  updateStudySite,
  updateStudyEvent,
  updateStudyMemberRole,
} from '@/server/actions/study'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
  mockRequireAuth.mockResolvedValue({ id: TEST_USER_ID })
})

// ═══════════════════════════════════════════════════════════════
// createStudy
// ═══════════════════════════════════════════════════════════════

describe('createStudy', () => {
  const validInput = {
    organizationId: TEST_ORG_ID,
    name: 'Test Study',
    shortName: 'TS',
    slug: 'test-study',
    idPrefix: 'TST',
    studyType: 'parallel_rct' as const,
    targetSample: 100,
  }

  it('creates a study and adds creator as PI', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // studies insert
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: TEST_STUDY_ID, ...validInput },
                error: null,
              }),
            }),
          }),
        }
      }
      // study_members insert
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const result = await createStudy(validInput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(TEST_STUDY_ID)
    }
  })

  it('returns validation error for invalid input', async () => {
    const result = await createStudy({
      organizationId: 'not-uuid',
      name: '',
      shortName: '',
      slug: 'INVALID SLUG',
      idPrefix: '',
      studyType: 'invalid' as any,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
      expect(result.fieldErrors).toBeDefined()
    }
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

    const result = await createStudy(validInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('slug already exists')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// getStudy
// ═══════════════════════════════════════════════════════════════

describe('getStudy', () => {
  it('returns study by org slug and study slug', async () => {
    const mockStudy = { id: TEST_STUDY_ID, name: 'Test Study', slug: 'test-study' }
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockStudy, error: null }),
          }),
        }),
      }),
    })

    const result = await getStudy('org-slug', 'test-study')
    expect(result).toEqual(mockStudy)
  })

  it('returns null when study not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })

    const result = await getStudy('org-slug', 'nonexistent')
    expect(result).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════
// createStudyArm
// ═══════════════════════════════════════════════════════════════

describe('createStudyArm', () => {
  it('creates an arm with default allocation', async () => {
    const armData = { id: 'arm-1', name: 'treatment_a', label: 'Treatment A', allocation: 1 }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: armData, error: null }),
        }),
      }),
    })

    const result = await createStudyArm(TEST_STUDY_ID, { name: 'treatment_a', label: 'Treatment A' })
    expect(result.success).toBe(true)
  })

  it('creates an arm with custom allocation', async () => {
    const armData = { id: 'arm-1', name: 'treatment_a', label: 'Treatment A', allocation: 2 }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: armData, error: null }),
        }),
      }),
    })

    const result = await createStudyArm(TEST_STUDY_ID, { name: 'treatment_a', label: 'Treatment A', allocation: 2 })
    expect(result.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// createStudySite
// ═══════════════════════════════════════════════════════════════

describe('createStudySite', () => {
  it('creates a site successfully', async () => {
    const siteData = { id: 'site-1', name: 'Boston', code: 'BOS' }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: siteData, error: null }),
        }),
      }),
    })

    const result = await createStudySite(TEST_STUDY_ID, { name: 'Boston', code: 'BOS' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Boston')
    }
  })

  it('returns error on database failure', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Duplicate code' } }),
        }),
      }),
    })

    const result = await createStudySite(TEST_STUDY_ID, { name: 'Boston', code: 'BOS' })
    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// createStudyEvent
// ═══════════════════════════════════════════════════════════════

describe('createStudyEvent', () => {
  it('creates a scheduled event', async () => {
    const eventData = { id: 'evt-1', name: 'screening', label: 'Screening', event_type: 'scheduled' }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: eventData, error: null }),
        }),
      }),
    })

    const result = await createStudyEvent(TEST_STUDY_ID, {
      name: 'screening',
      label: 'Screening',
      event_type: 'scheduled',
      sort_order: 1,
    })
    expect(result.success).toBe(true)
  })

  it('returns error when user cannot edit study config', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    const result = await createStudyEvent(TEST_STUDY_ID, {
      name: 'screening',
      label: 'Screening',
      event_type: 'scheduled',
      sort_order: 1,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('permission')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// updateStudyArm
// ═══════════════════════════════════════════════════════════════

describe('updateStudyArm', () => {
  it('updates arm name and allocation', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'arm-1', name: 'updated' }, error: null }),
            }),
          }),
        }),
      }),
    })

    const result = await updateStudyArm('arm-1', TEST_STUDY_ID, { name: 'updated', allocation: 3 })
    expect(result.success).toBe(true)
  })

  it('returns error when user cannot edit study config', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'co_investigator', siteId: null })

    const result = await updateStudyArm('arm-1', TEST_STUDY_ID, { name: 'x' })
    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// updateStudySite
// ═══════════════════════════════════════════════════════════════

describe('updateStudySite', () => {
  it('updates site name', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'site-1', name: 'Updated' }, error: null }),
            }),
          }),
        }),
      }),
    })

    const result = await updateStudySite('site-1', TEST_STUDY_ID, { name: 'Updated' })
    expect(result.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// updateStudyEvent
// ═══════════════════════════════════════════════════════════════

describe('updateStudyEvent', () => {
  it('updates event properties', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'evt-1', name: 'updated' }, error: null }),
            }),
          }),
        }),
      }),
    })

    const result = await updateStudyEvent('evt-1', TEST_STUDY_ID, { name: 'updated', is_active: false })
    expect(result.success).toBe(true)
  })

  it('returns error when user cannot edit study config', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'monitor', siteId: null })

    const result = await updateStudyEvent('evt-1', TEST_STUDY_ID, { name: 'x' })
    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// addStudyMember
// ═══════════════════════════════════════════════════════════════

describe('addStudyMember', () => {
  it('adds a new study member', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // user_profiles lookup
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'user-new' }, error: null }),
            }),
          }),
        }
      }
      if (callCount === 2) {
        // existing membership check
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }
      }
      // insert
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'mem-1', role: 'data_entry' },
              error: null,
            }),
          }),
        }),
      }
    })

    const result = await addStudyMember(TEST_STUDY_ID, {
      email: 'new@example.com',
      role: 'data_entry',
    })
    expect(result.success).toBe(true)
  })

  it('returns error when user cannot manage users', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    const result = await addStudyMember(TEST_STUDY_ID, {
      email: 'user@example.com',
      role: 'data_entry',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('permission')
    }
  })

  it('returns error when email not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    })

    const result = await addStudyMember(TEST_STUDY_ID, {
      email: 'nonexistent@example.com',
      role: 'data_entry',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('No user found')
    }
  })

  it('returns error when user is already an active member', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'user-existing' }, error: null }),
            }),
          }),
        }
      }
      // existing active membership
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'mem-1', is_active: true },
                error: null,
              }),
            }),
          }),
        }),
      }
    })

    const result = await addStudyMember(TEST_STUDY_ID, {
      email: 'existing@example.com',
      role: 'data_entry',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('already a member')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// removeStudyMember
// ═══════════════════════════════════════════════════════════════

describe('removeStudyMember', () => {
  it('soft-removes a member (sets is_active=false)', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    })

    const result = await removeStudyMember('mem-1', TEST_STUDY_ID)
    expect(result.success).toBe(true)
  })

  it('returns error when user cannot manage users', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    const result = await removeStudyMember('mem-1', TEST_STUDY_ID)
    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// updateStudyMemberRole
// ═══════════════════════════════════════════════════════════════

describe('updateStudyMemberRole', () => {
  it('updates a member role', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'mem-1', role: 'co_investigator' },
                error: null,
              }),
            }),
          }),
        }),
      }),
    })

    const result = await updateStudyMemberRole('mem-1', TEST_STUDY_ID, 'co_investigator')
    expect(result.success).toBe(true)
  })

  it('returns error when caller cannot manage users', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await updateStudyMemberRole('mem-1', TEST_STUDY_ID, 'data_entry')
    expect(result.success).toBe(false)
  })
})
