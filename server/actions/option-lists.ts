'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canEditStudyConfig } from '@/lib/auth/permissions'
import type { ServerActionResult } from '@/types/app'
import type { OptionListRow } from '@/types/database'
import { z } from 'zod'
import { zUUID } from '@/lib/validation'

const optionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
})

const createOptionListSchema = z.object({
  studyId: zUUID,
  slug: z.string().regex(/^[a-z][a-z0-9_-]*$/).min(2).max(50),
  label: z.string().min(1).max(200),
  options: z.array(optionSchema).min(1),
  is_searchable: z.boolean().optional(),
})

const updateOptionListSchema = z.object({
  id: zUUID,
  studyId: zUUID,
  label: z.string().min(1).max(200).optional(),
  options: z.array(optionSchema).min(1).optional(),
  is_searchable: z.boolean().optional(),
})

// ─── Create ───

export async function createOptionList(
  input: z.infer<typeof createOptionListSchema>
): Promise<ServerActionResult<OptionListRow>> {
  const { role } = await requireStudyAccess(input.studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const parsed = createOptionListSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>
    const details = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; ')
    return { success: false, error: details || 'Invalid input', fieldErrors }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('option_lists')
    .insert({
      study_id: parsed.data.studyId,
      slug: parsed.data.slug,
      label: parsed.data.label,
      options: parsed.data.options,
      is_searchable: parsed.data.is_searchable ?? false,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'An option list with this slug already exists' }
    }
    return { success: false, error: error.message }
  }

  return { success: true, data: data as OptionListRow }
}

// ─── Update ───

export async function updateOptionList(
  input: z.infer<typeof updateOptionListSchema>
): Promise<ServerActionResult<OptionListRow>> {
  const { role } = await requireStudyAccess(input.studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const parsed = updateOptionListSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>
    const details = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; ')
    return { success: false, error: details || 'Invalid input', fieldErrors }
  }

  const supabase = await createClient()
  const updateData: Record<string, unknown> = {}
  if (parsed.data.label !== undefined) updateData.label = parsed.data.label
  if (parsed.data.options !== undefined) updateData.options = parsed.data.options
  if (parsed.data.is_searchable !== undefined) updateData.is_searchable = parsed.data.is_searchable

  const { data, error } = await supabase
    .from('option_lists')
    .update(updateData)
    .eq('id', parsed.data.id)
    .eq('study_id', parsed.data.studyId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as OptionListRow }
}

// ─── Delete ───

export async function deleteOptionList(
  id: string,
  studyId: string
): Promise<ServerActionResult> {
  const { role } = await requireStudyAccess(studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const supabase = await createClient()

  // Check if referenced by any form definitions
  const { data: forms } = await supabase
    .from('form_definitions')
    .select('slug, schema')
    .eq('study_id', studyId)
    .eq('is_active', true)

  const { data: optList } = await supabase
    .from('option_lists')
    .select('slug')
    .eq('id', id)
    .single()

  if (optList && forms) {
    for (const form of forms) {
      const schema = form.schema as any
      if (JSON.stringify(schema).includes(`"optionListSlug":"${optList.slug}"`)) {
        return { success: false, error: `Cannot delete: referenced by form "${form.slug}"` }
      }
    }
  }

  const { error } = await supabase
    .from('option_lists')
    .delete()
    .eq('id', id)
    .eq('study_id', studyId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

// ─── List ───

export async function listOptionLists(
  studyId: string
): Promise<ServerActionResult<OptionListRow[]>> {
  await requireStudyAccess(studyId)

  const supabase = await createClient()

  // Fetch study-specific and global (study_id IS NULL) option lists
  const { data, error } = await supabase
    .from('option_lists')
    .select('*')
    .or(`study_id.eq.${studyId},study_id.is.null`)
    .order('label', { ascending: true })

  if (error) return { success: false, error: error.message }
  return { success: true, data: (data ?? []) as OptionListRow[] }
}
