'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireStudyAccess } from '@/lib/auth/session'
import { canEditStudyConfig, canManageUsers } from '@/lib/auth/permissions'
import type { ServerActionResult } from '@/types/app'
import type { StudyRow, StudyArmRow, StudySiteRow, StudyEventRow, StudyMemberRow } from '@/types/database'
import { z } from 'zod'
import { zUUID } from '@/lib/validation'

const createStudySchema = z.object({
  organizationId: zUUID,
  name: z.string().min(2).max(200),
  shortName: z.string().min(1).max(50),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(50),
  idPrefix: z.string().regex(/^[A-Z0-9-]+$/).min(1).max(10),
  studyType: z.enum([
    'parallel_rct', 'crossover_rct', 'factorial', 'cluster_rct',
    'single_arm', 'observational', 'case_control', 'registry',
  ]),
  targetSample: z.number().int().positive().optional(),
  protocolId: z.string().optional(),
})

export async function createStudy(
  input: z.infer<typeof createStudySchema>
): Promise<ServerActionResult<StudyRow>> {
  const user = await requireAuth()
  const parsed = createStudySchema.safeParse(input)

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>
    const details = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; ')
    return { success: false, error: details || 'Invalid input', fieldErrors }
  }

  const supabase = await createClient()

  // Create study
  const { data: study, error } = await supabase
    .from('studies')
    .insert({
      organization_id: parsed.data.organizationId,
      name: parsed.data.name,
      short_name: parsed.data.shortName,
      slug: parsed.data.slug,
      id_prefix: parsed.data.idPrefix,
      study_type: parsed.data.studyType,
      target_sample: parsed.data.targetSample ?? null,
      protocol_id: parsed.data.protocolId ?? null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Study slug already exists in this organization' }
    }
    return { success: false, error: error.message }
  }

  // Auto-create study_members entry for the creator as PI
  const { error: memberError } = await supabase
    .from('study_members')
    .insert({
      study_id: study.id,
      user_id: user.id,
      role: 'pi',
    })

  if (memberError) {
    return { success: false, error: `Study created but failed to add you as PI: ${memberError.message}` }
  }

  return { success: true, data: study as StudyRow }
}

export async function getStudy(orgSlug: string, studySlug: string): Promise<StudyRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('studies')
    .select('*, organizations!inner(slug)')
    .eq('organizations.slug', orgSlug)
    .eq('slug', studySlug)
    .single()

  return data as StudyRow | null
}

export async function listStudies(): Promise<Array<StudyRow & { organization: { slug: string; name: string } }>> {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data } = await supabase
    .from('study_members')
    .select('study_id, studies(*, organizations(slug, name))')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (!data) return []

  return data
    .filter((d: any) => d.studies)
    .map((d: any) => ({
      ...d.studies,
      organization: d.studies.organizations,
    }))
}

export async function createStudyArm(
  studyId: string,
  input: { name: string; label: string; allocation?: number }
): Promise<ServerActionResult<StudyArmRow>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('study_arms')
    .insert({
      study_id: studyId,
      name: input.name,
      label: input.label,
      allocation: input.allocation ?? 1,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as StudyArmRow }
}

export async function createStudySite(
  studyId: string,
  input: { name: string; code: string }
): Promise<ServerActionResult<StudySiteRow>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('study_sites')
    .insert({
      study_id: studyId,
      name: input.name,
      code: input.code,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as StudySiteRow }
}

// ─── Update Actions ───

export async function updateStudyArm(
  armId: string,
  studyId: string,
  input: { name?: string; label?: string; allocation?: number; is_active?: boolean }
): Promise<ServerActionResult<StudyArmRow>> {
  const { role } = await requireStudyAccess(studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const supabase = await createClient()
  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.label !== undefined) updateData.label = input.label
  if (input.allocation !== undefined) updateData.allocation = input.allocation
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await supabase
    .from('study_arms')
    .update(updateData)
    .eq('id', armId)
    .eq('study_id', studyId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as StudyArmRow }
}

