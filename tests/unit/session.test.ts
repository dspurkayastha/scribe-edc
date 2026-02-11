import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted Mocks (available inside vi.mock factories) ───

const { mockSupabase, mockRedirect } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }

  const mockRedirect = vi.fn()

  return { mockSupabase, mockRedirect }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

// Mock next/navigation redirect
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error(`REDIRECT:${url}`)
  },
}))

import { getSession, getUser, getUserMemberships, requireAuth, requireStudyAccess } from '@/lib/auth/session'

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
})

// ═══════════════════════════════════════════════════════════════
// getSession
// ═══════════════════════════════════════════════════════════════

describe('getSession', () => {
  it('returns null when no session exists', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const session = await getSession()
    expect(session).toBeNull()
  })

  it('returns session when available', async () => {
    const session = { access_token: 'test-token', user: mockUser }
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session } })
    const result = await getSession()
    expect(result).toEqual(session)
  })
})

// ═══════════════════════════════════════════════════════════════
// getUser
// ═══════════════════════════════════════════════════════════════

describe('getUser', () => {
  it('returns null when no user is authenticated', async () => {
    const user = await getUser()
    expect(user).toBeNull()
  })

  it('returns user when authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
    const user = await getUser()
    expect(user).toEqual(mockUser)
  })
})

// ═══════════════════════════════════════════════════════════════
// getUserMemberships
// ═══════════════════════════════════════════════════════════════

describe('getUserMemberships', () => {
  it('returns empty array when no session', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const memberships = await getUserMemberships()
    expect(memberships).toEqual([])
  })

  it('parses memberships from JWT access_token', async () => {
    const claims = {
      sub: 'user-123',
      memberships: [
        { study_id: 'study-1', role: 'pi', site_id: null },
        { study_id: 'study-2', role: 'data_entry', site_id: 'site-1' },
      ],
    }
    const accessToken = `header.${btoa(JSON.stringify(claims))}.signature`

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: accessToken } },
    })

    const memberships = await getUserMemberships()
    expect(memberships).toHaveLength(2)
    expect(memberships[0].study_id).toBe('study-1')
    expect(memberships[0].role).toBe('pi')
    expect(memberships[1].site_id).toBe('site-1')
  })

  it('returns empty array when JWT has no memberships claim', async () => {
    const claims = { sub: 'user-123' }
    const accessToken = `header.${btoa(JSON.stringify(claims))}.signature`

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: accessToken } },
    })

    const memberships = await getUserMemberships()
    expect(memberships).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════
// requireAuth
// ═══════════════════════════════════════════════════════════════

describe('requireAuth', () => {
  it('returns user when authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
    const user = await requireAuth()
    expect(user).toEqual(mockUser)
  })

  it('redirects to /login when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    await expect(requireAuth()).rejects.toThrow('REDIRECT:/login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })
})

// ═══════════════════════════════════════════════════════════════
// requireStudyAccess
// ═══════════════════════════════════════════════════════════════

describe('requireStudyAccess', () => {
  it('returns userId, role, and siteId for valid membership', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

    const claims = {
      sub: 'user-123',
      memberships: [
        { study_id: 'study-1', role: 'pi', site_id: null },
      ],
    }
    const accessToken = `header.${btoa(JSON.stringify(claims))}.signature`
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: accessToken } },
    })

    const result = await requireStudyAccess('study-1')
    expect(result.userId).toBe('user-123')
    expect(result.role).toBe('pi')
    expect(result.siteId).toBeNull()
  })

  it('redirects to /select-study when user has no membership for the study', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

    const claims = {
      sub: 'user-123',
      memberships: [
        { study_id: 'other-study', role: 'pi', site_id: null },
      ],
    }
    const accessToken = `header.${btoa(JSON.stringify(claims))}.signature`
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: accessToken } },
    })

    await expect(requireStudyAccess('study-1')).rejects.toThrow('REDIRECT:/select-study')
    expect(mockRedirect).toHaveBeenCalledWith('/select-study')
  })

  it('redirects to /login when not authenticated at all', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    await expect(requireStudyAccess('study-1')).rejects.toThrow('REDIRECT:/login')
  })
})
