import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canViewAuditTrail } from '@/lib/auth/permissions'
import { getFormDefinitionBySlug, getFormResponse } from '@/server/actions/forms'
import { getFormSignatures } from '@/server/actions/signatures'
import { FormFillWrapper } from '@/components/form-engine/form-fill-wrapper'
import { RecordHistoryPanel } from '@/components/audit/record-history-panel'

export default async function FormFillPage({
  params,
}: {
  params: Promise<{
    orgSlug: string
    studySlug: string
    participantId: string
    formSlug: string
  }>
}) {
  const { orgSlug, studySlug, participantId, formSlug } = await params

  const supabase = await createClient()

  // Resolve study ID from slug
  const { data: study } = await supabase
    .from('studies')
    .select('id, name, short_name')
    .eq('slug', studySlug)
    .single()

  if (!study) {
    notFound()
  }

  // Get the current user's role for this study
  const { role: userRole } = await requireStudyAccess(study.id)
  const userCanViewAudit = canViewAuditTrail(userRole)

  // Fetch form definition by slug
  const formDef = await getFormDefinitionBySlug(study.id, formSlug)

  if (!formDef) {
    notFound()
  }

  // Fetch existing response (if any) and participant in parallel
  const [existingResponse, participantResult] = await Promise.all([
    getFormResponse(participantId, formDef.id),
    supabase
      .from('participants')
      .select('id, study_number, status')
      .eq('id', participantId)
      .eq('study_id', study.id)
      .is('deleted_at', null)
      .single(),
  ])

  if (!participantResult.data) {
    notFound()
  }

  const participant = participantResult.data

  // Fetch signatures if there is an existing response
  const signatures = existingResponse
    ? await getFormSignatures(existingResponse.id)
    : []

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <span>{study.short_name ?? study.name}</span>
          <span>/</span>
          <span>{participant.study_number}</span>
        </div>
        <h1 className="text-2xl font-bold">{formDef.title}</h1>
      </div>

      {/* Form fill client wrapper */}
      <FormFillWrapper
        formDefinition={formDef}
        existingResponse={existingResponse}
        participantId={participantId}
        studyId={study.id}
        signatures={signatures}
        userRole={userRole}
      />

      {/* Form response record history (audit trail) */}
      {userCanViewAudit && existingResponse && (
        <RecordHistoryPanel
          recordId={existingResponse.id}
          studyId={study.id}
          title="Form Response History"
        />
      )}
    </div>
  )
}
