import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER_ID, TEST_STUDY_ID } from './helpers'

const { mockSupabase, mockRequireStudyAccess } = vi.hoisted(() => {
  const mockSupabase = { from: vi.fn() }
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

import {
  createOptionList,
  updateOptionList,
  deleteOptionList,
  listOptionLists,
} from '@/server/actions/option-lists'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
})

describe('createOptionList', () => {
  it('creates an option list', async () => {
    const mockData = { id: 'ol-1', slug: 'countries', label: 'Countries', options: [{ value: 'us', label: 'US' }] }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    })

    const result = await createOptionList({
      studyId: TEST_STUDY_ID,
      slug: 'countries',
      label: 'Countries',
      options: [{ value: 'us', label: 'United States' }],
    })
    expect(result.success).toBe(true)
  })

  it('returns error for invalid input', async () => {
    const result = await createOptionList({
      studyId: TEST_STUDY_ID,
      slug: 'INVALID',
      label: '',
      options: [],
    })
    expect(result.success).toBe(false)
  })

  it('returns error for unauthorized user', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })
    const result = await createOptionList({
      studyId: TEST_STUDY_ID,
      slug: 'countries',
      label: 'Countries',
      options: [{ value: 'us', label: 'US' }],
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('permission')
  })

  it('returns error on duplicate slug', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'unique' } }),
        }),
      }),
    })

    const result = await createOptionList({
      studyId: TEST_STUDY_ID,
      slug: 'countries',
      label: 'Countries',
      options: [{ value: 'us', label: 'US' }],
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('slug already exists')
  })
})

describe('updateOptionList', () => {
  it('updates an option list', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'ol-1', label: 'Updated' },
                error: null,
              }),
            }),
          }),
        }),
      }),
    })

    const result = await updateOptionList({
      id: '00000000-0000-4000-8000-000000000099',
      studyId: TEST_STUDY_ID,
      label: 'Updated',
    })
    expect(result.success).toBe(true)
  })
})

describe('deleteOptionList', () => {
  it('deletes an unreferenced option list', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // form_definitions check
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      }
      if (callCount === 2) {
        // option_lists slug lookup
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { slug: 'countries' }, error: null }),
            }),
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

    const result = await deleteOptionList('ol-1', TEST_STUDY_ID)
    expect(result.success).toBe(true)
  })
})

describe('listOptionLists', () => {
  it('returns option lists for a study', async () => {
    const lists = [
      { id: 'ol-1', slug: 'countries', label: 'Countries' },
      { id: 'ol-2', slug: 'states', label: 'States' },
    ]
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: lists, error: null }),
        }),
      }),
    })

    const result = await listOptionLists(TEST_STUDY_ID)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toHaveLength(2)
  })
})
