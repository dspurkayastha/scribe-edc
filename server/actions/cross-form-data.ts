'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'

/**
 * Fetch cross-form data for expression evaluation.
 * Given field references like ['demographics.age', 'vitals.bp'],
 * fetches the latest form responses and extracts the values.
 *
 * @returns Record<formSlug, Record<fieldId, value>>
 */
export async function getCrossFormData(
  participantId: string,
  studyId: string,
  fieldRefs: string[]
): Promise<Record<string, Record<string, unknown>>> {
  await requireStudyAccess(studyId)

  if (fieldRefs.length === 0) return {}

  // Group refs by form slug
  const refsByForm = new Map<string, string[]>()
  for (const ref of fieldRefs) {
    const dotIdx = ref.indexOf('.')
    if (dotIdx === -1) continue // Local field, skip
    const formSlug = ref.substring(0, dotIdx)
    const fieldId = ref.substring(dotIdx + 1)
    if (!refsByForm.has(formSlug)) {
      refsByForm.set(formSlug, [])
    }
    refsByForm.get(formSlug)!.push(fieldId)
  }

  if (refsByForm.size === 0) return {}

  const supabase = await createClient()
  const result: Record<string, Record<string, unknown>> = {}

  // Fetch form definitions by slug to get form IDs
  const slugs = [...refsByForm.keys()]
  const { data: formDefs } = await supabase
    .from('form_definitions')
    .select('id, slug')
    .eq('study_id', studyId)
    .eq('is_active', true)
    .in('slug', slugs)

  if (!formDefs || formDefs.length === 0) return {}

  // For each form, fetch the latest response for this participant
  for (const formDef of formDefs) {
    const { data: response } = await supabase
      .from('form_responses')
      .select('data')
      .eq('participant_id', participantId)
      .eq('form_id', formDef.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!response?.data) continue

    const fields = refsByForm.get(formDef.slug) ?? []
    const formData: Record<string, unknown> = {}
    const responseData = response.data as Record<string, unknown>

    for (const fieldId of fields) {
      if (fieldId in responseData) {
        formData[fieldId] = responseData[fieldId]
      }
    }

    if (Object.keys(formData).length > 0) {
      result[formDef.slug] = formData
    }
  }

  return result
}
