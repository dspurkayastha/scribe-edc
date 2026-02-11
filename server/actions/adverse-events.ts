'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canEditData, canAcknowledgeSAE } from '@/lib/auth/permissions'
import type { ServerActionResult, PaginatedResult } from '@/types/app'
import type { AdverseEventRow, AeSeverity, AeRelatedness, AeOutcome } from '@/types/database'
import { z } from 'zod'
import { zUUID } from '@/lib/validation'

const createAeSchema = z.object({
  participantId: zUUID,
  description: z.string().min(1).max(5000),
  onsetDate: z.string().min(1),
  severity: z.enum(['mild', 'moderate', 'severe']),
  relatedness: z.enum(['unrelated', 'unlikely', 'possible', 'probable', 'definite']),
  outcome: z.enum(['resolved', 'ongoing', 'resolved_with_sequelae', 'fatal', 'unknown']),
  isSae: z.boolean(),
  saeCriteria: z.array(z.string()).optional(),
})

export async function createAdverseEvent(
  studyId: string,
  input: z.infer<typeof createAeSchema>
): Promise<ServerActionResult<AdverseEventRow>> {
  const { userId, role } = await requireStudyAccess(studyId)

  if (!canEditData(role)) {
    return { success: false, error: 'Insufficient permissions to report adverse events' }
  }

  const parsed = createAeSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>
    const details = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; ')
    return { success: false, error: details || 'Invalid input', fieldErrors }
  }

  const supabase = await createClient()

  // Verify participant belongs to this study
  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('id', parsed.data.participantId)
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .single()

  if (!participant) {
    return { success: false, error: 'Participant not found in this study' }
  }

  // Get next event_number for this participant
  const { count } = await supabase
    .from('adverse_events')
    .select('*', { count: 'exact', head: true })
    .eq('participant_id', parsed.data.participantId)

  const eventNumber = (count ?? 0) + 1

  const { data, error } = await supabase
    .from('adverse_events')
    .insert({
      study_id: studyId,
      participant_id: parsed.data.participantId,
      event_number: eventNumber,
      description: parsed.data.description,
      onset_date: parsed.data.onsetDate,
      severity: parsed.data.severity,
      relatedness: parsed.data.relatedness,
      outcome: parsed.data.outcome,
      is_sae: parsed.data.isSae,
      sae_criteria: parsed.data.isSae ? (parsed.data.saeCriteria ?? null) : null,
      sae_reported_at: parsed.data.isSae ? new Date().toISOString() : null,
      reported_by: userId,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as AdverseEventRow }
}

export async function listAdverseEvents(
  studyId: string,
  options?: {
    participantId?: string
    page?: number
    pageSize?: number
  }
): Promise<PaginatedResult<AdverseEventRow>> {
  await requireStudyAccess(studyId)

  const supabase = await createClient()

  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 25
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('adverse_events')
    .select('*', { count: 'exact' })
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (options?.participantId) {
    query = query.eq('participant_id', options.participantId)
  }

  const { data, count, error } = await query

  return {
    data: (data ?? []) as AdverseEventRow[],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getAdverseEvent(
  aeId: string
): Promise<AdverseEventRow | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('adverse_events')
    .select('*')
    .eq('id', aeId)
    .single()

  return data as AdverseEventRow | null
}

const updateAeSchema = z.object({
  description: z.string().min(1).max(5000).optional(),
  onsetDate: z.string().optional(),
  resolutionDate: z.string().nullable().optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  relatedness: z.enum(['unrelated', 'unlikely', 'possible', 'probable', 'definite']).optional(),
  outcome: z.enum(['resolved', 'ongoing', 'resolved_with_sequelae', 'fatal', 'unknown']).optional(),
  isSae: z.boolean().optional(),
  saeCriteria: z.array(z.string()).nullable().optional(),
})

export async function updateAdverseEvent(
  aeId: string,
  studyId: string,
  updates: z.infer<typeof updateAeSchema>
): Promise<ServerActionResult<AdverseEventRow>> {
  const { userId, role } = await requireStudyAccess(studyId)

  if (!canEditData(role)) {
    return { success: false, error: 'Insufficient permissions to update adverse events' }
  }

  const parsed = updateAeSchema.safeParse(updates)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()

  // Verify AE belongs to this study
  const { data: existing } = await supabase
    .from('adverse_events')
    .select('id')
    .eq('id', aeId)
    .eq('study_id', studyId)
    .single()

  if (!existing) {
    return { success: false, error: 'Adverse event not found' }
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description
  if (parsed.data.onsetDate !== undefined) updateData.onset_date = parsed.data.onsetDate
  if (parsed.data.resolutionDate !== undefined) updateData.resolution_date = parsed.data.resolutionDate
  if (parsed.data.severity !== undefined) updateData.severity = parsed.data.severity
  if (parsed.data.relatedness !== undefined) updateData.relatedness = parsed.data.relatedness
  if (parsed.data.outcome !== undefined) updateData.outcome = parsed.data.outcome
  if (parsed.data.isSae !== undefined) {
    updateData.is_sae = parsed.data.isSae
    if (parsed.data.isSae) {
      updateData.sae_reported_at = new Date().toISOString()
    }
  }
  if (parsed.data.saeCriteria !== undefined) updateData.sae_criteria = parsed.data.saeCriteria

  const { data, error } = await supabase
    .from('adverse_events')
    .update(updateData)
    .eq('id', aeId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as AdverseEventRow }
}

export async function acknowledgeSAE(
  aeId: string,
  studyId: string
): Promise<ServerActionResult> {
  const { userId, role } = await requireStudyAccess(studyId)

  if (!canAcknowledgeSAE(role)) {
    return { success: false, error: 'Only the PI can acknowledge SAEs' }
  }

  const supabase = await createClient()

  // Verify AE belongs to this study and is an SAE
  const { data: ae } = await supabase
    .from('adverse_events')
    .select('id, is_sae, sae_acknowledged_at')
    .eq('id', aeId)
    .eq('study_id', studyId)
    .single()

  if (!ae) {
    return { success: false, error: 'Adverse event not found' }
  }

  if (!ae.is_sae) {
    return { success: false, error: 'This is not a Serious Adverse Event' }
  }

  if (ae.sae_acknowledged_at) {
    return { success: false, error: 'SAE has already been acknowledged' }
  }

  const { error } = await supabase
    .from('adverse_events')
    .update({
      sae_acknowledged_by: userId,
      sae_acknowledged_at: new Date().toISOString(),
    })
    .eq('id', aeId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}
