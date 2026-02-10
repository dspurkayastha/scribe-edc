'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/session'
import type { ServerActionResult } from '@/types/app'
import type { StudyRow, StudyArmRow, StudySiteRow } from '@/types/database'
import { z } from 'zod'

const createStudySchema = z.object({
  organizationId: z.string().uuid(),
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
    return { success: false, error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
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

export async function getStudyById(studyId: string): Promise<StudyRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('studies')
    .select('*')
    .eq('id', studyId)
    .single()

  return data as StudyRow | null
}

export async function updateStudySettings(
  studyId: string,
  settings: Record<string, unknown>
): Promise<ServerActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('studies')
    .update({ settings })
    .eq('id', studyId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
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