export async function updateStudySite(
  siteId: string,
  studyId: string,
  input: { name?: string; code?: string; is_active?: boolean }
): Promise<ServerActionResult<StudySiteRow>> {
  const { role } = await requireStudyAccess(studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const supabase = await createClient()
  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.code !== undefined) updateData.code = input.code
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await supabase
    .from('study_sites')
    .update(updateData)
    .eq('id', siteId)
    .eq('study_id', studyId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as StudySiteRow }
}

// ─── Study Events ───

export async function createStudyEvent(
  studyId: string,
  input: {
    name: string
    label: string
    event_type: StudyEventRow['event_type']
    day_offset?: number
    window_before?: number
    window_after?: number
    sort_order: number
  }
): Promise<ServerActionResult<StudyEventRow>> {
  const { role } = await requireStudyAccess(studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('study_events')
    .insert({
      study_id: studyId,
      name: input.name,
      label: input.label,
      event_type: input.event_type,
      day_offset: input.day_offset ?? null,
      window_before: input.window_before ?? 0,
      window_after: input.window_after ?? 0,
      sort_order: input.sort_order,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as StudyEventRow }
}

export async function updateStudyEvent(
  eventId: string,
  studyId: string,
  input: {
    name?: string
    label?: string
    event_type?: StudyEventRow['event_type']
    day_offset?: number | null
    window_before?: number
    window_after?: number
    is_active?: boolean
  }
): Promise<ServerActionResult<StudyEventRow>> {
  const { role } = await requireStudyAccess(studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const supabase = await createClient()
  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.label !== undefined) updateData.label = input.label
  if (input.event_type !== undefined) updateData.event_type = input.event_type
  if (input.day_offset !== undefined) updateData.day_offset = input.day_offset
  if (input.window_before !== undefined) updateData.window_before = input.window_before
  if (input.window_after !== undefined) updateData.window_after = input.window_after
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await supabase
    .from('study_events')
    .update(updateData)
    .eq('id', eventId)
    .eq('study_id', studyId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as StudyEventRow }
}

// ─── Study Members ───

export async function addStudyMember(
  studyId: string,
  input: { email: string; role: StudyMemberRow['role']; siteId?: string }
): Promise<ServerActionResult<StudyMemberRow>> {
  const { role } = await requireStudyAccess(studyId)
  if (!canManageUsers(role)) {
    return { success: false, error: 'You do not have permission to manage users' }
  }

  const supabase = await createClient()

  // Lookup user by email
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', input.email)
    .single()

  if (profileError || !profile) {
    return { success: false, error: `No user found with email: ${input.email}` }
  }

  // Check for existing membership
  const { data: existing } = await supabase
    .from('study_members')
    .select('id, is_active')
    .eq('study_id', studyId)
    .eq('user_id', profile.id)
    .single()

  if (existing) {
    if (existing.is_active) {
      return { success: false, error: 'This user is already a member of this study' }
    }
    // Re-activate the existing membership with the new role
    const { data, error } = await supabase
      .from('study_members')
      .update({ role: input.role, site_id: input.siteId ?? null, is_active: true })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data as StudyMemberRow }
  }

  const { data, error } = await supabase
    .from('study_members')
    .insert({
      study_id: studyId,
      user_id: profile.id,
      role: input.role,
      site_id: input.siteId ?? null,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as StudyMemberRow }
}

export async function removeStudyMember(
  memberId: string,
  studyId: string
): Promise<ServerActionResult> {
  const { role } = await requireStudyAccess(studyId)
  if (!canManageUsers(role)) {
    return { success: false, error: 'You do not have permission to manage users' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('study_members')
    .update({ is_active: false })
    .eq('id', memberId)
    .eq('study_id', studyId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function updateStudyMemberRole(
  memberId: string,
  studyId: string,
  role: StudyMemberRow['role']
): Promise<ServerActionResult<StudyMemberRow>> {
  const { role: callerRole } = await requireStudyAccess(studyId)
  if (!canManageUsers(callerRole)) {
    return { success: false, error: 'You do not have permission to manage users' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('study_members')
    .update({ role })
    .eq('id', memberId)
    .eq('study_id', studyId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as StudyMemberRow }
}
