'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireStudyAccess } from '@/lib/auth/session'
import { canEditData, canDeleteParticipants } from '@/lib/auth/permissions'
import type { ServerActionResult, PaginatedResult } from '@/types/app'
import type { ParticipantRow } from '@/types/database'
import { z } from 'zod'
import { zUUID } from '@/lib/validation'

const createParticipantSchema = z.object({
  studyId: zUUID,
  siteId: zUUID.optional(),
})

export async function createParticipant(
  input: z.infer<typeof createParticipantSchema>
): Promise<ServerActionResult<ParticipantRow>> {
  const { userId, role } = await requireStudyAccess(input.studyId)

  if (!canEditData(role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const supabase = await createClient()

  // Get study id_prefix for auto-numbering
  const { data: study } = await supabase
    .from('studies')
    .select('id_prefix')
    .eq('id', input.studyId)
    .single()

  if (!study) {
    return { success: false, error: 'Study not found' }
  }

  // Get next sequential number
  const { count } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', input.studyId)

  const nextNumber = (count ?? 0) + 1
  const studyNumber = `${study.id_prefix}-${String(nextNumber).padStart(3, '0')}`

  const { data, error } = await supabase
    .from('participants')
    .insert({
      study_id: input.studyId,
      site_id: input.siteId ?? null,
      study_number: studyNumber,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as ParticipantRow }
}

export async function listParticipants(
  studyId: string,
  options?: {
    page?: number
    pageSize?: number
    status?: string
    siteId?: string
    search?: string
  }
): Promise<PaginatedResult<ParticipantRow>> {
  await requireStudyAccess(studyId)
  const supabase = await createClient()

  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 25
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('participants')
    .select('*', { count: 'exact' })
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (options?.status) {
    query = query.eq('status', options.status)
  }
  if (options?.siteId) {
    query = query.eq('site_id', options.siteId)
  }
  if (options?.search) {
    query = query.ilike('study_number', `%${options.search}%`)
  }

  const { data, count, error } = await query

  return {
    data: (data ?? []) as ParticipantRow[],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getParticipant(participantId: string): Promise<ParticipantRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('participants')
    .select('*')
    .eq('id', participantId)
    .single()

  return data as ParticipantRow | null
}

export async function updateParticipantStatus(
  participantId: string,
  status: string,
  reason?: string
): Promise<ServerActionResult> {
  const supabase = await createClient()

  // Get participant to check study access
  const { data: participant } = await supabase
    .from('participants')
    .select('study_id')
    .eq('id', participantId)
    .single()

  if (!participant) return { success: false, error: 'Participant not found' }

  const { role } = await requireStudyAccess(participant.study_id)
  if (!canEditData(role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  // Set reason for change if provided
  if (reason) {
    await supabase.rpc('set_config', { setting: 'app.reason_for_change', value: reason })
  }

  const updateData: Record<string, unknown> = { status }
  if (status === 'enrolled') {
    updateData.enrolled_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('participants')
    .update(updateData)
    .eq('id', participantId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function softDeleteParticipant(
  participantId: string,
  reason: string
): Promise<ServerActionResult> {
  const supabase = await createClient()

  const { data: participant } = await supabase
    .from('participants')
    .select('study_id')
    .eq('id', participantId)
    .single()

  if (!participant) return { success: false, error: 'Participant not found' }

  const { role } = await requireStudyAccess(participant.study_id)
  if (!canDeleteParticipants(role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const { error } = await supabase
    .from('participants')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', participantId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}
