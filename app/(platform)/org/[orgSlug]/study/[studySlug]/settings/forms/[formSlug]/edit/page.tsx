import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FormEditorShell } from '@/components/form-builder/form-editor-shell'
import type { FormDefinitionRow } from '@/types/database'

export default async function FormEditorPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string; formSlug: string }>
}) {
  const { orgSlug, studySlug, formSlug } = await params
  const supabase = await createClient()

  // Resolve study ID
  const { data: study } = await supabase
    .from('studies')
    .select('id, name, organizations!inner(slug)')
    .eq('organizations.slug', orgSlug)
    .eq('slug', studySlug)
    .single()

  if (!study) {
    redirect('/select-study')
  }

  // Fetch the active form definition by slug
  const { data: form } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('slug', formSlug)
    .eq('study_id', study.id)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!form) {
    redirect(`/org/${orgSlug}/study/${studySlug}/settings/forms`)
  }

  const basePath = `/org/${orgSlug}/study/${studySlug}`

  return (
    <FormEditorShell
      form={form as FormDefinitionRow}
      studyId={study.id}
      basePath={basePath}
    />
  )
}
