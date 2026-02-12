'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'

/**
 * Get the next instance number for a repeating/unscheduled event.
 * Looks at existing form_responses for the given participant + event
 * and returns max(instance_number) + 1.
 */
export async function getNextInstanceNumber(
  participantId: string,
  eventId: string,
  studyId: string
): Promise<number> {
  await requireStudyAccess(studyId)
  const supabase = await createClient()

  const { data } = await supabase
    .from('form_responses')
    .select('instance_number')
    .eq('participant_id', participantId)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('instance_number', { ascending: false })
    .limit(1)

  const maxInstance = data?.[0]?.instance_number ?? 0
  return maxInstance + 1
}

/**
 * Get all existing instance numbers for a participant + event.
 */
export async function getEventInstances(
  participantId: string,
  eventId: string,
  studyId: string
): Promise<number[]> {
  await requireStudyAccess(studyId)
  const supabase = await createClient()

  const { data } = await supabase
    .from('form_responses')
    .select('instance_number')
    .eq('participant_id', participantId)
    .eq('event_id', eventId)
    .is('deleted_at', null)

  if (!data) return []

  const unique = [...new Set(data.map((d) => d.instance_number))]
  return unique.sort((a, b) => a - b)
}
