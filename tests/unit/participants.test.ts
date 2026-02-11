import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER_ID, TEST_STUDY_ID, TEST_PARTICIPANT_ID } from './helpers'

// ─── Hoisted Mocks (available inside vi.mock factories) ───

const { mockQueryBuilder, mockSupabase, mockRequireStudyAccess, mockRequireAuth } = vi.hoisted(() => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null, count: null }),
  }

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
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

import { createParticipant, listParticipants, updateParticipantStatus, softDeleteParticipant } from '@/server/actions/participants'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
  mockRequireAuth.mockResolvedValue({ id: TEST_USER_ID })
  // Re-wire the mockQueryBuilder functions
  mockQueryBuilder.select.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.insert.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.update.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.neq.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.is.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.ilike.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.order.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.range.mockReturnValue(mockQueryBuilder)
  mockQueryBuilder.single.mockResolvedValue({ data: null, error: null, count: null })
  mockSupabase.from.mockReturnValue(mockQueryBuilder)
})

// ═══════════════════════════════════════════════════════════════
// createParticipant
// ═══════════════════════════════════════════════════════════════

describe('createParticipant', () => {
  it('creates a participant with auto-generated study_number', async () => {
    const insertResult = {
      data: { id: TEST_PARTICIPANT_ID, study_number: 'SCR-006', study_id: TEST_STUDY_ID, status: 'screening' },
      error: null,
    }

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id_prefix: 'SCR' }, error: null }) }) }) }
      }
      if (callCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null, count: 5 }),
          }),
        }
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(insertResult),
          }),
        }),
      }
    })

    const result = await createParticipant({ studyId: TEST_STUDY_ID })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.study_number).toBe('SCR-006')
    }
  })

  it('returns error when user lacks permission (read_only)', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await createParticipant({ studyId: TEST_STUDY_ID })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })

  it('returns error when user lacks permission (monitor)', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'monitor', siteId: null })

    const result = await createParticipant({ studyId: TEST_STUDY_ID })
    expect(result.success).toBe(false)
  })

  it('returns error when study not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const result = await createParticipant({ studyId: TEST_STUDY_ID })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Study not found')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// listParticipants
// ═══════════════════════════════════════════════════════════════

describe('listParticipants', () => {
  // listParticipants builds a query chain and conditionally appends filters
  // AFTER .range(). The chain needs to be thenable (awaitable) at the end.
  function createListChain(result: any) {
    const chain: any = {}
    for (const method of ['select', 'eq', 'is', 'ilike', 'order', 'range']) {
      chain[method] = vi.fn((..._args: any[]) => chain)
    }
    chain.then = (resolve: any, _reject?: any) => Promise.resolve(result).then(resolve)
    chain.catch = (_reject: any) => chain
    return chain
  }

  it('returns paginated results with defaults', async () => {
    const chain = createListChain({
      data: [
        { id: '1', study_number: 'SCR-001', status: 'screening' },
        { id: '2', study_number: 'SCR-002', status: 'enrolled' },
      ],
      count: 2,
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)

    const result = await listParticipants(TEST_STUDY_ID)
    expect(result.data).toHaveLength(2)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(25)
    expect(result.total).toBe(2)
    expect(result.totalPages).toBe(1)
  })

  it('applies status filter', async () => {
    const chain = createListChain({ data: [], count: 0, error: null })
    mockSupabase.from.mockReturnValue(chain)

    await listParticipants(TEST_STUDY_ID, { status: 'enrolled' })
    expect(chain.eq).toHaveBeenCalledWith('status', 'enrolled')
  })

  it('applies search filter', async () => {
    const chain = createListChain({ data: [], count: 0, error: null })
    mockSupabase.from.mockReturnValue(chain)

    await listParticipants(TEST_STUDY_ID, { search: 'SCR-001' })
    expect(chain.ilike).toHaveBeenCalledWith('study_number', '%SCR-001%')
  })

  it('applies siteId filter', async () => {
    const chain = createListChain({ data: [], count: 0, error: null })
    mockSupabase.from.mockReturnValue(chain)

    await listParticipants(TEST_STUDY_ID, { siteId: 'site-123' })
    expect(chain.eq).toHaveBeenCalledWith('site_id', 'site-123')
  })

  it('calculates correct pagination', async () => {
    const chain = createListChain({ data: [], count: 100, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await listParticipants(TEST_STUDY_ID, { page: 3, pageSize: 10 })
    expect(result.page).toBe(3)
    expect(result.pageSize).toBe(10)
    expect(result.totalPages).toBe(10)
    expect(chain.range).toHaveBeenCalledWith(20, 29)
  })
})

// ═══════════════════════════════════════════════════════════════
// updateParticipantStatus
// ═══════════════════════════════════════════════════════════════

describe('updateParticipantStatus', () => {
  it('updates status successfully', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { study_id: TEST_STUDY_ID }, error: null }),
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

    const result = await updateParticipantStatus(TEST_PARTICIPANT_ID, 'enrolled')
    expect(result.success).toBe(true)
  })

  it('returns error when participant not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const result = await updateParticipantStatus('nonexistent', 'enrolled')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Participant not found')
    }
  })

  it('returns error when user lacks permission', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { study_id: TEST_STUDY_ID }, error: null }),
          }),
        }),
      }
    })

    // First call is default PI. Second call (inside function) is read_only
    mockRequireStudyAccess
      .mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await updateParticipantStatus(TEST_PARTICIPANT_ID, 'enrolled')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// softDeleteParticipant
// ═══════════════════════════════════════════════════════════════

describe('softDeleteParticipant', () => {
  it('sets deleted_at on the participant', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { study_id: TEST_STUDY_ID }, error: null }),
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

    const result = await softDeleteParticipant(TEST_PARTICIPANT_ID, 'Duplicate entry')
    expect(result.success).toBe(true)
  })

  it('returns error when participant not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const result = await softDeleteParticipant('nonexistent', 'Reason')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Participant not found')
    }
  })

  it('returns error when user cannot delete participants (data_entry)', async () => {
    mockRequireStudyAccess
      .mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { study_id: TEST_STUDY_ID }, error: null }),
          }),
        }),
      }
    })

    const result = await softDeleteParticipant(TEST_PARTICIPANT_ID, 'Reason')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })
})
