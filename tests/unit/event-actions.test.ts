import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER_ID, TEST_STUDY_ID } from './helpers'

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
  requireStudyAccess: mockRequireStudyAccess,
}))

import {
  createEventForm,
  updateEventForm,
  deleteEventForm,
  createStudyPeriod,
  updateStudyPeriod,
  createEligibilityCriteria,
  updateEligibilityCriteria,
  deleteEligibilityCriteria,
} from '@/server/actions/study'

const TEST_EVENT_ID = '00000000-0000-4000-8000-000000000010'
const TEST_FORM_ID = '00000000-0000-4000-8000-000000000011'
const TEST_EVENT_FORM_ID = '00000000-0000-4000-8000-000000000012'
const TEST_PERIOD_ID = '00000000-0000-4000-8000-000000000013'
const TEST_CRITERIA_ID = '00000000-0000-4000-8000-000000000014'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
})

// ═══════════════════════════════════════════════════════════════
// createEventForm
// ═══════════════════════════════════════════════════════════════

describe('createEventForm', () => {
  it('creates an event-form assignment', async () => {
    const insertedRow = { id: TEST_EVENT_FORM_ID, event_id: TEST_EVENT_ID, form_id: TEST_FORM_ID, is_required: true, sort_order: 1 }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
        }),
      }),
    })

    const result = await createEventForm(TEST_STUDY_ID, {
      eventId: TEST_EVENT_ID,
      formId: TEST_FORM_ID,
      isRequired: true,
      sortOrder: 1,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(TEST_EVENT_FORM_ID)
    }
    expect(mockRequireStudyAccess).toHaveBeenCalledWith(TEST_STUDY_ID)
  })

  it('rejects invalid UUIDs via Zod validation', async () => {
    const result = await createEventForm(TEST_STUDY_ID, {
      eventId: 'not-a-uuid',
      formId: TEST_FORM_ID,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
  })

  it('returns error on database failure', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'duplicate' } }),
        }),
      }),
    })

    const result = await createEventForm(TEST_STUDY_ID, {
      eventId: TEST_EVENT_ID,
      formId: TEST_FORM_ID,
    })

    expect(result.success).toBe(false)
  })

  it('returns specific error for duplicate assignment', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'unique_violation' } }),
        }),
      }),
    })

    const result = await createEventForm(TEST_STUDY_ID, {
      eventId: TEST_EVENT_ID,
      formId: TEST_FORM_ID,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('already assigned')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// updateEventForm
// ═══════════════════════════════════════════════════════════════

describe('updateEventForm', () => {
  it('updates isRequired field', async () => {
    const updatedRow = { id: TEST_EVENT_FORM_ID, event_id: TEST_EVENT_ID, form_id: TEST_FORM_ID, is_required: false, sort_order: 1 }
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
          }),
        }),
      }),
    })

    const result = await updateEventForm(TEST_STUDY_ID, TEST_EVENT_FORM_ID, {
      isRequired: false,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_required).toBe(false)
    }
  })

  it('returns error on database failure', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          }),
        }),
      }),
    })

    const result = await updateEventForm(TEST_STUDY_ID, TEST_EVENT_FORM_ID, {
      isRequired: true,
    })

    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// deleteEventForm
// ═══════════════════════════════════════════════════════════════

describe('deleteEventForm', () => {
  it('deletes an event-form assignment', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    const result = await deleteEventForm(TEST_STUDY_ID, TEST_EVENT_FORM_ID)

    expect(result.success).toBe(true)
  })

  it('returns error on database failure', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'foreign key violation' } }),
      }),
    })

    const result = await deleteEventForm(TEST_STUDY_ID, TEST_EVENT_FORM_ID)

    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// createStudyPeriod
// ═══════════════════════════════════════════════════════════════

