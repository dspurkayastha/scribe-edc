import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER_ID, TEST_STUDY_ID, TEST_FORM_ID } from './helpers'

// ─── Hoisted Mocks ───

const { mockSupabase, mockRequireStudyAccess } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
  }
  const mockRequireStudyAccess = vi.fn()
  return { mockSupabase, mockRequireStudyAccess }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: TEST_USER_ID }),
  requireStudyAccess: mockRequireStudyAccess,
}))

vi.mock('@/lib/form-engine/schema-validator', () => ({
  validateFormSchema: vi.fn().mockReturnValue([]),
}))

import {
  createFormDefinition,
  updateFormDefinition,
  deleteFormDefinition,
  duplicateFormDefinition,
  lockFormDefinition,
  unlockFormDefinition,
  createFormVersion,
} from '@/server/actions/form-builder'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
})

// ═══════════════════════════════════════════════════════════════
// createFormDefinition
// ═══════════════════════════════════════════════════════════════

describe('createFormDefinition', () => {
  const validInput = {
    studyId: TEST_STUDY_ID,
    title: 'Demographics',
    slug: 'demographics',
  }

  it('creates a form definition with default schema', async () => {
    const formData = { id: TEST_FORM_ID, ...validInput, version: 1 }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: formData, error: null }),
        }),
      }),
    })

    const result = await createFormDefinition(validInput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(TEST_FORM_ID)
    }
  })

  it('returns validation error for invalid slug', async () => {
    const result = await createFormDefinition({
      studyId: TEST_STUDY_ID,
      title: 'Test',
      slug: 'INVALID SLUG',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
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

    const result = await createFormDefinition(validInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('slug already exists')
    }
  })

  it('returns error when user cannot edit study config', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    const result = await createFormDefinition(validInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('permission')
    }
  })

  it('returns error for empty title', async () => {
    const result = await createFormDefinition({
      studyId: TEST_STUDY_ID,
      title: '',
      slug: 'test',
    })
    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// updateFormDefinition
// ═══════════════════════════════════════════════════════════════

describe('updateFormDefinition', () => {
  it('updates form title', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // is_locked check
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { is_locked: false }, error: null }),
              }),
            }),
          }),
        }
      }
      // update
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: TEST_FORM_ID, title: 'Updated Title' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }
    })

    const result = await updateFormDefinition({
      formId: TEST_FORM_ID,
      studyId: TEST_STUDY_ID,
      title: 'Updated Title',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Updated Title')
    }
  })

  it('returns error when form is locked', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { is_locked: true }, error: null }),
          }),
        }),
      }),
    })

    const result = await updateFormDefinition({
      formId: TEST_FORM_ID,
      studyId: TEST_STUDY_ID,
      title: 'New Title',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('locked')
    }
  })

  it('returns error when user cannot edit study config', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await updateFormDefinition({
      formId: TEST_FORM_ID,
      studyId: TEST_STUDY_ID,
      title: 'Test',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('permission')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// deleteFormDefinition
// ═══════════════════════════════════════════════════════════════

describe('deleteFormDefinition', () => {
  it('deletes a form with no responses', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // count form_responses
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }
      }
      // delete
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }
    })

    const result = await deleteFormDefinition(TEST_FORM_ID, TEST_STUDY_ID)
    expect(result.success).toBe(true)
  })

  it('prevents deletion when responses exist', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
      }),
    })

    const result = await deleteFormDefinition(TEST_FORM_ID, TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('5 response(s) exist')
    }
  })

  it('returns error when user cannot edit study config', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'monitor', siteId: null })

    const result = await deleteFormDefinition(TEST_FORM_ID, TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('permission')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// duplicateFormDefinition
// ═══════════════════════════════════════════════════════════════

describe('duplicateFormDefinition', () => {
  it('duplicates an existing form', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // fetch source
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: TEST_FORM_ID,
                    schema: { pages: [] },
                    rules: [],
                    settings: {},
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      // insert duplicate
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'new-form-id', slug: 'demo-copy', title: 'Demo (Copy)' },
              error: null,
            }),
          }),
        }),
      }
    })

    const result = await duplicateFormDefinition({
      formId: TEST_FORM_ID,
      studyId: TEST_STUDY_ID,
      newSlug: 'demo-copy',
      newTitle: 'Demo (Copy)',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.slug).toBe('demo-copy')
    }
  })

  it('returns error when source form not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          }),
        }),
      }),
    })

    const result = await duplicateFormDefinition({
      formId: TEST_FORM_ID,
      studyId: TEST_STUDY_ID,
      newSlug: 'copy',
      newTitle: 'Copy',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Source form not found')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// lockFormDefinition / unlockFormDefinition
// ═══════════════════════════════════════════════════════════════

describe('lockFormDefinition', () => {
  it('locks a form', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: TEST_FORM_ID, is_locked: true },
                error: null,
              }),
            }),
          }),
        }),
      }),
    })

    const result = await lockFormDefinition(TEST_FORM_ID, TEST_STUDY_ID)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_locked).toBe(true)
    }
  })

  it('returns error when user cannot lock forms', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    const result = await lockFormDefinition(TEST_FORM_ID, TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('permission')
    }
  })
})

describe('unlockFormDefinition', () => {
  it('unlocks a form', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: TEST_FORM_ID, is_locked: false },
                error: null,
              }),
            }),
          }),
        }),
      }),
    })

    const result = await unlockFormDefinition(TEST_FORM_ID, TEST_STUDY_ID)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_locked).toBe(false)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// createFormVersion
// ═══════════════════════════════════════════════════════════════

describe('createFormVersion', () => {
  it('creates a new version of an existing form', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // fetch existing
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: TEST_FORM_ID,
                    slug: 'demographics',
                    title: 'Demographics',
                    version: 1,
                    schema: { pages: [] },
                    rules: [],
                    settings: {},
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (callCount === 2) {
        // deactivate current
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }
      }
      // insert new version
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'new-version-id', slug: 'demographics', version: 2 },
              error: null,
            }),
          }),
        }),
      }
    })

    const result = await createFormVersion(TEST_FORM_ID, TEST_STUDY_ID)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.version).toBe(2)
    }
  })

  it('returns error when form not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          }),
        }),
      }),
    })

    const result = await createFormVersion(TEST_FORM_ID, TEST_STUDY_ID)
    expect(result.success).toBe(false)
  })
})

