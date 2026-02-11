import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER_ID, TEST_STUDY_ID, TEST_RESPONSE_ID } from './helpers'

// ─── Hoisted Mocks (available inside vi.mock factories) ───

const { mockSupabase, mockRequireStudyAccess, mockRequireAuth, mockCheckOptimisticLock } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  const mockRequireStudyAccess = vi.fn()
  const mockRequireAuth = vi.fn()
  const mockCheckOptimisticLock = vi.fn()

  return { mockSupabase, mockRequireStudyAccess, mockRequireAuth, mockCheckOptimisticLock }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

vi.mock('@/lib/auth/session', () => ({
  requireAuth: mockRequireAuth,
  requireStudyAccess: mockRequireStudyAccess,
}))

vi.mock('@/lib/utils/optimistic-lock', () => ({
  checkOptimisticLock: mockCheckOptimisticLock,
}))

import { completeForm, verifyForm, lockForm, unlockForm, editCompletedForm } from '@/server/actions/form-workflow'

const TIMESTAMP = '2024-01-15T00:00:00Z'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
  mockRequireAuth.mockResolvedValue({ id: TEST_USER_ID })
  mockCheckOptimisticLock.mockResolvedValue({ success: true, data: undefined })
})

function mockSuccessfulUpdate() {
  mockSupabase.from.mockReturnValue({
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  })
}

// ═══════════════════════════════════════════════════════════════
// completeForm
// ═══════════════════════════════════════════════════════════════

describe('completeForm', () => {
  it('completes a form successfully', async () => {
    mockSuccessfulUpdate()
    const result = await completeForm(TEST_RESPONSE_ID, TEST_STUDY_ID, TIMESTAMP)
    expect(result.success).toBe(true)
  })

  it('returns error when user lacks edit permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })
    const result = await completeForm(TEST_RESPONSE_ID, TEST_STUDY_ID, TIMESTAMP)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })

  it('returns error on optimistic lock conflict', async () => {
    mockCheckOptimisticLock.mockResolvedValueOnce({
      success: false,
      error: 'This record has been modified by another user. Please refresh and try again.',
    })
    const result = await completeForm(TEST_RESPONSE_ID, TEST_STUDY_ID, TIMESTAMP)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('modified by another user')
    }
  })

  it('returns error on database update failure', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        }),
      }),
    })
    const result = await completeForm(TEST_RESPONSE_ID, TEST_STUDY_ID, TIMESTAMP)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB error')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// verifyForm
// ═══════════════════════════════════════════════════════════════

