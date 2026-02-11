'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canExport } from '@/lib/auth/permissions'
import { exportToRedcapCsv } from '@/lib/form-engine/redcap-exporter'
import type { ServerActionResult } from '@/types/app'
import type { FormDefinitionRow } from '@/types/database'
import type { FormSchema } from '@/types/form-schema'

export async function exportAllFormsAsCsv(
  studyId: string
): Promise<ServerActionResult<string>> {
  const { role } = await requireStudyAccess(studyId)
  if (!canExport(role)) {
    return { success: false, error: 'You do not have permission to export data' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('study_id', studyId)
    .eq('is_active', true)
    .order('title', { ascending: true })

  if (error) return { success: false, error: error.message }

  const forms = (data ?? []).map((f: FormDefinitionRow) => ({
    slug: f.slug,
    title: f.title,
    schema: f.schema as unknown as FormSchema,
  }))

  const csv = exportToRedcapCsv(forms)
  return { success: true, data: csv }
}

export async function exportSingleFormAsCsv(
  formId: string,
  studyId: string
): Promise<ServerActionResult<string>> {
  const { role } = await requireStudyAccess(studyId)
  if (!canExport(role)) {
    return { success: false, error: 'You do not have permission to export data' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('id', formId)
    .eq('study_id', studyId)
    .single()

  if (error || !data) return { success: false, error: 'Form not found' }

  const form = data as FormDefinitionRow
  const csv = exportToRedcapCsv([{
    slug: form.slug,
    title: form.title,
    schema: form.schema as unknown as FormSchema,
  }])

  return { success: true, data: csv }
}
