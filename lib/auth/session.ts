import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { JWTMembership } from '@/types/app'
import type { MemberRole } from '@/types/database'

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserMemberships(): Promise<JWTMembership[]> {
  const session = await getSession()
  if (!session) return []

  const claims = session.access_token
    ? JSON.parse(atob(session.access_token.split('.')[1]))
    : null

  return claims?.memberships ?? []
}

export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireStudyAccess(studyId: string): Promise<{
  userId: string
  role: MemberRole
  siteId: string | null
}> {
  const user = await requireAuth()
  const memberships = await getUserMemberships()

  const membership = memberships.find((m) => m.study_id === studyId)
  if (!membership) {
    redirect('/select-study')
  }

  return {
    userId: user.id,
    role: membership.role as MemberRole,
    siteId: membership.site_id,
  }
}

export async function getUserProfile() {
  const supabase = await createClient()
  const user = await requireAuth()

  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}
