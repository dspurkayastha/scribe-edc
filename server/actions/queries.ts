'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canManageQueries, canEditData } from '@/lib/auth/permissions'
import type { ServerActionResult } from '@/types/app'
import type { DataQueryRow, QueryResponseRow, QueryPriority } from '@/types/database'
import { z } from 'zod'

const createQuerySchema = z.object({
  participantId: z.string().uuid(),
  formResponseId: z.string().uuid().optional(),
  fieldId: z.string().optional(),
  queryText: z.string().min(1).max(2000),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
})

export async function createQuery(
  studyId: string,
  input: z.infer<typeof createQuerySchema>
): Promise<ServerActionResult<DataQueryRow>> {
  const { userId, role } = await requireStudyAccess(studyId)

  if (!canManageQueries(role) && !canEditData(role)) {
    return { success: false, error: 'Insufficient permissions to create queries' }
  }

  const parsed = createQuerySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
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

  const { data, error } = await supabase
    .from('data_queries')
    .insert({
      study_id: studyId,
      participant_id: parsed.data.participantId,
      form_response_id: parsed.data.formResponseId ?? null,
      field_id: parsed.data.fieldId ?? null,
      query_text: parsed.data.queryText,
      priority: parsed.data.priority,
      status: 'open',
      category: 'manual',
      raised_by: userId,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as DataQueryRow }
}

const respondToQuerySchema = z.object({
  responseText: z.string().min(1).max(2000),
})

export async function respondToQuery(
  queryId: string,
  studyId: string,
  input: z.infer<typeof respondToQuerySchema>
): Promise<ServerActionResult<QueryResponseRow>> {
  const { userId, role } = await requireStudyAccess(studyId)

  if (!canManageQueries(role) && !canEditData(role)) {
    return { success: false, error: 'Insufficient permissions to respond to queries' }
  }

  const parsed = respondToQuerySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()

  // Verify query belongs to this study and is open/answered
  const { data: query } = await supabase
    .from('data_queries')
    .select('id, status')
    .eq('id', queryId)
    .eq('study_id', studyId)
    .single()

  if (!query) {
    return { success: false, error: 'Query not found' }
  }

  if (query.status === 'closed' || query.status === 'cancelled') {
    return { success: false, error: `Cannot respond to a ${query.status} query` }
  }

  // Insert the response
  const { data: response, error: responseError } = await supabase
    .from('query_responses')
    .insert({
      query_id: queryId,
      response_text: parsed.data.responseText,
      responded_by: userId,
    })
    .select()
    .single()

  if (responseError) {
    return { success: false, error: responseError.message }
  }

  // Update query status to 'answered'
  await supabase
    .from('data_queries')
    .update({ status: 'answered' })
    .eq('id', queryId)

  return { success: true, data: response as QueryResponseRow }
}

export async function closeQuery(
  queryId: string,
  studyId: string
): Promise<ServerActionResult> {
  const { userId, role } = await requireStudyAccess(studyId)

  if (!canManageQueries(role)) {
    return { success: false, error: 'Insufficient permissions to close queries' }
  }

  const supabase = await createClient()

  const { data: query } = await supabase
    .from('data_queries')
    .select('id, status')
    .eq('id', queryId)
    .eq('study_id', studyId)
    .single()

  if (!query) {
    return { success: false, error: 'Query not found' }
  }

  if (query.status === 'closed') {
    return { success: false, error: 'Query is already closed' }
  }

  if (query.status === 'cancelled') {
    return { success: false, error: 'Cannot close a cancelled query' }
  }

  const { error } = await supabase
    .from('data_queries')
    .update({
      status: 'closed',
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', queryId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function cancelQuery(
  queryId: string,
  studyId: string
): Promise<ServerActionResult> {
  const { userId, role } = await requireStudyAccess(studyId)

  if (!canManageQueries(role)) {
    return { success: false, error: 'Insufficient permissions to cancel queries' }
  }

  const supabase = await createClient()

  const { data: query } = await supabase
    .from('data_queries')
    .select('id, status')
    .eq('id', queryId)
    .eq('study_id', studyId)
    .single()

  if (!query) {
    return { success: false, error: 'Query not found' }
  }

  if (query.status === 'closed') {
    return { success: false, error: 'Cannot cancel a closed query' }
  }

  if (query.status === 'cancelled') {
    return { success: false, error: 'Query is already cancelled' }
  }

  const { error } = await supabase
    .from('data_queries')
    .update({
      status: 'cancelled',
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', queryId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function getQueryWithResponses(
  queryId: string,
  studyId: string
): Promise<ServerActionResult<DataQueryRow & { responses: QueryResponseRow[] }>> {
  await requireStudyAccess(studyId)

  const supabase = await createClient()

  const { data: query, error } = await supabase
    .from('data_queries')
    .select('*, participants(study_number)')
    .eq('id', queryId)
    .eq('study_id', studyId)
    .single()

  if (error || !query) {
    return { success: false, error: 'Query not found' }
  }

  const { data: responses } = await supabase
    .from('query_responses')
    .select('*, user_profiles(full_name)')
    .eq('query_id', queryId)
    .order('created_at', { ascending: true })

  return {
    success: true,
    data: {
      ...(query as DataQueryRow),
      responses: (responses ?? []) as QueryResponseRow[],
    },
  }
}
