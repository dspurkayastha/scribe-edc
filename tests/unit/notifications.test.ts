import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER_ID } from './helpers'

// ─── Hoisted Mocks (available inside vi.mock factories) ───

const { mockSupabase, mockRequireAuth } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
  }

  const mockRequireAuth = vi.fn()

  return { mockSupabase, mockRequireAuth }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

vi.mock('@/lib/auth/session', () => ({
  requireAuth: mockRequireAuth,
  requireStudyAccess: vi.fn().mockResolvedValue({ userId: TEST_USER_ID, role: 'pi', siteId: null }),
}))

import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/server/actions/notifications'

/**
 * Creates a thenable chainable mock that resolves when awaited.
 * All methods return the chain for chaining, and it resolves via .then().
 */
function createThenableChain(result: any) {
  const chain: any = {}
  const calls: Array<{ method: string; args: any[] }> = []

  for (const method of ['select', 'insert', 'update', 'eq', 'order', 'range', 'single']) {
    chain[method] = vi.fn((...args: any[]) => {
      calls.push({ method, args })
      return chain
    })
  }
  chain.then = (resolve: any, _reject?: any) => Promise.resolve(result).then(resolve)
  chain.catch = (_reject: any) => chain
  chain._calls = calls
  return chain
}

let lastChain: any = null

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAuth.mockResolvedValue({ id: TEST_USER_ID })

  lastChain = createThenableChain({ data: [], count: 0, error: null })
  mockSupabase.from.mockReturnValue(lastChain)
})

// ═══════════════════════════════════════════════════════════════
// getNotifications
// ═══════════════════════════════════════════════════════════════

describe('getNotifications', () => {
  it('returns paginated notifications with defaults', async () => {
    const mockNotifications = [
      { id: 'n1', title: 'Query assigned', is_read: false },
      { id: 'n2', title: 'SAE reported', is_read: true },
    ]

    lastChain = createThenableChain({ data: mockNotifications, count: 2, error: null })
    mockSupabase.from.mockReturnValue(lastChain)

    const result = await getNotifications()
    expect(result.data).toHaveLength(2)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
    expect(result.total).toBe(2)
  })

  it('applies unreadOnly filter', async () => {
    lastChain = createThenableChain({ data: [], count: 0, error: null })
    mockSupabase.from.mockReturnValue(lastChain)

    await getNotifications({ unreadOnly: true })
    expect(lastChain.eq).toHaveBeenCalledWith('is_read', false)
  })

  it('applies custom pagination', async () => {
    lastChain = createThenableChain({ data: [], count: 100, error: null })
    mockSupabase.from.mockReturnValue(lastChain)

    const result = await getNotifications({ page: 3, pageSize: 10 })
    expect(result.page).toBe(3)
    expect(result.pageSize).toBe(10)
    expect(result.totalPages).toBe(10)
    expect(lastChain.range).toHaveBeenCalledWith(20, 29)
  })
})

// ═══════════════════════════════════════════════════════════════
// getUnreadCount
// ═══════════════════════════════════════════════════════════════

describe('getUnreadCount', () => {
  it('returns the count of unread notifications', async () => {
    lastChain = createThenableChain({ count: 7 })
    mockSupabase.from.mockReturnValue(lastChain)

    const count = await getUnreadCount()
    expect(count).toBe(7)
  })

  it('returns 0 when no unread notifications', async () => {
    lastChain = createThenableChain({ count: 0 })
    mockSupabase.from.mockReturnValue(lastChain)

    const count = await getUnreadCount()
    expect(count).toBe(0)
  })

  it('returns 0 when count is null', async () => {
    lastChain = createThenableChain({ count: null })
    mockSupabase.from.mockReturnValue(lastChain)

    const count = await getUnreadCount()
    expect(count).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// markAsRead
// ═══════════════════════════════════════════════════════════════

describe('markAsRead', () => {
  it('marks a notification as read successfully', async () => {
    lastChain = createThenableChain({ error: null })
    mockSupabase.from.mockReturnValue(lastChain)

    const result = await markAsRead('n1')
    expect(result.success).toBe(true)
  })

  it('returns error on database failure', async () => {
    lastChain = createThenableChain({ error: { message: 'DB error' } })
    mockSupabase.from.mockReturnValue(lastChain)

    const result = await markAsRead('n1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB error')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// markAllAsRead
// ═══════════════════════════════════════════════════════════════

describe('markAllAsRead', () => {
  it('marks all unread notifications as read', async () => {
    lastChain = createThenableChain({ error: null })
    mockSupabase.from.mockReturnValue(lastChain)

    const result = await markAllAsRead()
    expect(result.success).toBe(true)
    // Should filter by user_id and is_read=false
    expect(lastChain.eq).toHaveBeenCalledWith('user_id', TEST_USER_ID)
    expect(lastChain.eq).toHaveBeenCalledWith('is_read', false)
  })

  it('returns error on database failure', async () => {
    lastChain = createThenableChain({ error: { message: 'DB error' } })
    mockSupabase.from.mockReturnValue(lastChain)

    const result = await markAllAsRead()
    expect(result.success).toBe(false)
  })
})
