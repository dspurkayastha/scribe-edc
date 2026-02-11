import { describe, it, expect, vi } from 'vitest'
import { checkOptimisticLock } from '@/lib/utils/optimistic-lock'

describe('checkOptimisticLock', () => {
  const TABLE = 'form_responses'
  const RECORD_ID = 'rec-123'
  const STUDY_ID = 'study-123'
  const EXPECTED_TS = '2024-01-15T10:00:00Z'

  function createMockSupabase(data: any) {
    const qb: any = {}
    qb.select = vi.fn().mockReturnValue(qb)
    qb.eq = vi.fn().mockReturnValue(qb)
    qb.single = vi.fn().mockResolvedValue({ data })
    return { from: vi.fn().mockReturnValue(qb), _qb: qb }
  }

  it('returns success when timestamps match', async () => {
    const supabase = createMockSupabase({ updated_at: EXPECTED_TS })

    const result = await checkOptimisticLock(supabase, TABLE, RECORD_ID, STUDY_ID, EXPECTED_TS)
    expect(result.success).toBe(true)
  })

  it('returns error when timestamps do not match (stale write)', async () => {
    const supabase = createMockSupabase({ updated_at: '2024-01-15T12:00:00Z' })

    const result = await checkOptimisticLock(supabase, TABLE, RECORD_ID, STUDY_ID, EXPECTED_TS)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('modified by another user')
    }
  })

  it('returns error when record not found', async () => {
    const supabase = createMockSupabase(null)

    const result = await checkOptimisticLock(supabase, TABLE, RECORD_ID, STUDY_ID, EXPECTED_TS)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Record not found')
    }
  })

  it('queries the correct table and filters by id and study_id', async () => {
    const supabase = createMockSupabase({ updated_at: EXPECTED_TS })

    await checkOptimisticLock(supabase, TABLE, RECORD_ID, STUDY_ID, EXPECTED_TS)

    expect(supabase.from).toHaveBeenCalledWith(TABLE)
    expect(supabase._qb.select).toHaveBeenCalledWith('updated_at')
    expect(supabase._qb.eq).toHaveBeenCalledWith('id', RECORD_ID)
    expect(supabase._qb.eq).toHaveBeenCalledWith('study_id', STUDY_ID)
  })

  it('returns success with matching timestamps of different string formats that are equal', async () => {
    const ts = '2024-06-15T00:00:00.000Z'
    const supabase = createMockSupabase({ updated_at: ts })

    const result = await checkOptimisticLock(supabase, TABLE, RECORD_ID, STUDY_ID, ts)
    expect(result.success).toBe(true)
  })
})
