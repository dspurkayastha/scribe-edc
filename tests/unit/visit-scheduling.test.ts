import { describe, it, expect } from 'vitest'
import {
  calculateVisitWindow,
  determineVisitStatus,
  buildParticipantTimeline,
} from '@/lib/visit-scheduling'

// ═══════════════════════════════════════════════════════════════
// calculateVisitWindow
// ═══════════════════════════════════════════════════════════════

describe('calculateVisitWindow', () => {
  const anchor = new Date('2025-01-01')

  it('returns null when day_offset is null', () => {
    const result = calculateVisitWindow(
      { day_offset: null, window_before: 3, window_after: 3 },
      anchor
    )
    expect(result).toBeNull()
  })

  it('calculates due date from anchor + day_offset', () => {
    const result = calculateVisitWindow(
      { day_offset: 14, window_before: 0, window_after: 0 },
      anchor
    )
    expect(result).not.toBeNull()
    expect(result!.due.toISOString().slice(0, 10)).toBe('2025-01-15')
  })

  it('calculates window start as due - window_before', () => {
    const result = calculateVisitWindow(
      { day_offset: 14, window_before: 3, window_after: 5 },
      anchor
    )
    expect(result!.windowStart.toISOString().slice(0, 10)).toBe('2025-01-12')
  })

  it('calculates window end as due + window_after', () => {
    const result = calculateVisitWindow(
      { day_offset: 14, window_before: 3, window_after: 5 },
      anchor
    )
    expect(result!.windowEnd.toISOString().slice(0, 10)).toBe('2025-01-20')
  })

  it('handles day_offset of 0 (enrollment visit)', () => {
    const result = calculateVisitWindow(
      { day_offset: 0, window_before: 0, window_after: 0 },
      anchor
    )
    expect(result!.due.toISOString().slice(0, 10)).toBe('2025-01-01')
  })

  it('handles zero windows (exact day only)', () => {
    const result = calculateVisitWindow(
      { day_offset: 30, window_before: 0, window_after: 0 },
      anchor
    )
    expect(result!.windowStart.toISOString().slice(0, 10)).toBe('2025-01-31')
    expect(result!.windowEnd.toISOString().slice(0, 10)).toBe('2025-01-31')
  })

  it('handles large day_offset (90 days)', () => {
    const result = calculateVisitWindow(
      { day_offset: 90, window_before: 7, window_after: 7 },
      anchor
    )
    expect(result!.due.toISOString().slice(0, 10)).toBe('2025-04-01')
    expect(result!.windowStart.toISOString().slice(0, 10)).toBe('2025-03-25')
    expect(result!.windowEnd.toISOString().slice(0, 10)).toBe('2025-04-08')
  })

  it('handles negative day_offset (pre-enrollment screening)', () => {
    const result = calculateVisitWindow(
      { day_offset: -7, window_before: 2, window_after: 2 },
      anchor
    )
    expect(result!.due.toISOString().slice(0, 10)).toBe('2024-12-25')
  })
})

// ═══════════════════════════════════════════════════════════════
// determineVisitStatus
// ═══════════════════════════════════════════════════════════════

describe('determineVisitStatus', () => {
  const today = new Date('2025-03-01')

  it('returns completed when all forms are done', () => {
    const window = {
      due: new Date('2025-02-15'),
      windowEnd: new Date('2025-02-20'),
    }
    expect(determineVisitStatus(window, 3, 3, today)).toBe('completed')
  })

  it('returns completed even if more forms completed than required', () => {
    const window = {
      due: new Date('2025-02-15'),
      windowEnd: new Date('2025-02-20'),
    }
    expect(determineVisitStatus(window, 5, 3, today)).toBe('completed')
  })

  it('returns partial when some forms are done', () => {
    const window = {
      due: new Date('2025-02-15'),
      windowEnd: new Date('2025-02-20'),
    }
    expect(determineVisitStatus(window, 1, 3, today)).toBe('partial')
  })

  it('returns overdue when window has passed and no forms completed', () => {
    const window = {
      due: new Date('2025-02-01'),
      windowEnd: new Date('2025-02-10'),
    }
    expect(determineVisitStatus(window, 0, 3, today)).toBe('overdue')
  })

  it('returns upcoming when due date is in the future and no forms completed', () => {
    const window = {
      due: new Date('2025-04-01'),
      windowEnd: new Date('2025-04-08'),
    }
    expect(determineVisitStatus(window, 0, 3, today)).toBe('upcoming')
  })

  it('returns pending when no window info and no forms completed', () => {
    expect(determineVisitStatus(null, 0, 3, today)).toBe('pending')
  })

  it('returns pending when formsTotal is 0', () => {
    const window = {
      due: new Date('2025-02-01'),
      windowEnd: new Date('2025-02-10'),
    }
    expect(determineVisitStatus(window, 0, 0, today)).toBe('pending')
  })

  it('returns pending when due date is today (not future, not past window end)', () => {
    const window = {
      due: new Date('2025-03-01'),
      windowEnd: new Date('2025-03-05'),
    }
    expect(determineVisitStatus(window, 0, 3, today)).toBe('pending')
  })

  it('completed takes priority over overdue window', () => {
    const window = {
      due: new Date('2025-01-01'),
      windowEnd: new Date('2025-01-05'),
    }
    expect(determineVisitStatus(window, 3, 3, today)).toBe('completed')
  })

  it('partial takes priority over overdue window', () => {
    const window = {
      due: new Date('2025-01-01'),
      windowEnd: new Date('2025-01-05'),
    }
    expect(determineVisitStatus(window, 1, 3, today)).toBe('partial')
  })
})

