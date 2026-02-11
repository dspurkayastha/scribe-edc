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

import { createAdverseEvent, acknowledgeSAE, listAdverseEvents } from '@/server/actions/adverse-events'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
  mockRequireAuth.mockResolvedValue({ id: TEST_USER_ID })
})

const validAeInput = {
  participantId: TEST_PARTICIPANT_ID,
  description: 'Headache after treatment',
  onsetDate: '2024-01-15',
  severity: 'mild' as const,
  relatedness: 'possible' as const,
  outcome: 'resolved' as const,
  isSae: false,
}

// ═══════════════════════════════════════════════════════════════
// createAdverseEvent
// ═══════════════════════════════════════════════════════════════

describe('createAdverseEvent', () => {
  it('creates an AE successfully', async () => {
    const aeData = { id: 'ae-1', event_number: 1, ...validAeInput }

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
      if (callCount === 2) {
        // count query
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }
      }
      // insert
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: aeData, error: null }),
          }),
        }),
      }
    })

    const result = await createAdverseEvent(TEST_STUDY_ID, validAeInput)
    expect(result.success).toBe(true)
  })

  it('returns error when user lacks edit permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await createAdverseEvent(TEST_STUDY_ID, validAeInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })

  it('returns error when user is monitor', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'monitor', siteId: null })

    const result = await createAdverseEvent(TEST_STUDY_ID, validAeInput)
    expect(result.success).toBe(false)
  })

  it('returns validation error for invalid input', async () => {
    const result = await createAdverseEvent(TEST_STUDY_ID, {
      participantId: 'not-a-uuid',
      description: '',
      onsetDate: '',
      severity: 'invalid' as any,
      relatedness: 'invalid' as any,
      outcome: 'invalid' as any,
      isSae: false,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Invalid input')
    }
  })

  it('returns error when participant not found', async () => {
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

    const result = await createAdverseEvent(TEST_STUDY_ID, validAeInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Participant not found')
    }
  })

  it('includes SAE criteria when isSae is true', async () => {
    const saeInput = {
      ...validAeInput,
      isSae: true,
      severity: 'severe' as const,
      saeCriteria: ['hospitalization', 'life_threatening'],
    }

    let insertPayload: any = null
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
      if (callCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }
      }
      return {
        insert: vi.fn().mockImplementation((data: any) => {
          insertPayload = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'ae-1', ...data }, error: null }),
            }),
          }
        }),
      }
    })

    await createAdverseEvent(TEST_STUDY_ID, saeInput)
    expect(insertPayload).not.toBeNull()
    expect(insertPayload.is_sae).toBe(true)
    expect(insertPayload.sae_criteria).toEqual(['hospitalization', 'life_threatening'])
    expect(insertPayload.sae_reported_at).toBeDefined()
  })

  it('sets sae_criteria to null when isSae is false', async () => {
    let insertPayload: any = null
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
      if (callCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }
      }
      return {
        insert: vi.fn().mockImplementation((data: any) => {
          insertPayload = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'ae-1', ...data }, error: null }),
            }),
          }
        }),
      }
    })

    await createAdverseEvent(TEST_STUDY_ID, { ...validAeInput, isSae: false, saeCriteria: ['something'] })
    expect(insertPayload.sae_criteria).toBeNull()
    expect(insertPayload.sae_reported_at).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════
// acknowledgeSAE
// ═══════════════════════════════════════════════════════════════

describe('acknowledgeSAE', () => {
  it('acknowledges an SAE successfully', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // AE lookup
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'ae-1', is_sae: true, sae_acknowledged_at: null },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      // update
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    })

    const result = await acknowledgeSAE('ae-1', TEST_STUDY_ID)
    expect(result.success).toBe(true)
  })

  it('returns error when user is not PI (only PI can acknowledge SAEs)', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'co_investigator', siteId: null })

    const result = await acknowledgeSAE('ae-1', TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('PI')
    }
  })

  it('returns error for data_entry role', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    const result = await acknowledgeSAE('ae-1', TEST_STUDY_ID)
    expect(result.success).toBe(false)
  })

  it('returns error for monitor role', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'monitor', siteId: null })

    const result = await acknowledgeSAE('ae-1', TEST_STUDY_ID)
    expect(result.success).toBe(false)
  })

  it('returns error when AE not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })

    const result = await acknowledgeSAE('nonexistent', TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('not found')
    }
  })

  it('returns error when AE is not an SAE', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'ae-1', is_sae: false, sae_acknowledged_at: null },
              error: null,
            }),
          }),
        }),
      }),
    })

    const result = await acknowledgeSAE('ae-1', TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('not a Serious Adverse Event')
    }
  })

  it('returns error when SAE is already acknowledged', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'ae-1', is_sae: true, sae_acknowledged_at: '2024-01-15T10:00:00Z' },
              error: null,
            }),
          }),
        }),
      }),
    })

    const result = await acknowledgeSAE('ae-1', TEST_STUDY_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('already been acknowledged')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// listAdverseEvents
// ═══════════════════════════════════════════════════════════════

describe('listAdverseEvents', () => {
  it('returns paginated AE list', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [{ id: 'ae-1' }],
                count: 1,
                error: null,
              }),
            }),
          }),
        }),
      }),
    })

    const result = await listAdverseEvents(TEST_STUDY_ID)
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(25)
  })

  it('applies participantId filter', async () => {
    // listAdverseEvents applies optional filters AFTER building the chain,
    // so we need a thenable chain where all methods return the chain and
    // the chain resolves when awaited.
    const chain: any = {}
    for (const method of ['select', 'eq', 'is', 'order', 'range']) {
      chain[method] = vi.fn((..._args: any[]) => chain)
    }
    chain.then = (resolve: any, _reject?: any) => Promise.resolve({ data: [], count: 0, error: null }).then(resolve)
    chain.catch = (_reject: any) => chain

    mockSupabase.from.mockReturnValue(chain)

    await listAdverseEvents(TEST_STUDY_ID, { participantId: TEST_PARTICIPANT_ID })
    // The eq should be called for both study_id and participant_id
    expect(chain.eq).toHaveBeenCalledWith('participant_id', TEST_PARTICIPANT_ID)
  })
})
