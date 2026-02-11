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

import { exportWideCsv, exportLongCsv, exportJson } from '@/server/actions/exports'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
  mockRequireAuth.mockResolvedValue({ id: TEST_USER_ID })
})

const formSchema = {
  pages: [{
    id: 'p1',
    title: 'Test',
    sections: [{
      id: 's1',
      title: 'Section',
      fields: [
        { id: 'name', type: 'text', label: 'Name' },
        { id: 'age', type: 'integer', label: 'Age' },
      ],
    }],
  }],
}

function setupExportMocks(opts: { formDef?: any; responses?: any[] }) {
  let callCount = 0
  mockSupabase.from.mockImplementation(() => {
    callCount++
    if (callCount === 1) {
      // form_definitions lookup
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: opts.formDef ?? null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }
    }
    // form_responses query
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: opts.responses ?? null,
                error: null,
              }),
            }),
          }),
        }),
      }),
    }
  })
}

// ═══════════════════════════════════════════════════════════════
// exportWideCsv
// ═══════════════════════════════════════════════════════════════

describe('exportWideCsv', () => {
  it('returns error when user lacks export permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    const result = await exportWideCsv(TEST_STUDY_ID, 'demographics')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Insufficient permissions')
  })

  it('returns error when form definition not found', async () => {
    setupExportMocks({ formDef: null })
    const result = await exportWideCsv(TEST_STUDY_ID, 'nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Form definition not found')
  })

  it('returns error when no data to export', async () => {
    setupExportMocks({
      formDef: { id: 'f1', schema: formSchema },
      responses: [],
    })
    const result = await exportWideCsv(TEST_STUDY_ID, 'demographics')
    expect(result.success).toBe(false)
    expect(result.error).toContain('No data to export')
  })

  it('generates CSV with correct headers and data', async () => {
    setupExportMocks({
      formDef: { id: 'f1', schema: formSchema },
      responses: [
        {
          data: { name: 'John', age: 30 },
          status: 'complete',
          participants: { study_number: 'SCR-001', status: 'enrolled' },
        },
        {
          data: { name: 'Jane', age: 25 },
          status: 'draft',
          participants: { study_number: 'SCR-002', status: 'screening' },
        },
      ],
    })

    const result = await exportWideCsv(TEST_STUDY_ID, 'demographics')
    expect(result.success).toBe(true)
    expect(result.csv).toBeDefined()

    const lines = result.csv!.split('\n')
    expect(lines[0]).toBe('study_number,participant_status,form_status,name,age')
    expect(lines[1]).toBe('SCR-001,enrolled,complete,John,30')
    expect(lines[2]).toBe('SCR-002,screening,draft,Jane,25')
  })

  it('escapes commas and quotes in CSV values', async () => {
    setupExportMocks({
      formDef: { id: 'f1', schema: formSchema },
      responses: [
        {
          data: { name: 'Last, First', age: 30 },
          status: 'complete',
          participants: { study_number: 'SCR-001', status: 'enrolled' },
        },
      ],
    })

    const result = await exportWideCsv(TEST_STUDY_ID, 'demographics')
    expect(result.success).toBe(true)
    // "Last, First" should be quoted
    expect(result.csv).toContain('"Last, First"')
  })

  it('handles null values as empty strings', async () => {
    setupExportMocks({
      formDef: { id: 'f1', schema: formSchema },
      responses: [
        {
          data: { name: 'John', age: null },
          status: 'draft',
          participants: { study_number: 'SCR-001', status: 'enrolled' },
        },
      ],
    })

    const result = await exportWideCsv(TEST_STUDY_ID, 'demographics')
    expect(result.success).toBe(true)
    const lines = result.csv!.split('\n')
    // age should be empty string
    expect(lines[1]).toBe('SCR-001,enrolled,draft,John,')
  })

  it('joins array values with semicolons', async () => {
    const arraySchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 's1',
          title: 'Section',
          fields: [
            { id: 'conditions', type: 'checkbox', label: 'Conditions', options: [{ value: 'a', label: 'A' }] },
          ],
        }],
      }],
    }

    setupExportMocks({
      formDef: { id: 'f1', schema: arraySchema },
      responses: [
        {
          data: { conditions: ['diabetes', 'hypertension'] },
          status: 'complete',
          participants: { study_number: 'SCR-001', status: 'enrolled' },
        },
      ],
    })

    const result = await exportWideCsv(TEST_STUDY_ID, 'form')
    expect(result.success).toBe(true)
    expect(result.csv).toContain('diabetes;hypertension')
  })
})

// ═══════════════════════════════════════════════════════════════
// exportLongCsv
// ═══════════════════════════════════════════════════════════════

describe('exportLongCsv', () => {
  it('returns error when user lacks export permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'read_only', siteId: null })

    const result = await exportLongCsv(TEST_STUDY_ID, 'demographics')
    expect(result.success).toBe(false)
  })

  it('generates long-format CSV', async () => {
    setupExportMocks({
      formDef: { id: 'f1', schema: formSchema },
      responses: [
        {
          data: { name: 'John', age: 30 },
          status: 'complete',
          participants: { study_number: 'SCR-001' },
        },
      ],
    })

    const result = await exportLongCsv(TEST_STUDY_ID, 'demographics')
    expect(result.success).toBe(true)

    const lines = result.csv!.split('\n')
    expect(lines[0]).toBe('study_number,field_id,value,form_status')
    // Two data rows (name and age)
    expect(lines.length).toBe(3) // header + 2 data rows
    expect(lines[1]).toContain('SCR-001,name,John,complete')
    expect(lines[2]).toContain('SCR-001,age,30,complete')
  })

  it('returns error when no data to export', async () => {
    setupExportMocks({ formDef: { id: 'f1', schema: formSchema }, responses: [] })
    const result = await exportLongCsv(TEST_STUDY_ID, 'demographics')
    expect(result.success).toBe(false)
    expect(result.error).toContain('No data')
  })
})

// ═══════════════════════════════════════════════════════════════
// exportJson
// ═══════════════════════════════════════════════════════════════

describe('exportJson', () => {
  it('returns error when user lacks export permission', async () => {
    mockRequireStudyAccess.mockResolvedValueOnce({ userId: TEST_USER_ID, role: 'data_entry', siteId: null })

    const result = await exportJson(TEST_STUDY_ID, 'demographics')
    expect(result.success).toBe(false)
  })

  it('returns JSON string of responses', async () => {
    const responses = [
      { id: 'r1', data: { name: 'John' }, status: 'complete' },
    ]

    setupExportMocks({
      formDef: { id: 'f1', schema: formSchema },
      responses,
    })

    const result = await exportJson(TEST_STUDY_ID, 'demographics')
    expect(result.success).toBe(true)
    expect(result.json).toBeDefined()

    const parsed = JSON.parse(result.json!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('r1')
  })

  it('returns empty array JSON when no responses', async () => {
    setupExportMocks({
      formDef: { id: 'f1', schema: formSchema },
      responses: null as any,
    })

    const result = await exportJson(TEST_STUDY_ID, 'demographics')
    expect(result.success).toBe(true)
    expect(result.json).toBe('[]')
  })
})
