import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER_ID, TEST_STUDY_ID } from './helpers'

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

import { getAuditLog, getRecordHistory } from '@/server/actions/audit'

// Create a chainable mock that tracks calls and is thenable
function createAuditChain(result: { data: any; count: number }) {
  const calls: Array<{ method: string; args: any[] }> = []

  const chain: any = {}
  for (const method of ['select', 'eq', 'gte', 'lte', 'order', 'range']) {
    chain[method] = vi.fn((...args: any[]) => {
      calls.push({ method, args })
      return chain
    })
  }

  // Make it thenable so `await query` works
  chain.then = (resolve: any) => resolve(result)
  chain._calls = calls

  return chain
}

let lastChain: any = null

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
  mockRequireAuth.mockResolvedValue({ id: TEST_USER_ID })

  lastChain = createAuditChain({ data: [], count: 0 })
  mockSupabase.from.mockReturnValue(lastChain)
})

// ═══════════════════════════════════════════════════════════════
// getAuditLog
// ═══════════════════════════════════════════════════════════════

describe('getAuditLog', () => {
  it('returns empty result when user lacks view_audit_trail permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await getAuditLog(TEST_STUDY_ID)
    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
    expect(result.totalPages).toBe(0)
  })

  it('returns paginated audit log entries', async () => {
    const mockEntries = [
      { id: 'al-1', table_name: 'form_responses', action: 'UPDATE' },
      { id: 'al-2', table_name: 'participants', action: 'INSERT' },
    ]

    lastChain = createAuditChain({ data: mockEntries, count: 2 })
    mockSupabase.from.mockReturnValue(lastChain)

    const result = await getAuditLog(TEST_STUDY_ID)
    expect(result.data).toHaveLength(2)
    expect(result.total).toBe(2)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(25)
    expect(result.totalPages).toBe(1)
  })

  it('applies tableName filter', async () => {
    lastChain = createAuditChain({ data: [], count: 0 })
    mockSupabase.from.mockReturnValue(lastChain)

    await getAuditLog(TEST_STUDY_ID, { tableName: 'form_responses' })
    expect(lastChain.eq).toHaveBeenCalledWith('table_name', 'form_responses')
  })

  it('applies action filter', async () => {
    lastChain = createAuditChain({ data: [], count: 0 })
    mockSupabase.from.mockReturnValue(lastChain)

    await getAuditLog(TEST_STUDY_ID, { action: 'UPDATE' })
    expect(lastChain.eq).toHaveBeenCalledWith('action', 'UPDATE')
  })

  it('applies userId filter', async () => {
    lastChain = createAuditChain({ data: [], count: 0 })
    mockSupabase.from.mockReturnValue(lastChain)

    await getAuditLog(TEST_STUDY_ID, { userId: 'user-123' })
    expect(lastChain.eq).toHaveBeenCalledWith('changed_by', 'user-123')
  })

  it('applies date range filters', async () => {
    lastChain = createAuditChain({ data: [], count: 0 })
    mockSupabase.from.mockReturnValue(lastChain)

    await getAuditLog(TEST_STUDY_ID, {
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
    })
    expect(lastChain.gte).toHaveBeenCalledWith('changed_at', '2024-01-01')
    expect(lastChain.lte).toHaveBeenCalledWith('changed_at', '2024-12-31')
  })

  it('applies recordId filter', async () => {
    lastChain = createAuditChain({ data: [], count: 0 })
    mockSupabase.from.mockReturnValue(lastChain)

    await getAuditLog(TEST_STUDY_ID, { recordId: 'rec-123' })
    expect(lastChain.eq).toHaveBeenCalledWith('record_id', 'rec-123')
  })

  it('calculates pagination correctly', async () => {
    lastChain = createAuditChain({ data: [], count: 50 })
    mockSupabase.from.mockReturnValue(lastChain)

    const result = await getAuditLog(TEST_STUDY_ID, { page: 2, pageSize: 10 })
    expect(result.page).toBe(2)
    expect(result.pageSize).toBe(10)
    expect(result.totalPages).toBe(5)
    expect(lastChain.range).toHaveBeenCalledWith(10, 19)
  })

  it('allows monitor role to view audit trail', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'monitor', siteId: null })
    lastChain = createAuditChain({ data: [{ id: 'al-1' }], count: 1 })
    mockSupabase.from.mockReturnValue(lastChain)

    const result = await getAuditLog(TEST_STUDY_ID)
    expect(result.data).toHaveLength(1)
  })

  it('allows data_entry role to view audit trail', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })
    lastChain = createAuditChain({ data: [{ id: 'al-1' }], count: 1 })
    mockSupabase.from.mockReturnValue(lastChain)

    const result = await getAuditLog(TEST_STUDY_ID)
    expect(result.data).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// getRecordHistory
// ═══════════════════════════════════════════════════════════════

describe('getRecordHistory', () => {
  it('returns history for a record', async () => {
    const mockEntries = [
      { id: 'al-1', action: 'UPDATE', changed_at: '2024-01-15' },
      { id: 'al-2', action: 'INSERT', changed_at: '2024-01-10' },
    ]

    lastChain = createAuditChain({ data: mockEntries, count: 2 })
    mockSupabase.from.mockReturnValue(lastChain)

    const result = await getRecordHistory('rec-123', TEST_STUDY_ID)
    expect(result).toHaveLength(2)
  })

  it('returns empty array when user lacks audit trail permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await getRecordHistory('rec-123', TEST_STUDY_ID)
    expect(result).toEqual([])
  })
})
