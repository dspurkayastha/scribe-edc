import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER_ID, TEST_STUDY_ID, TEST_PARTICIPANT_ID, TEST_FORM_ID } from './helpers'

// ─── Hoisted Mocks (available inside vi.mock factories) ───

const { mockQueryBuilder, mockSupabase, mockRequireStudyAccess, mockRequireAuth } = vi.hoisted(() => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  }

  const mockRequireStudyAccess = vi.fn()
  const mockRequireAuth = vi.fn()

  return { mockQueryBuilder, mockSupabase, mockRequireStudyAccess, mockRequireAuth }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

vi.mock('@/lib/auth/session', () => ({
  requireAuth: mockRequireAuth,
  requireStudyAccess: mockRequireStudyAccess,
}))

import { saveFormDraft, submitForm, getFormResponse, getFormDefinition } from '@/server/actions/forms'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
  mockRequireAuth.mockResolvedValue({ id: TEST_USER_ID })
  // Re-wire the mockQueryBuilder functions
  mockQueryBuilder.select.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.insert.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.update.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.is.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.order.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.single.mockResolvedValue({ data: null, error: null })
  mockSupabase.from.mockReturnValue(mockQueryBuilder)
})

// ═══════════════════════════════════════════════════════════════
// getFormDefinition
// ═══════════════════════════════════════════════════════════════

describe('getFormDefinition', () => {
  it('returns form definition when found', async () => {
    const mockFormDef = { id: TEST_FORM_ID, slug: 'demographics', title: 'Demographics' }
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockFormDef, error: null }),
        }),
      }),
    })

    const result = await getFormDefinition(TEST_FORM_ID)
    expect(result).toEqual(mockFormDef)
  })

  it('returns null when not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const result = await getFormDefinition('nonexistent')
    expect(result).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════
// getFormResponse
// ═══════════════════════════════════════════════════════════════

describe('getFormResponse', () => {
  it('returns form response when found', async () => {
    const mockResponse = { id: 'resp-1', data: { name: 'John' }, status: 'draft' }
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockResponse, error: null }),
                }),
              }),
            }),
          }),
        }),
      }),
    })

    const result = await getFormResponse(TEST_PARTICIPANT_ID, TEST_FORM_ID)
    expect(result).toEqual(mockResponse)
  })

  it('returns null when no response found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      }),
    })

    const result = await getFormResponse(TEST_PARTICIPANT_ID, TEST_FORM_ID)
    expect(result).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════
// saveFormDraft
// ═══════════════════════════════════════════════════════════════

describe('saveFormDraft', () => {
  it('returns error when user lacks edit permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await saveFormDraft({
      studyId: TEST_STUDY_ID,
      participantId: TEST_PARTICIPANT_ID,
      formId: TEST_FORM_ID,
      formVersion: 1,
      data: { name: 'Test' },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })

  it('creates new draft when no existing response', async () => {
    const mockInsertedResponse = {
      id: 'resp-new',
      study_id: TEST_STUDY_ID,
      participant_id: TEST_PARTICIPANT_ID,
      form_id: TEST_FORM_ID,
      data: { name: 'Test' },
      status: 'draft',
    }

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // getFormResponse query - return null (no existing)
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      // insert query
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInsertedResponse, error: null }),
          }),
        }),
      }
    })

    const result = await saveFormDraft({
      studyId: TEST_STUDY_ID,
      participantId: TEST_PARTICIPANT_ID,
      formId: TEST_FORM_ID,
      formVersion: 1,
      data: { name: 'Test' },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('draft')
    }
  })

  it('updates existing draft when response exists', async () => {
    const existingResponse = {
      id: 'resp-existing',
      study_id: TEST_STUDY_ID,
    }
    const updatedResponse = {
      ...existingResponse,
      data: { name: 'Updated' },
      status: 'draft',
    }

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: existingResponse, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      // update query
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedResponse, error: null }),
              }),
            }),
          }),
        }),
      }
    })

    const result = await saveFormDraft({
      studyId: TEST_STUDY_ID,
      participantId: TEST_PARTICIPANT_ID,
      formId: TEST_FORM_ID,
      formVersion: 1,
      data: { name: 'Updated' },
    })

    expect(result.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// submitForm
// ═══════════════════════════════════════════════════════════════

describe('submitForm', () => {
  it('returns error when user lacks permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await submitForm({
      studyId: TEST_STUDY_ID,
      participantId: TEST_PARTICIPANT_ID,
      formId: TEST_FORM_ID,
      formVersion: 1,
      data: { name: 'Test' },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })

  it('returns error when form definition not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const result = await submitForm({
      studyId: TEST_STUDY_ID,
      participantId: TEST_PARTICIPANT_ID,
      formId: TEST_FORM_ID,
      formVersion: 1,
      data: { name: 'Test' },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Form definition not found')
    }
  })

  it('performs server-side validation and returns fieldErrors on failure', async () => {
    const formSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 's1',
          title: 'Section',
          fields: [
            { id: 'name', type: 'text', label: 'Name', required: true },
            { id: 'age', type: 'integer', label: 'Age', required: true, validation: { min: 0, max: 120 } },
          ],
        }],
      }],
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { schema: formSchema }, error: null }),
        }),
      }),
    })

    const result = await submitForm({
      studyId: TEST_STUDY_ID,
      participantId: TEST_PARTICIPANT_ID,
      formId: TEST_FORM_ID,
      formVersion: 1,
      data: {}, // missing required fields
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Validation failed')
      expect(result.fieldErrors).toBeDefined()
    }
  })

  it('submits successfully with valid data', async () => {
    const formSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 's1',
          title: 'Section',
          fields: [
            { id: 'name', type: 'text', label: 'Name', required: true },
          ],
        }],
      }],
    }

    const submittedResponse = {
      id: 'resp-1',
      status: 'complete',
      data: { name: 'John' },
    }

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // form_definitions lookup
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { schema: formSchema }, error: null }),
            }),
          }),
        }
      }
      if (callCount === 2) {
        // getFormResponse - return null (no existing)
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      // insert
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: submittedResponse, error: null }),
          }),
        }),
      }
    })

    const result = await submitForm({
      studyId: TEST_STUDY_ID,
      participantId: TEST_PARTICIPANT_ID,
      formId: TEST_FORM_ID,
      formVersion: 1,
      data: { name: 'John' },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('complete')
    }
  })
})
