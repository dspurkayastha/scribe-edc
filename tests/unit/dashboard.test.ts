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

import { getDashboardMetrics } from '@/server/actions/dashboard'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireStudyAccess.mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null })
  mockRequireAuth.mockResolvedValue({ id: TEST_USER_ID })
})

/**
 * Creates a thenable chainable mock that resolves when awaited.
 * This is needed because the dashboard uses Promise.all() with chained Supabase queries.
 */
function createThenableChain(result: any) {
  const chain: any = {}
  for (const method of ['select', 'eq', 'is', 'in', 'not', 'order', 'single']) {
    chain[method] = vi.fn((..._args: any[]) => chain)
  }
  // Make it thenable so `await chain` and `Promise.all([chain])` work
  chain.then = (resolve: any, _reject?: any) => Promise.resolve(result).then(resolve)
  // Also support .catch for promises
  chain.catch = (_reject: any) => chain
  return chain
}

describe('getDashboardMetrics', () => {
  function setupDashboardMocks(overrides?: {
    targetSample?: number
    participantCount?: number
    participants?: any[]
    allocations?: any[]
    sites?: any[]
    openQueryCount?: number
    saeCount?: number
    responses?: any[]
    responseCount?: number
  }) {
    const opts = overrides ?? {}

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'studies') {
        return createThenableChain({ data: { target_sample: opts.targetSample ?? 100 }, error: null })
      }
      if (table === 'participants') {
        return createThenableChain({
          data: opts.participants ?? [{ id: '1', status: 'enrolled', site_id: 's1' }],
          count: opts.participantCount ?? 1,
          error: null,
        })
      }
      if (table === 'randomization_allocations') {
        return createThenableChain({
          data: opts.allocations ?? [{ arm_id: 'a1', study_arms: { name: 'Treatment A' } }],
          error: null,
        })
      }
      if (table === 'study_sites') {
        return createThenableChain({
          data: opts.sites ?? [{ id: 's1', name: 'Site 1' }],
          error: null,
        })
      }
      if (table === 'data_queries') {
        return createThenableChain({
          data: [],
          count: opts.openQueryCount ?? 0,
          error: null,
        })
      }
      if (table === 'adverse_events') {
        return createThenableChain({
          data: [],
          count: opts.saeCount ?? 0,
          error: null,
        })
      }
      if (table === 'form_responses') {
        return createThenableChain({
          data: opts.responses ?? [{ status: 'complete' }, { status: 'draft' }],
          count: opts.responseCount ?? 2,
          error: null,
        })
      }
      return createThenableChain({ data: null, error: null })
    })
  }

  it('returns enrollment metrics with target', async () => {
    setupDashboardMocks({ targetSample: 50, participantCount: 10 })

    const result = await getDashboardMetrics(TEST_STUDY_ID)
    expect(result.enrollment.label).toBe('Enrollment')
    expect(result.enrollment.value).toBe(10)
    expect(result.enrollment.target).toBe(50)
    expect(result.enrollment.description).toBe('10 / 50')
  })

  it('returns enrollment without target when target is 0', async () => {
    setupDashboardMocks({ targetSample: 0, participantCount: 5 })

    const result = await getDashboardMetrics(TEST_STUDY_ID)
    expect(result.enrollment.value).toBe(5)
    expect(result.enrollment.target).toBeUndefined()
    expect(result.enrollment.description).toBe('5 enrolled')
  })

  it('returns arm balance data', async () => {
    setupDashboardMocks({
      allocations: [
        { arm_id: 'a1', study_arms: { name: 'Treatment A' } },
        { arm_id: 'a1', study_arms: { name: 'Treatment A' } },
        { arm_id: 'a2', study_arms: { name: 'Placebo' } },
      ],
    })

    const result = await getDashboardMetrics(TEST_STUDY_ID)
    expect(result.armBalance).toContainEqual({ name: 'Treatment A', count: 2 })
    expect(result.armBalance).toContainEqual({ name: 'Placebo', count: 1 })
  })

  it('returns site enrollment data', async () => {
    setupDashboardMocks({
      sites: [{ id: 's1', name: 'Boston' }, { id: 's2', name: 'NYC' }],
      participants: [
        { id: '1', status: 'enrolled', site_id: 's1' },
        { id: '2', status: 'enrolled', site_id: 's1' },
        { id: '3', status: 'enrolled', site_id: 's2' },
      ],
    })

    const result = await getDashboardMetrics(TEST_STUDY_ID)
    expect(result.siteEnrollment).toContainEqual({ name: 'Boston', count: 2 })
    expect(result.siteEnrollment).toContainEqual({ name: 'NYC', count: 1 })
  })

  it('returns open queries count', async () => {
    setupDashboardMocks({ openQueryCount: 5 })

    const result = await getDashboardMetrics(TEST_STUDY_ID)
    expect(result.openQueries.value).toBe(5)
    expect(result.openQueries.label).toBe('Open Queries')
  })

  it('returns unacknowledged SAE count', async () => {
    setupDashboardMocks({ saeCount: 3 })

    const result = await getDashboardMetrics(TEST_STUDY_ID)
    expect(result.saeAlerts.value).toBe(3)
    expect(result.saeAlerts.label).toBe('Unacknowledged SAEs')
  })

  it('calculates form completeness percentage', async () => {
    setupDashboardMocks({
      responses: [
        { status: 'complete' },
        { status: 'complete' },
        { status: 'draft' },
        { status: 'verified' },
      ],
      responseCount: 4,
    })

    const result = await getDashboardMetrics(TEST_STUDY_ID)
    // 3 completed (complete + verified) out of 4 = 75%
    expect(result.formCompleteness.value).toBe('75%')
  })

  it('returns N/A for form completeness when no responses', async () => {
    setupDashboardMocks({
      responses: [],
      responseCount: 0,
    })

    const result = await getDashboardMetrics(TEST_STUDY_ID)
    expect(result.formCompleteness.value).toBe('N/A')
  })

  it('returns form status breakdown', async () => {
    setupDashboardMocks({
      responses: [
        { status: 'draft' },
        { status: 'draft' },
        { status: 'complete' },
        { status: 'locked' },
      ],
    })

    const result = await getDashboardMetrics(TEST_STUDY_ID)
    expect(result.formStatusBreakdown).toContainEqual({ status: 'draft', count: 2 })
    expect(result.formStatusBreakdown).toContainEqual({ status: 'complete', count: 1 })
    expect(result.formStatusBreakdown).toContainEqual({ status: 'locked', count: 1 })
  })

  it('handles null participants with no site (shows Unassigned)', async () => {
    setupDashboardMocks({
      sites: [{ id: 's1', name: 'Boston' }],
      participants: [
        { id: '1', status: 'enrolled', site_id: null },
      ],
    })

    const result = await getDashboardMetrics(TEST_STUDY_ID)
    expect(result.siteEnrollment).toContainEqual({ name: 'Unassigned', count: 1 })
  })
})
