'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { calculateVisitWindow } from '@/lib/visit-scheduling'

export interface OverdueVisit {
  participantId: string
  participantNumber: string
  eventId: string
  eventName: string
  dueDate: string
  windowEnd: string
  daysOverdue: number
}

/**
 * Get all overdue visits for a study.
 * Computes overdue from scheduled events (with day_offset) × active enrolled participants
 * minus existing form_responses.
 */
export async function getOverdueVisits(studyId: string): Promise<OverdueVisit[]> {
  await requireStudyAccess(studyId)
  const supabase = await createClient()
  const today = new Date()

  // Fetch scheduled events with day_offset
  const { data: events } = await supabase
    .from('study_events')
    .select('id, name, label, day_offset, window_before, window_after')
    .eq('study_id', studyId)
    .eq('is_active', true)
    .eq('event_type', 'scheduled')
    .not('day_offset', 'is', null)

  if (!events || events.length === 0) return []

  // Fetch enrolled participants (enrolled status or beyond)
  const { data: participants } = await supabase
    .from('participants')
    .select('id, study_number, enrolled_at')
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .not('enrolled_at', 'is', null)

  if (!participants || participants.length === 0) return []

  // Fetch event_forms to know which events have forms assigned
  const eventIds = events.map((e) => e.id)
  const { data: eventForms } = await supabase
    .from('event_forms')
    .select('event_id, form_id')
    .in('event_id', eventIds)

  // Count forms per event
  const formsPerEvent = new Map<string, number>()
  for (const ef of eventForms ?? []) {
    formsPerEvent.set(ef.event_id, (formsPerEvent.get(ef.event_id) ?? 0) + 1)
  }

  // Fetch all form responses for this study (completed only)
  const { data: responses } = await supabase
    .from('form_responses')
    .select('participant_id, event_id, instance_number, status')
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .in('status', ['complete', 'verified', 'locked', 'signed'])

  // Build completed response counts: `${participantId}__${eventId}` -> count
  const completedMap = new Map<string, number>()
  for (const resp of responses ?? []) {
    if (!resp.event_id) continue
    const key = `${resp.participant_id}__${resp.event_id}`
    completedMap.set(key, (completedMap.get(key) ?? 0) + 1)
  }

  const overdue: OverdueVisit[] = []

  for (const participant of participants) {
    if (!participant.enrolled_at) continue
    const enrolledAt = new Date(participant.enrolled_at)

    for (const event of events) {
      const formsTotal = formsPerEvent.get(event.id) ?? 0
      if (formsTotal === 0) continue

      const window = calculateVisitWindow(event, enrolledAt)
      if (!window) continue

      // Check if window has passed
      if (window.windowEnd >= today) continue

      // Check if all forms are completed
      const key = `${participant.id}__${event.id}`
      const completedCount = completedMap.get(key) ?? 0
      if (completedCount >= formsTotal) continue

      const daysOverdue = Math.floor(
        (today.getTime() - window.windowEnd.getTime()) / (1000 * 60 * 60 * 24)
      )

      overdue.push({
        participantId: participant.id,
        participantNumber: participant.study_number,
        eventId: event.id,
        eventName: event.label || event.name,
        dueDate: window.due.toISOString(),
        windowEnd: window.windowEnd.toISOString(),
        daysOverdue,
      })
    }
  }

  // Sort by days overdue descending
  overdue.sort((a, b) => b.daysOverdue - a.daysOverdue)

  return overdue
}
