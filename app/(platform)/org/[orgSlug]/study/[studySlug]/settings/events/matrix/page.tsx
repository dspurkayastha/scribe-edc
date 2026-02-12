import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { EventFormMatrix } from '@/components/settings/event-form-matrix'
import type { StudyEventRow, FormDefinitionRow, EventFormRow } from '@/types/database'

export default async function EventFormMatrixPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>
}) {
  const { orgSlug, studySlug } = await params
  const supabase = await createClient()

  const { data: study } = await supabase
    .from('studies')
    .select('id, name, organizations!inner(slug)')
    .eq('organizations.slug', orgSlug)
    .eq('slug', studySlug)
    .single()

  if (!study) {
    redirect('/select-study')
  }

  // Fetch events, forms, and event_forms in parallel
  const [eventsResult, formsResult] = await Promise.all([
    supabase
      .from('study_events')
      .select('*')
      .eq('study_id', study.id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('form_definitions')
      .select('*')
      .eq('study_id', study.id)
      .eq('is_active', true)
      .order('title'),
  ])

  const events = (eventsResult.data ?? []) as StudyEventRow[]
  const forms = (formsResult.data ?? []) as FormDefinitionRow[]

  // Fetch event_forms for all active events
  const eventIds = events.map((e) => e.id)
  const eventFormsResult = eventIds.length > 0
    ? await supabase
        .from('event_forms')
        .select('*')
        .in('event_id', eventIds)
    : { data: [] }

  const eventForms = (eventFormsResult.data ?? []) as EventFormRow[]
  const basePath = `/org/${orgSlug}/study/${studySlug}`

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link
            href={`${basePath}/settings`}
            className="hover:text-foreground transition-colors"
          >
            Settings
          </Link>
          <span>/</span>
          <Link
            href={`${basePath}/settings/events`}
            className="hover:text-foreground transition-colors"
          >
            Events
          </Link>
          <span>/</span>
          <span>Matrix</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Event-Form Matrix</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Assign which forms are collected at each study event. Click a checkbox to
          assign/unassign, and click the badge to toggle required/optional.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Assignments</CardTitle>
          <CardDescription>
            {events.length} event{events.length !== 1 ? 's' : ''} &times;{' '}
            {forms.length} form{forms.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventFormMatrix
            studyId={study.id}
            events={events}
            forms={forms}
            eventForms={eventForms}
          />
        </CardContent>
      </Card>
    </div>
  )
}