describe('verifyForm', () => {
  it('verifies a form successfully', async () => {
    mockSuccessfulUpdate()
    const result = await verifyForm(TEST_RESPONSE_ID, TEST_STUDY_ID, TIMESTAMP)
    expect(result.success).toBe(true)
  })

  it('returns error when user lacks edit permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'monitor', siteId: null })
    const result = await verifyForm(TEST_RESPONSE_ID, TEST_STUDY_ID, TIMESTAMP)
    expect(result.success).toBe(false)
  })

  it('returns error on optimistic lock conflict', async () => {
    mockCheckOptimisticLock.mockResolvedValueOnce({
      success: false,
      error: 'Record modified',
    })
    const result = await verifyForm(TEST_RESPONSE_ID, TEST_STUDY_ID, TIMESTAMP)
    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// lockForm
// ═══════════════════════════════════════════════════════════════

describe('lockForm', () => {
  it('locks a form successfully', async () => {
    mockSuccessfulUpdate()
    const result = await lockForm(TEST_RESPONSE_ID, TEST_STUDY_ID, TIMESTAMP)
    expect(result.success).toBe(true)
  })

  it('returns error when user cannot lock forms (data_entry)', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })
    const result = await lockForm(TEST_RESPONSE_ID, TEST_STUDY_ID, TIMESTAMP)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })

  it('returns error when user cannot lock forms (read_only)', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })
    const result = await lockForm(TEST_RESPONSE_ID, TEST_STUDY_ID, TIMESTAMP)
    expect(result.success).toBe(false)
  })

  it('returns error when user cannot lock forms (monitor)', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'monitor', siteId: null })
    const result = await lockForm(TEST_RESPONSE_ID, TEST_STUDY_ID, TIMESTAMP)
    expect(result.success).toBe(false)
  })

  it('returns error on optimistic lock conflict', async () => {
    mockCheckOptimisticLock.mockResolvedValueOnce({
      success: false,
      error: 'Conflict',
    })
    const result = await lockForm(TEST_RESPONSE_ID, TEST_STUDY_ID, TIMESTAMP)
    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// unlockForm
// ═══════════════════════════════════════════════════════════════

describe('unlockForm', () => {
  it('unlocks a form successfully with valid reason', async () => {
    mockSuccessfulUpdate()
    const result = await unlockForm(TEST_RESPONSE_ID, TEST_STUDY_ID, 'Data correction needed', TIMESTAMP)
    expect(result.success).toBe(true)
  })

  it('returns error when reason is too short (< 5 chars)', async () => {
    const result = await unlockForm(TEST_RESPONSE_ID, TEST_STUDY_ID, 'abc', TIMESTAMP)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('reason')
      expect(result.error).toContain('minimum 5')
    }
  })

  it('returns error when reason is empty', async () => {
    const result = await unlockForm(TEST_RESPONSE_ID, TEST_STUDY_ID, '', TIMESTAMP)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('reason')
    }
  })

  it('returns error when reason is whitespace only', async () => {
    const result = await unlockForm(TEST_RESPONSE_ID, TEST_STUDY_ID, '    ', TIMESTAMP)
    expect(result.success).toBe(false)
  })

  it('returns error when user cannot lock forms', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })
    const result = await unlockForm(TEST_RESPONSE_ID, TEST_STUDY_ID, 'Valid reason here', TIMESTAMP)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })

  it('calls rpc to set reason_for_change', async () => {
    mockSuccessfulUpdate()
    await unlockForm(TEST_RESPONSE_ID, TEST_STUDY_ID, 'Data correction needed', TIMESTAMP)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('set_config', {
      setting: 'app.reason_for_change',
      value: 'Data correction needed',
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// editCompletedForm
// ═══════════════════════════════════════════════════════════════

describe('editCompletedForm', () => {
  it('edits completed form successfully with valid reason', async () => {
    mockSuccessfulUpdate()
    const result = await editCompletedForm(
      TEST_RESPONSE_ID,
      TEST_STUDY_ID,
      'Correcting typo in patient name',
      { name: 'Corrected Name' },
      TIMESTAMP
    )
    expect(result.success).toBe(true)
  })

  it('returns error when reason is too short (< 5 chars)', async () => {
    const result = await editCompletedForm(
      TEST_RESPONSE_ID,
      TEST_STUDY_ID,
      'fix',
      { name: 'X' },
      TIMESTAMP
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('reason')
      expect(result.error).toContain('minimum 5')
    }
  })

  it('returns error when reason is empty', async () => {
    const result = await editCompletedForm(
      TEST_RESPONSE_ID,
      TEST_STUDY_ID,
      '',
      { name: 'X' },
      TIMESTAMP
    )
    expect(result.success).toBe(false)
  })

  it('returns error when user lacks edit permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })
    const result = await editCompletedForm(
      TEST_RESPONSE_ID,
      TEST_STUDY_ID,
      'Valid reason here',
      { name: 'X' },
      TIMESTAMP
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Insufficient permissions')
    }
  })

  it('returns error on optimistic lock conflict', async () => {
    mockCheckOptimisticLock.mockResolvedValueOnce({
      success: false,
      error: 'Record was modified',
    })
    const result = await editCompletedForm(
      TEST_RESPONSE_ID,
      TEST_STUDY_ID,
      'Valid reason here',
      { name: 'X' },
      TIMESTAMP
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('modified')
    }
  })

  it('calls rpc to set reason_for_change', async () => {
    mockSuccessfulUpdate()
    await editCompletedForm(
      TEST_RESPONSE_ID,
      TEST_STUDY_ID,
      'Data correction reason',
      { name: 'Corrected' },
      TIMESTAMP
    )
    expect(mockSupabase.rpc).toHaveBeenCalledWith('set_config', {
      setting: 'app.reason_for_change',
      value: 'Data correction reason',
    })
  })
})
