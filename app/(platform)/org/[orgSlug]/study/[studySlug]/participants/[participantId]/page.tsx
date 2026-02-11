import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getParticipant } from '@/server/actions/participants'
import { listFormResponses } from '@/server/actions/forms'
import { getRandomizationAllocation } from '@/server/actions/randomization'
import { listAdverseEvents } from '@/server/actions/adverse-events'
import { requireStudyAccess } from '@/lib/auth/session'
import { canRandomize, canEditData, canAcknowledgeSAE, canDeleteParticipants, canViewAuditTrail } from '@/lib/auth/permissions'
import { StatusChangeDropdown } from '@/components/participants/status-change-dropdown'
import { RandomizeDialog, AllocationDisplay } from '@/components/participants/randomize-dialog'
import { ReportAeDialog } from '@/components/participants/report-ae-dialog'
import { AeList } from '@/components/participants/ae-list'
import { DeleteParticipantDialog } from '@/components/participants/delete-participant-dialog'
import { RecordHistoryPanel } from '@/components/audit/record-history-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeftIcon,
  FileTextIcon,
  CalendarIcon,
  ClipboardListIcon,
  AlertTriangleIcon,
} from 'lucide-react'
import type { FormResponseStatus } from '@/types/database'

const FORM_STATUS_CONFIG: Record<FormResponseStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-800' },
  complete: { label: 'Complete', color: 'bg-blue-100 text-blue-800' },
  verified: { label: 'Verified', color: 'bg-green-100 text-green-800' },
  locked: { label: 'Locked', color: 'bg-gray-100 text-gray-800' },
  signed: { label: 'Signed', color: 'bg-purple-100 text-purple-800' },
}

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string; participantId: string }>
}) {
  const { orgSlug, studySlug, participantId } = await params
  const supabase = await createClient()

  // Resolve study from slug
  const { data: study } = await supabase
    .from('studies')
    .select('id, name')
    .eq('slug', studySlug)
    .single()

  if (!study) notFound()

  // Get user role for permission checks
  const { role } = await requireStudyAccess(study.id)
  const userCanRandomize = canRandomize(role)
  const userCanEditData = canEditData(role)
  const userCanAcknowledgeSAE = canAcknowledgeSAE(role)
  const userCanDeleteParticipants = canDeleteParticipants(role)
  const userCanViewAudit = canViewAuditTrail(role)

  // Fetch participant
  const participant = await getParticipant(participantId)
  if (!participant || participant.study_id !== study.id || participant.deleted_at) {
    notFound()
  }

  // Fetch site info if assigned
  let siteName: string | null = null
  if (participant.site_id) {
    const { data: site } = await supabase
      .from('study_sites')
      .select('name, code')
      .eq('id', participant.site_id)
      .single()
    if (site) {
      siteName = `${site.code} - ${site.name}`
    }
  }

  // Fetch randomization allocation if participant is randomized
  const allocation = await getRandomizationAllocation(participantId)

  // Fetch adverse events for this participant
  const aeResult = await listAdverseEvents(study.id, { participantId })
  const adverseEvents = aeResult.data

  // Fetch form responses for this participant
  const formResponses = await listFormResponses(participantId, study.id)

  // Fetch study events with their assigned forms
  const { data: studyEvents } = await supabase
    .from('study_events')
    .select(`
      id,
      name,
      label,
      event_type,
      sort_order
    `)
    .eq('study_id', study.id)
    .eq('is_active', true)
    .order('sort_order')

  // Fetch event_forms join table to know which forms are expected per event
  const eventIds = (studyEvents ?? []).map((e) => e.id)
  const { data: eventForms } = eventIds.length > 0
    ? await supabase
        .from('event_forms')
        .select(`
          id,
          event_id,
          form_id,
          is_required,
          sort_order
        `)
        .in('event_id', eventIds)
        .order('sort_order')
    : { data: [] as any[] }

  // Fetch all form definitions referenced by event_forms
  const formIds = [...new Set((eventForms ?? []).map((ef: any) => ef.form_id))]
  const { data: formDefs } = formIds.length > 0
    ? await supabase
        .from('form_definitions')
        .select('id, slug, title, version, is_active')
        .in('id', formIds)
    : { data: [] as any[] }

  const formDefMap = new Map((formDefs ?? []).map((f: any) => [f.id, f]))

  // Also fetch form definitions for any unscheduled responses
  const unscheduledFormIds = formResponses
    .map((r) => r.form_id)
    .filter((id) => !formDefMap.has(id))
  if (unscheduledFormIds.length > 0) {
    const { data: extraDefs } = await supabase
      .from('form_definitions')
      .select('id, slug, title, version, is_active')
      .in('id', [...new Set(unscheduledFormIds)])
    for (const def of extraDefs ?? []) {
      formDefMap.set(def.id, def)
    }
  }

  // Build a map of form responses keyed by `${form_id}__${event_id}`
  const responseMap = new Map<string, typeof formResponses[number]>()
  for (const resp of formResponses) {
    const key = `${resp.form_id}__${resp.event_id ?? 'none'}`
    // Keep the most recent response per form+event combo
    if (!responseMap.has(key)) {
      responseMap.set(key, resp)
    }
  }

  // Build the schedule: events -> forms (with response status)
  type ScheduleForm = {
    formId: string
    formSlug: string
    formTitle: string
    eventId: string
    eventName: string
    isRequired: boolean
    responseStatus: FormResponseStatus | 'not_started'
    responseId: string | null
    lastUpdated: string | null
  }

  const schedule: ScheduleForm[] = []

  for (const event of studyEvents ?? []) {
    const formsForEvent = (eventForms ?? [])
      .filter((ef: any) => ef.event_id === event.id)
      .sort((a: any, b: any) => a.sort_order - b.sort_order)

    for (const ef of formsForEvent) {
      const formDef = formDefMap.get(ef.form_id)
      if (!formDef || !formDef.is_active) continue

      const key = `${ef.form_id}__${event.id}`
      const response = responseMap.get(key)

      schedule.push({
        formId: ef.form_id,
        formSlug: formDef.slug,
        formTitle: formDef.title,
        eventId: event.id,
        eventName: event.label || event.name,
        isRequired: ef.is_required,
        responseStatus: response?.status ?? 'not_started',
        responseId: response?.id ?? null,
        lastUpdated: response?.updated_at ?? null,
      })
    }
  }

  // Identify unscheduled responses (responses not tied to any event_forms entry)
  const scheduledKeys = new Set(schedule.map((s) => `${s.formId}__${s.eventId}`))
  const unscheduledResponses = formResponses.filter((r) => {
    const key = `${r.form_id}__${r.event_id ?? 'none'}`
    return !scheduledKeys.has(key)
  })

  // Collect stats
  const completedCount = schedule.filter(
    (s) => s.responseStatus === 'complete' || s.responseStatus === 'verified' || s.responseStatus === 'locked' || s.responseStatus === 'signed'
  ).length
  const totalExpected = schedule.length
  const draftCount = schedule.filter((s) => s.responseStatus === 'draft').length

  const basePath = `/org/${orgSlug}/study/${studySlug}`

  // Determine if we should show the Randomize button
  const showRandomize = participant.status === 'enrolled' && userCanRandomize && !allocation

  return (
    <div className="p-6 space-y-6">
      {/* Back navigation */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`${basePath}/participants`}>
            <ArrowLeftIcon />
            Back to Participants
          </Link>
        </Button>
      </div>

      {/* Participant header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{participant.study_number}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            {siteName && <span>{siteName}</span>}
            {siteName && participant.enrolled_at && <Separator orientation="vertical" className="h-4" />}
            {participant.enrolled_at && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                Enrolled {new Date(participant.enrolled_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            <Separator orientation="vertical" className="h-4" />
            <span>
              Created {new Date(participant.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {showRandomize && (
            <RandomizeDialog
              studyId={study.id}
              participantId={participant.id}
              participantNumber={participant.study_number}
            />
          )}
          {userCanEditData && (
            <ReportAeDialog
              studyId={study.id}
              participantId={participant.id}
            />
          )}
          <StatusChangeDropdown
            participantId={participant.id}
            currentStatus={participant.status}
          />
          {userCanDeleteParticipants && (
            <DeleteParticipantDialog
              participantId={participant.id}
              studyNumber={participant.study_number}
              participantsListUrl={`${basePath}/participants`}
            />
          )}
        </div>
      </div>

      {/* Allocation display (if randomized) */}
      {allocation && (
        <AllocationDisplay
          armLabel={allocation.arm.label}
          armName={allocation.arm.name}
          randomizedAt={allocation.randomized_at}
        />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expected Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalExpected}</div>
            <p className="text-xs text-muted-foreground mt-1">across all events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedCount}</div>
            {totalExpected > 0 && (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((completedCount / totalExpected) * 100)}% complete
                </p>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(Math.round((completedCount / totalExpected) * 100), 100)}%` }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{draftCount}</div>
            <p className="text-xs text-muted-foreground mt-1">draft forms</p>
          </CardContent>
        </Card>
      </div>

      {/* Forms schedule table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardListIcon className="h-5 w-5" />
            Forms
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {schedule.length === 0 && unscheduledResponses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileTextIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No forms scheduled</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure study events and assign forms to see the data collection schedule.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((item) => {
                  const statusCfg = item.responseStatus === 'not_started'
                    ? { label: 'Not Started', color: 'bg-muted text-muted-foreground' }
                    : FORM_STATUS_CONFIG[item.responseStatus]

                  const formUrl = `${basePath}/participants/${participant.id}/forms/${item.formSlug}?eventId=${item.eventId}`

                  return (
                    <TableRow key={`${item.formId}-${item.eventId}`}>
                      <TableCell className="font-medium">{item.formTitle}</TableCell>
                      <TableCell className="text-muted-foreground">{item.eventName}</TableCell>
                      <TableCell>
                        {item.isRequired ? (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Optional</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.lastUpdated
                          ? new Date(item.lastUpdated).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '--'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={formUrl}>
                            {item.responseStatus === 'not_started' ? 'Fill' : 'View'}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {/* Unscheduled responses section */}
                {unscheduledResponses.length > 0 && (
                  <>
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider py-2">
                        Unscheduled Forms
                      </TableCell>
                    </TableRow>
                    {unscheduledResponses.map((resp) => {
                      const formDef = formDefMap.get(resp.form_id)
                      const statusCfg = FORM_STATUS_CONFIG[resp.status]
                      const formSlug = formDef?.slug ?? resp.form_id

                      return (
                        <TableRow key={resp.id}>
                          <TableCell className="font-medium">
                            {formDef?.title ?? 'Unknown Form'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">--</TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">--</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(resp.updated_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`${basePath}/participants/${participant.id}/forms/${formSlug}`}>
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Adverse Events section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5" />
            Adverse Events
            {adverseEvents.length > 0 && (
              <Badge variant="outline" className="ml-1">{adverseEvents.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AeList
            events={adverseEvents}
            studyId={study.id}
            canAcknowledge={userCanAcknowledgeSAE}
            canEdit={userCanEditData}
          />
        </CardContent>
      </Card>

      {/* Participant record history (audit trail) */}
      {userCanViewAudit && (
        <RecordHistoryPanel
          recordId={participant.id}
          studyId={study.id}
          title="Participant History"
        />
      )}
    </div>
  )
}