describe('createStudyPeriod', () => {
  it('creates a period with valid input', async () => {
    const insertedRow = {
      id: TEST_PERIOD_ID,
      study_id: TEST_STUDY_ID,
      name: 'washout_1',
      label: 'Washout 1',
      period_type: 'washout',
      duration_days: 14,
      sort_order: 1,
      is_active: true,
    }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
        }),
      }),
    })

    const result = await createStudyPeriod(TEST_STUDY_ID, {
      name: 'washout_1',
      label: 'Washout 1',
      periodType: 'washout',
      durationDays: 14,
      sortOrder: 1,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.period_type).toBe('washout')
      expect(result.data.duration_days).toBe(14)
    }
  })

  it('returns error on database failure', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'check constraint' } }),
        }),
      }),
    })

    const result = await createStudyPeriod(TEST_STUDY_ID, {
      name: '',
      label: 'Test',
      periodType: 'treatment',
    })

    expect(result.success).toBe(false)
  })

  it('returns specific error for duplicate name', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'unique_violation' } }),
        }),
      }),
    })

    const result = await createStudyPeriod(TEST_STUDY_ID, {
      name: 'test',
      label: 'Test',
      periodType: 'treatment',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('already exists')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// updateStudyPeriod
// ═══════════════════════════════════════════════════════════════

describe('updateStudyPeriod', () => {
  it('updates period fields', async () => {
    const updatedRow = {
      id: TEST_PERIOD_ID,
      study_id: TEST_STUDY_ID,
      name: 'washout_updated',
      label: 'Washout Updated',
      period_type: 'washout',
      duration_days: 21,
      sort_order: 2,
      is_active: true,
    }
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
            }),
          }),
        }),
      }),
    })

    const result = await updateStudyPeriod(TEST_PERIOD_ID, TEST_STUDY_ID, {
      label: 'Washout Updated',
      durationDays: 21,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).toBe('Washout Updated')
    }
  })

  it('returns error on database failure', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
            }),
          }),
        }),
      }),
    })

    const result = await updateStudyPeriod(TEST_PERIOD_ID, TEST_STUDY_ID, {
      label: 'Test',
    })

    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// createEligibilityCriteria
// ═══════════════════════════════════════════════════════════════

describe('createEligibilityCriteria', () => {
  it('creates inclusion criteria', async () => {
    const insertedRow = {
      id: TEST_CRITERIA_ID,
      study_id: TEST_STUDY_ID,
      label: 'Age >= 18',
      rule: 'age >= 18',
      type: 'inclusion',
      sort_order: 1,
    }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
        }),
      }),
    })

    const result = await createEligibilityCriteria(TEST_STUDY_ID, {
      label: 'Age >= 18',
      rule: 'age >= 18',
      type: 'inclusion',
      sortOrder: 1,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('inclusion')
      expect(result.data.label).toBe('Age >= 18')
    }
  })

  it('creates exclusion criteria', async () => {
    const insertedRow = {
      id: TEST_CRITERIA_ID,
      study_id: TEST_STUDY_ID,
      label: 'Pregnant',
      rule: 'pregnant == 1',
      type: 'exclusion',
      sort_order: 2,
    }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
        }),
      }),
    })

    const result = await createEligibilityCriteria(TEST_STUDY_ID, {
      label: 'Pregnant',
      rule: 'pregnant == 1',
      type: 'exclusion',
      sortOrder: 2,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('exclusion')
    }
  })

  it('returns error on database failure', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'check constraint' } }),
        }),
      }),
    })

    const result = await createEligibilityCriteria(TEST_STUDY_ID, {
      label: 'Test',
      rule: 'age >= 18',
      type: 'inclusion',
    })

    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// updateEligibilityCriteria
// ═══════════════════════════════════════════════════════════════

describe('updateEligibilityCriteria', () => {
  it('updates criteria fields', async () => {
    const updatedRow = {
      id: TEST_CRITERIA_ID,
      study_id: TEST_STUDY_ID,
      label: 'Age >= 21',
      rule: 'age >= 21',
      type: 'inclusion',
      sort_order: 1,
    }
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
            }),
          }),
        }),
      }),
    })

    const result = await updateEligibilityCriteria(TEST_CRITERIA_ID, TEST_STUDY_ID, {
      label: 'Age >= 21',
      rule: 'age >= 21',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).toBe('Age >= 21')
    }
  })

  it('returns error on database failure', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
            }),
          }),
        }),
      }),
    })

    const result = await updateEligibilityCriteria(TEST_CRITERIA_ID, TEST_STUDY_ID, {
      label: 'Test',
    })

    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// deleteEligibilityCriteria
// ═══════════════════════════════════════════════════════════════

describe('deleteEligibilityCriteria', () => {
  it('deletes criteria', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    })

    const result = await deleteEligibilityCriteria(TEST_CRITERIA_ID, TEST_STUDY_ID)

    expect(result.success).toBe(true)
  })

  it('returns error on database failure', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'constraint' } }),
        }),
      }),
    })

    const result = await deleteEligibilityCriteria(TEST_CRITERIA_ID, TEST_STUDY_ID)

    expect(result.success).toBe(false)
  })
})
