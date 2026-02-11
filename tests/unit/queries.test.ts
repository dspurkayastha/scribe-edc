import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER_ID, TEST_STUDY_ID, TEST_PARTICIPANT_ID } from './helpers'

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

import { createQuery, respondToQuery, closeQuery, cancelQuery } from '@/server/actions/queries'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
  mockRequireAuth.mockResolvedValue({ id: TEST_USER_ID })
})

// ═══════════════════════════════════════════════════════════════
// createQuery
// ═══════════════════════════════════════════════════════════════

describe('createQuery', () => {
  it('creates a query successfully', async () => {
    const queryData = { id: 'q1', query_text: 'Please clarify value', status: 'open' }

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // participant check
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: TEST_PARTICIPANT_ID }, error: null }),
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
            single: vi.fn().mockResolvedValue({ data: queryData, error: null }),
          }),
        }),
      }
    })

    const result = await createQuery(TEST_STUDY_ID, {
      participantId: TEST_PARTICIPANT_ID,
      queryText: 'Please clarify value',
      priority: 'normal',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('open')
    }
  })

  it('returns error when user lacks permission (read_only)', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await createQuery(TEST_STUDY_ID, {
      participantId: TEST_PARTICIPANT_ID,
      queryText: 'Test query',
      priority: 'normal',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })

  it('returns validation error for invalid input', async () => {
    const result = await createQuery(TEST_STUDY_ID, {
      participantId: 'not-a-uuid',
      queryText: '',
      priority: 'invalid' as any,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Invalid input')
    }
  })

  it('returns error when participant not found in study', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    })

    const result = await createQuery(TEST_STUDY_ID, {
      participantId: TEST_PARTICIPANT_ID,
      queryText: 'Test query text',
      priority: 'normal',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Participant not found')
    }
  })

  it('allows data_entry role to create queries (via canEditData)', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: TEST_PARTICIPANT_ID }, error: null }),
                }),
              }),
            }),
          }),
        }
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'q1', status: 'open' }, error: null }),
          }),
        }),
      }
    })

    const result = await createQuery(TEST_STUDY_ID, {
      participantId: TEST_PARTICIPANT_ID,
      queryText: 'Test query',
      priority: 'normal',
    })
    expect(result.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// respondToQuery
// ═══════════════════════════════════════════════════════════════

describe('respondToQuery', () => {
  it('responds to an open query successfully', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // query lookup
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'q1', status: 'open' }, error: null }),
              }),
            }),
          }),
        }
      }
      if (callCount === 2) {
        // insert response
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'qr1', response_text: 'Answer', responded_by: TEST_USER_ID },
                error: null,
              }),
            }),
          }),
        }
      }
      // update query status
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    })

    const result = await respondToQuery('q1', TEST_STUDY_ID, { responseText: 'Answer' })
    expect(result.success).toBe(true)
  })

  it('returns error when responding to closed query', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'q1', status: 'closed' }, error: null }),
          }),
        }),
      }),
    })

    const result = await respondToQuery('q1', TEST_STUDY_ID, { responseText: 'Answer' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('closed')
    }
  })

  it('returns error when responding to cancelled query', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'q1', status: 'cancelled' }, error: null }),
          }),
        }),
      }),
    })

    const result = await respondToQuery('q1', TEST_STUDY_ID, { responseText: 'Answer' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('cancelled')
    }
  })

  it('returns error for query not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })

    const result = await respondToQuery('nonexistent', TEST_STUDY_ID, { responseText: 'Answer' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Query not found')
    }
  })

  it('returns error for empty response text', async () => {
    const result = await respondToQuery('q1', TEST_STUDY_ID, { responseText: '' })
    expect(result.success).toBe(false)
  })

  it('returns error when user lacks permission (read_only)', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await respondToQuery('q1', TEST_STUDY_ID, { responseText: 'Answer' })
    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// closeQuery
// ═══════════════════════════════════════════════════════════════

describe('closeQuery', () => {
  it('closes an open query successfully', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'q1', status: 'open' }, error: null }),
              }),
            }),
          }),
        }
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    })

    const result = await closeQuery('q1', TEST_STUDY_ID)
    expect(result.success).toBe(true)
  })

  it('returns error when closing an already closed query', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'q1', status: 'closed' }, error: null }),
          }),
        }),
      }),
    })

    const result = await closeQuery('q1', TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('already closed')
    }
  })

  it('returns error when closing a cancelled query', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'q1', status: 'cancelled' }, error: null }),
          }),
        }),
      }),
    })

    const result = await closeQuery('q1', TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('cancelled')
    }
  })

  it('returns error when user lacks manage_queries permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    const result = await closeQuery('q1', TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })

  it('returns error when query not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })

    const result = await closeQuery('nonexistent', TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Query not found')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// cancelQuery
// ═══════════════════════════════════════════════════════════════

describe('cancelQuery', () => {
  it('cancels an open query successfully', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'q1', status: 'open' }, error: null }),
              }),
            }),
          }),
        }
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    })

    const result = await cancelQuery('q1', TEST_STUDY_ID)
    expect(result.success).toBe(true)
  })

  it('returns error when cancelling a closed query', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'q1', status: 'closed' }, error: null }),
          }),
        }),
      }),
    })

    const result = await cancelQuery('q1', TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('closed')
    }
  })

  it('returns error when cancelling an already cancelled query', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'q1', status: 'cancelled' }, error: null }),
          }),
        }),
      }),
    })

    const result = await cancelQuery('q1', TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('already cancelled')
    }
  })

  it('returns error when user lacks permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    const result = await cancelQuery('q1', TEST_STUDY_ID)
    expect(result.success).toBe(false)
  })
})
