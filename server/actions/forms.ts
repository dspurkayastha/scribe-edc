'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canEditData } from '@/lib/auth/permissions'
import type { ServerActionResult } from '@/types/app'
import type { FormResponseRow, FormDefinitionRow } from '@/types/database'
import { parseFormSchema } from '@/lib/form-engine/schema-parser'
import { generateZodSchema } from '@/lib/form-engine/zod-generator'

export async function getFormDefinition(formId: string): Promise<FormDefinitionRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('id', formId)
    .single()

  return data as FormDefinitionRow | null
}

export async function getFormDefinitionBySlug(
  studyId: string,
  formSlug: string
): Promise<FormDefinitionRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('study_id', studyId)
    .eq('slug', formSlug)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  return data as FormDefinitionRow | null
}

export async function getFormResponse(
  participantId: string,
  formId: string,
  eventId?: string,
  instanceNumber?: number
): Promise<FormResponseRow | null> {
  const supabase = await createClient()

  let query = supabase
    .from('form_responses')
    .select('*')
    .eq('participant_id', participantId)
    .eq('form_id', formId)
    .is('deleted_at', null)

  if (eventId) {
    query = query.eq('event_id', eventId)
  }
  if (instanceNumber) {
    query = query.eq('instance_number', instanceNumber)
  }

  const { data } = await query.order('created_at', { ascending: false }).limit(1).single()
  return data as FormResponseRow | null
}

export async function saveFormDraft(input: {
  studyId: string
  participantId: string
  formId: string
  formVersion: number
  eventId?: string
  instanceNumber?: number
  data: Record<string, unknown>
}): Promise<ServerActionResult<FormResponseRow>> {
  const { role } = await requireStudyAccess(input.studyId)

  if (!canEditData(role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const supabase = await createClient()

  // Check for existing response
  const existing = await getFormResponse(input.participantId, input.formId, input.eventId, input.instanceNumber)

  if (existing) {
    // Update existing draft
    const { data, error } = await supabase
      .from('form_responses')
      .update({
        data: input.data,
        status: 'draft',
      })
      .eq('id', existing.id)
      .eq('study_id', existing.study_id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data as FormResponseRow }
  }

  // Create new response
  const { data, error } = await supabase
    .from('form_responses')
    .insert({
      study_id: input.studyId,
      participant_id: input.participantId,
      form_id: input.formId,
      form_version: input.formVersion,
      event_id: input.eventId ?? null,
      instance_number: input.instanceNumber ?? 1,
      data: input.data,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as FormResponseRow }
}

export async function submitForm(input: {
  studyId: string
  participantId: string
  formId: string
  formVersion: number
  eventId?: string
  instanceNumber?: number
  data: Record<string, unknown>
}): Promise<ServerActionResult<FormResponseRow>> {
  const { userId, role } = await requireStudyAccess(input.studyId)

  if (!canEditData(role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  // Server-side Zod validation
  const supabase = await createClient()
  const { data: formDef } = await supabase
    .from('form_definitions')
    .select('schema')
    .eq('id', input.formId)
    .single()

  if (!formDef) {
    return { success: false, error: 'Form definition not found' }
  }

  try {
    const schema = parseFormSchema(formDef.schema)
    const zodSchema = generateZodSchema(schema)
    const parsed = zodSchema.safeParse(input.data)

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = []
        fieldErrors[path].push(issue.message)
      }
      return { success: false, error: 'Validation failed', fieldErrors }
    }
  } catch (e) {
    return { success: false, error: 'Failed to validate form data' }
  }

  // Check for existing response
  const existing = await getFormResponse(input.participantId, input.formId, input.eventId, input.instanceNumber)

  if (existing) {
    const { data, error } = await supabase
      .from('form_responses')
      .update({
        data: input.data,
        status: 'complete',
        completed_by: userId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('study_id', existing.study_id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data as FormResponseRow }
  }

  const { data, error } = await supabase
    .from('form_responses')
    .insert({
      study_id: input.studyId,
      participant_id: input.participantId,
      form_id: input.formId,
      form_version: input.formVersion,
      event_id: input.eventId ?? null,
      instance_number: input.instanceNumber ?? 1,
      data: input.data,
      status: 'complete',
      completed_by: userId,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as FormResponseRow }
}

export async function listFormResponses(
  participantId: string,
  studyId: string
): Promise<FormResponseRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('form_responses')
    .select('*')
    .eq('participant_id', participantId)
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (data ?? []) as FormResponseRow[]
}