// ═══════════════════════════════════════════════════════════════
// buildParticipantTimeline
// ═══════════════════════════════════════════════════════════════

describe('buildParticipantTimeline', () => {
  const makeEvent = (overrides: Partial<{
    id: string
    name: string
    label: string
    event_type: string
    day_offset: number | null
    window_before: number
    window_after: number
    sort_order: number
  }>) => ({
    id: 'evt-1',
    name: 'visit_1',
    label: 'Visit 1',
    event_type: 'scheduled',
    day_offset: 0,
    window_before: 3,
    window_after: 3,
    sort_order: 1,
    ...overrides,
  })

  it('returns empty timeline for empty events', () => {
    const result = buildParticipantTimeline([], [], [], '2025-01-01')
    expect(result).toEqual([])
  })

  it('creates one entry per scheduled event', () => {
    const events = [
      makeEvent({ id: 'e1', name: 'screening', label: 'Screening', day_offset: 0, sort_order: 1 }),
      makeEvent({ id: 'e2', name: 'baseline', label: 'Baseline', day_offset: 7, sort_order: 2 }),
    ]
    const eventForms = [
      { event_id: 'e1', form_id: 'f1' },
      { event_id: 'e2', form_id: 'f2' },
    ]
    const result = buildParticipantTimeline(events, eventForms, [], '2025-01-01')
    expect(result).toHaveLength(2)
    expect(result[0].eventName).toBe('Screening')
    expect(result[1].eventName).toBe('Baseline')
  })

  it('calculates formsCompleted from responses', () => {
    const events = [makeEvent({ id: 'e1', day_offset: 0 })]
    const eventForms = [
      { event_id: 'e1', form_id: 'f1' },
      { event_id: 'e1', form_id: 'f2' },
    ]
    const responses = [
      { event_id: 'e1', form_id: 'f1', instance_number: 1, status: 'complete' },
    ]
    const result = buildParticipantTimeline(events, eventForms, responses, '2025-01-01')
    expect(result[0].formsCompleted).toBe(1)
    expect(result[0].formsTotal).toBe(2)
  })

  it('counts verified/locked/signed as completed', () => {
    const events = [makeEvent({ id: 'e1', day_offset: 0 })]
    const eventForms = [
      { event_id: 'e1', form_id: 'f1' },
      { event_id: 'e1', form_id: 'f2' },
      { event_id: 'e1', form_id: 'f3' },
      { event_id: 'e1', form_id: 'f4' },
    ]
    const responses = [
      { event_id: 'e1', form_id: 'f1', instance_number: 1, status: 'complete' },
      { event_id: 'e1', form_id: 'f2', instance_number: 1, status: 'verified' },
      { event_id: 'e1', form_id: 'f3', instance_number: 1, status: 'locked' },
      { event_id: 'e1', form_id: 'f4', instance_number: 1, status: 'signed' },
    ]
    const result = buildParticipantTimeline(events, eventForms, responses, '2025-01-01')
    expect(result[0].formsCompleted).toBe(4)
    expect(result[0].status).toBe('completed')
  })

  it('does not count draft status as completed', () => {
    const events = [makeEvent({ id: 'e1', day_offset: 0 })]
    const eventForms = [{ event_id: 'e1', form_id: 'f1' }]
    const responses = [
      { event_id: 'e1', form_id: 'f1', instance_number: 1, status: 'draft' },
    ]
    const result = buildParticipantTimeline(events, eventForms, responses, '2025-01-01')
    expect(result[0].formsCompleted).toBe(0)
  })

  it('handles events with no forms assigned', () => {
    const events = [makeEvent({ id: 'e1' })]
    const result = buildParticipantTimeline(events, [], [], '2025-01-01')
    expect(result[0].formsTotal).toBe(0)
    expect(result[0].status).toBe('pending')
  })

  it('handles null enrolledAt (no anchor date)', () => {
    const events = [makeEvent({ id: 'e1', day_offset: 14 })]
    const eventForms = [{ event_id: 'e1', form_id: 'f1' }]
    const result = buildParticipantTimeline(events, eventForms, [], null)
    expect(result[0].dueDate).toBeNull()
    expect(result[0].windowStart).toBeNull()
    expect(result[0].windowEnd).toBeNull()
  })

  it('creates multiple entries for repeating events with instances', () => {
    const events = [makeEvent({ id: 'e1', event_type: 'repeating', day_offset: null })]
    const eventForms = [{ event_id: 'e1', form_id: 'f1' }]
    const responses = [
      { event_id: 'e1', form_id: 'f1', instance_number: 1, status: 'complete' },
      { event_id: 'e1', form_id: 'f1', instance_number: 2, status: 'draft' },
      { event_id: 'e1', form_id: 'f1', instance_number: 3, status: 'complete' },
    ]
    const result = buildParticipantTimeline(events, eventForms, responses, '2025-01-01')
    expect(result).toHaveLength(3)
    expect(result[0].eventName).toContain('#1')
    expect(result[1].eventName).toContain('#2')
    expect(result[2].eventName).toContain('#3')
    expect(result[0].formsCompleted).toBe(1)
    expect(result[1].formsCompleted).toBe(0)
    expect(result[2].formsCompleted).toBe(1)
  })

  it('creates at least one entry for repeating events with no responses', () => {
    const events = [makeEvent({ id: 'e1', event_type: 'repeating', day_offset: null })]
    const eventForms = [{ event_id: 'e1', form_id: 'f1' }]
    const result = buildParticipantTimeline(events, eventForms, [], '2025-01-01')
    expect(result).toHaveLength(1)
    expect(result[0].instanceNumber).toBe(1)
  })

  it('handles unscheduled event type like repeating', () => {
    const events = [makeEvent({ id: 'e1', event_type: 'unscheduled', day_offset: null })]
    const eventForms = [{ event_id: 'e1', form_id: 'f1' }]
    const responses = [
      { event_id: 'e1', form_id: 'f1', instance_number: 1, status: 'complete' },
      { event_id: 'e1', form_id: 'f1', instance_number: 2, status: 'complete' },
    ]
    const result = buildParticipantTimeline(events, eventForms, responses, '2025-01-01')
    expect(result).toHaveLength(2)
  })

  it('ignores responses with null event_id', () => {
    const events = [makeEvent({ id: 'e1', day_offset: 0 })]
    const eventForms = [{ event_id: 'e1', form_id: 'f1' }]
    const responses = [
      { event_id: null, form_id: 'f1', instance_number: 1, status: 'complete' },
    ]
    const result = buildParticipantTimeline(events, eventForms, responses, '2025-01-01')
    expect(result[0].formsCompleted).toBe(0)
  })

  it('uses label over name for event name', () => {
    const events = [makeEvent({ id: 'e1', name: 'v1', label: 'Visit 1' })]
    const result = buildParticipantTimeline(events, [], [], '2025-01-01')
    expect(result[0].eventName).toBe('Visit 1')
  })

  it('falls back to name when label is empty', () => {
    const events = [makeEvent({ id: 'e1', name: 'v1', label: '' })]
    const result = buildParticipantTimeline(events, [], [], '2025-01-01')
    expect(result[0].eventName).toBe('v1')
  })

  it('tracks instance number correctly per event', () => {
    const events = [
      makeEvent({ id: 'e1', event_type: 'scheduled', day_offset: 0, sort_order: 1 }),
      makeEvent({ id: 'e2', event_type: 'repeating', day_offset: null, sort_order: 2, name: 'ae', label: 'AE' }),
    ]
    const eventForms = [
      { event_id: 'e1', form_id: 'f1' },
      { event_id: 'e2', form_id: 'f2' },
    ]
    const responses = [
      { event_id: 'e1', form_id: 'f1', instance_number: 1, status: 'complete' },
      { event_id: 'e2', form_id: 'f2', instance_number: 1, status: 'complete' },
      { event_id: 'e2', form_id: 'f2', instance_number: 2, status: 'draft' },
    ]
    const result = buildParticipantTimeline(events, eventForms, responses, '2025-01-01')
    // e1 has 1 entry (scheduled), e2 has 2 entries (repeating with 2 instances)
    expect(result).toHaveLength(3)
    expect(result[0].instanceNumber).toBe(1)
    expect(result[0].eventName).toBe('Visit 1') // scheduled, single instance, no #
    expect(result[1].eventName).toBe('AE #1')
    expect(result[2].eventName).toBe('AE #2')
  })
})
