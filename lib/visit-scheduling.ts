/**
 * Visit scheduling pure functions.
 * Calculates visit windows, statuses, and builds participant timelines.
 */

export type VisitStatus = 'completed' | 'partial' | 'pending' | 'overdue' | 'upcoming'

export interface VisitWindowInfo {
  eventId: string
  eventName: string
  eventType: string
  dayOffset: number | null
  dueDate: Date | null
  windowStart: Date | null
  windowEnd: Date | null
  status: VisitStatus
  formsCompleted: number
  formsTotal: number
  instanceNumber: number
}

interface EventInput {
  id: string
  name: string
  label: string
  event_type: string
  day_offset: number | null
  window_before: number
  window_after: number
  sort_order: number
}

interface EventFormInput {
  event_id: string
  form_id: string
}

interface ResponseInput {
  event_id: string | null
  form_id: string
  instance_number: number
  status: string
}

/**
 * Calculate the visit window dates for a scheduled event, given an anchor date.
 */
export function calculateVisitWindow(
  event: { day_offset: number | null; window_before: number; window_after: number },
  anchorDate: Date
): { due: Date; windowStart: Date; windowEnd: Date } | null {
  if (event.day_offset == null) return null

  const due = new Date(anchorDate)
  due.setDate(due.getDate() + event.day_offset)

  const windowStart = new Date(due)
  windowStart.setDate(windowStart.getDate() - event.window_before)

  const windowEnd = new Date(due)
  windowEnd.setDate(windowEnd.getDate() + event.window_after)

  return { due, windowStart, windowEnd }
}

/**
 * Determine the status of a visit based on completion and timing.
 */
export function determineVisitStatus(
  window: { due: Date; windowEnd: Date } | null,
  formsCompleted: number,
  formsTotal: number,
  today: Date = new Date()
): VisitStatus {
  if (formsTotal === 0) return 'pending'

  if (formsCompleted >= formsTotal) return 'completed'
  if (formsCompleted > 0) return 'partial'

  // No forms completed — check if overdue
  if (window && window.windowEnd < today) return 'overdue'
  if (window && window.due > today) return 'upcoming'

  return 'pending'
}

/**
 * Build a participant timeline from events, event-forms, responses, and an anchor date.
 */
export function buildParticipantTimeline(
  events: EventInput[],
  eventForms: EventFormInput[],
  responses: ResponseInput[],
  enrolledAt: string | null
): VisitWindowInfo[] {
  const anchorDate = enrolledAt ? new Date(enrolledAt) : null
  const today = new Date()
  const timeline: VisitWindowInfo[] = []

  // Count forms per event
  const formsPerEvent = new Map<string, number>()
  for (const ef of eventForms) {
    formsPerEvent.set(ef.event_id, (formsPerEvent.get(ef.event_id) ?? 0) + 1)
  }

  // Count completed responses per event+instance
  const completedPerEventInstance = new Map<string, number>()
  const instancesPerEvent = new Map<string, Set<number>>()

  for (const resp of responses) {
    if (!resp.event_id) continue

    if (!instancesPerEvent.has(resp.event_id)) {
      instancesPerEvent.set(resp.event_id, new Set())
    }
    instancesPerEvent.get(resp.event_id)!.add(resp.instance_number)

    const isComplete = resp.status === 'complete' || resp.status === 'verified' ||
      resp.status === 'locked' || resp.status === 'signed'

    if (isComplete) {
      const key = `${resp.event_id}__${resp.instance_number}`
      completedPerEventInstance.set(key, (completedPerEventInstance.get(key) ?? 0) + 1)
    }
  }

  for (const event of events) {
    const formsTotal = formsPerEvent.get(event.id) ?? 0
    const isRepeatable = event.event_type === 'repeating' || event.event_type === 'unscheduled'
    const instances = isRepeatable
      ? [...(instancesPerEvent.get(event.id) ?? new Set([1]))].sort((a, b) => a - b)
      : [1]

    // Ensure at least one instance
    if (instances.length === 0) instances.push(1)

    for (const instanceNum of instances) {
      const key = `${event.id}__${instanceNum}`
      const formsCompleted = completedPerEventInstance.get(key) ?? 0

      let window: ReturnType<typeof calculateVisitWindow> = null
      if (anchorDate && event.event_type === 'scheduled') {
        window = calculateVisitWindow(event, anchorDate)
      }

      const status = determineVisitStatus(
        window ? { due: window.due, windowEnd: window.windowEnd } : null,
        formsCompleted,
        formsTotal,
        today
      )

      timeline.push({
        eventId: event.id,
        eventName: instances.length > 1
          ? `${event.label || event.name} #${instanceNum}`
          : event.label || event.name,
        eventType: event.event_type,
        dayOffset: event.day_offset,
        dueDate: window?.due ?? null,
        windowStart: window?.windowStart ?? null,
        windowEnd: window?.windowEnd ?? null,
        status,
        formsCompleted,
        formsTotal,
        instanceNumber: instanceNum,
      })
    }
  }

  return timeline
}
