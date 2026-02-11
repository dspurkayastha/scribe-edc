import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER_ID, TEST_STUDY_ID, TEST_PARTICIPANT_ID, TEST_ARM_ID } from './helpers'

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

import { randomizeParticipant } from '@/server/actions/randomization'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
  mockRequireAuth.mockResolvedValue({ id: TEST_USER_ID })
})

describe('randomizeParticipant', () => {
  function setupMocks(overrides: {
    participant?: any
    existingAllocation?: any
    arms?: any[]
    allocationInsertResult?: any
    statusUpdateError?: any
  }) {
    let callCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      callCount++

      if (table === 'participants') {
        if (callCount <= 1) {
          // participant lookup
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: overrides.participant ?? null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        // participant status update
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: overrides.statusUpdateError ?? null,
            }),
          }),
        }
      }

      if (table === 'randomization_allocations') {
        if (!overrides.allocationInsertResult) {
          // existing allocation check
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: overrides.existingAllocation ?? null,
                  error: null,
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'alloc-1', arm_id: TEST_ARM_ID, study_id: TEST_STUDY_ID },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: overrides.existingAllocation ?? null,
                error: null,
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(overrides.allocationInsertResult),
            }),
          }),
        }
      }

      if (table === 'study_arms') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: overrides.arms ?? null,
                  error: null,
                }),
              }),
            }),
          }),
        }
      }

      return { select: vi.fn().mockReturnThis() }
    })
  }

  it('returns error when user lacks randomize permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    const result = await randomizeParticipant(TEST_STUDY_ID, TEST_PARTICIPANT_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })

  it('returns error when user lacks randomize permission (read_only)', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await randomizeParticipant(TEST_STUDY_ID, TEST_PARTICIPANT_ID)
    expect(result.success).toBe(false)
  })

  it('returns error when user lacks randomize permission (monitor)', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'monitor', siteId: null })

    const result = await randomizeParticipant(TEST_STUDY_ID, TEST_PARTICIPANT_ID)
    expect(result.success).toBe(false)
  })

  it('returns error when participant not found', async () => {
    setupMocks({ participant: null })

    const result = await randomizeParticipant(TEST_STUDY_ID, TEST_PARTICIPANT_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Participant not found')
    }
  })

  it('returns error when participant is not enrolled', async () => {
    setupMocks({
      participant: { id: TEST_PARTICIPANT_ID, status: 'screening', study_id: TEST_STUDY_ID },
    })

    const result = await randomizeParticipant(TEST_STUDY_ID, TEST_PARTICIPANT_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('must be enrolled')
      expect(result.error).toContain('screening')
    }
  })

  it('returns error when participant already randomized (duplicate prevention)', async () => {
    setupMocks({
      participant: { id: TEST_PARTICIPANT_ID, status: 'enrolled', study_id: TEST_STUDY_ID },
      existingAllocation: { id: 'existing-alloc' },
    })

    const result = await randomizeParticipant(TEST_STUDY_ID, TEST_PARTICIPANT_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('already been randomized')
    }
  })

  it('returns error when no active study arms configured', async () => {
    setupMocks({
      participant: { id: TEST_PARTICIPANT_ID, status: 'enrolled', study_id: TEST_STUDY_ID },
      existingAllocation: null,
      arms: [],
    })

    const result = await randomizeParticipant(TEST_STUDY_ID, TEST_PARTICIPANT_ID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('No active study arms')
    }
  })

  it('successfully randomizes an enrolled participant', async () => {
    const arms = [
      { id: 'arm-a', name: 'Treatment A', allocation: 1, is_active: true },
      { id: 'arm-b', name: 'Treatment B', allocation: 1, is_active: true },
    ]

    // We need to control Math.random for deterministic test
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.3) // should select first arm (0.3 * 2 = 0.6 < 1)

    setupMocks({
      participant: { id: TEST_PARTICIPANT_ID, status: 'enrolled', study_id: TEST_STUDY_ID },
      existingAllocation: null,
      arms,
    })

    const result = await randomizeParticipant(TEST_STUDY_ID, TEST_PARTICIPANT_ID)
    expect(result.success).toBe(true)

    randomSpy.mockRestore()
  })
})
