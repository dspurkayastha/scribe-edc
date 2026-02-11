'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canEditStudyConfig, canLockForms } from '@/lib/auth/permissions'
import { validateFormSchema } from '@/lib/form-engine/schema-validator'
import type { ServerActionResult } from '@/types/app'
import type { FormDefinitionRow } from '@/types/database'
import type { FormSchema } from '@/types/form-schema'
import { z } from 'zod'
import { zUUID } from '@/lib/validation'

// ─── Input Schemas ───

const createFormSchema = z.object({
  studyId: zUUID,
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/).min(2).max(50),
  schema: z.record(z.string(), z.unknown()).optional(),
})

const updateFormSchema = z.object({
  formId: zUUID,
  studyId: zUUID,
  title: z.string().min(1).max(200).optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  rules: z.array(z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
})

const duplicateFormSchema = z.object({
  formId: zUUID,
  studyId: zUUID,
  newSlug: z.string().regex(/^[a-z][a-z0-9-]*$/).min(2).max(50),
  newTitle: z.string().min(1).max(200),
})

// ─── Create ───

export async function createFormDefinition(
  input: z.infer<typeof createFormSchema>
): Promise<ServerActionResult<FormDefinitionRow>> {
  const { role } = await requireStudyAccess(input.studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const parsed = createFormSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>
    const details = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; ')
    return { success: false, error: details || 'Invalid input', fieldErrors }
  }

  const defaultSchema: FormSchema = { pages: [{ id: 'page1', title: 'Page 1', sections: [{ id: 'section1', title: 'Section 1', fields: [] }] }] }
  const schema = (parsed.data.schema ?? defaultSchema) as FormSchema

  // Validate schema if non-default (default has no fields, validation would complain about empty pages if strict)
  if (parsed.data.schema) {
    const validationErrors = validateFormSchema(schema)
    if (validationErrors.length > 0) {
      return { success: false, error: `Schema validation failed: ${validationErrors.map((e) => e.message).join('; ')}` }
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_definitions')
    .insert({
      study_id: parsed.data.studyId,
      title: parsed.data.title,
      slug: parsed.data.slug,
      schema: schema as unknown as Record<string, unknown>,
      version: 1,
      rules: [],
      settings: {},
      is_active: true,
      is_locked: false,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'A form with this slug already exists in this study' }
    }
    return { success: false, error: error.message }
  }

  return { success: true, data: data as FormDefinitionRow }
}

// ─── Update ───

export async function updateFormDefinition(
  input: z.infer<typeof updateFormSchema>
): Promise<ServerActionResult<FormDefinitionRow>> {
  const { role } = await requireStudyAccess(input.studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const parsed = updateFormSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>
    const details = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; ')
    return { success: false, error: details || 'Invalid input', fieldErrors }
  }

  const supabase = await createClient()

  // Check if form is locked
  const { data: existing, error: fetchError } = await supabase
    .from('form_definitions')
    .select('is_locked')
    .eq('id', parsed.data.formId)
    .eq('study_id', parsed.data.studyId)
    .single()

  if (fetchError || !existing) {
    return { success: false, error: 'Form not found' }
  }

  if (existing.is_locked) {
    return { success: false, error: 'Cannot edit a locked form. Unlock it first or create a new version.' }
  }

  // Validate schema if provided
  if (parsed.data.schema) {
    const validationErrors = validateFormSchema(parsed.data.schema as unknown as FormSchema)
    if (validationErrors.length > 0) {
      return { success: false, error: `Schema validation failed: ${validationErrors.map((e) => e.message).join('; ')}` }
    }
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title
  if (parsed.data.schema !== undefined) updateData.schema = parsed.data.schema
  if (parsed.data.rules !== undefined) updateData.rules = parsed.data.rules
  if (parsed.data.settings !== undefined) updateData.settings = parsed.data.settings
  if (parsed.data.is_active !== undefined) updateData.is_active = parsed.data.is_active

  const { data, error } = await supabase
    .from('form_definitions')
    .update(updateData)
    .eq('id', parsed.data.formId)
    .eq('study_id', parsed.data.studyId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as FormDefinitionRow }
}

// ─── Delete ───

export async function deleteFormDefinition(
  formId: string,
  studyId: string
): Promise<ServerActionResult> {
  const { role } = await requireStudyAccess(studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const supabase = await createClient()

  // Check for existing form responses
  const { count, error: countError } = await supabase
    .from('form_responses')
    .select('id', { count: 'exact', head: true })
    .eq('form_id', formId)

  if (countError) {
    return { success: false, error: countError.message }
  }

  if (count && count > 0) {
    return { success: false, error: `Cannot delete form: ${count} response(s) exist. Deactivate the form instead.` }
  }

  const { error } = await supabase
    .from('form_definitions')
    .delete()
    .eq('id', formId)
    .eq('study_id', studyId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

// ─── Duplicate ───

export async function duplicateFormDefinition(
  input: z.infer<typeof duplicateFormSchema>
): Promise<ServerActionResult<FormDefinitionRow>> {
  const { role } = await requireStudyAccess(input.studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const parsed = duplicateFormSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>
    const details = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; ')
    return { success: false, error: details || 'Invalid input', fieldErrors }
  }

  const supabase = await createClient()

  // Fetch the source form
  const { data: source, error: fetchError } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('id', parsed.data.formId)
    .eq('study_id', parsed.data.studyId)
    .single()

  if (fetchError || !source) {
    return { success: false, error: 'Source form not found' }
  }

  // Insert duplicate
  const { data, error } = await supabase
    .from('form_definitions')
    .insert({
      study_id: parsed.data.studyId,
      slug: parsed.data.newSlug,
      title: parsed.data.newTitle,
      schema: source.schema,
      rules: source.rules,
      settings: source.settings,
      version: 1,
      is_active: true,
      is_locked: false,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'A form with this slug already exists' }
    }
    return { success: false, error: error.message }
  }

  return { success: true, data: data as FormDefinitionRow }
}

// ─── Lock / Unlock ───

export async function lockFormDefinition(
  formId: string,
  studyId: string
): Promise<ServerActionResult<FormDefinitionRow>> {
  const { userId, role } = await requireStudyAccess(studyId)
  if (!canLockForms(role)) {
    return { success: false, error: 'You do not have permission to lock forms' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_definitions')
    .update({
      is_locked: true,
      locked_by: userId,
      locked_at: new Date().toISOString(),
    })
    .eq('id', formId)
    .eq('study_id', studyId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as FormDefinitionRow }
}

export async function unlockFormDefinition(
  formId: string,
  studyId: string
): Promise<ServerActionResult<FormDefinitionRow>> {
  const { role } = await requireStudyAccess(studyId)
  if (!canLockForms(role)) {
    return { success: false, error: 'You do not have permission to unlock forms' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_definitions')
    .update({
      is_locked: false,
      locked_by: null,
      locked_at: null,
    })
    .eq('id', formId)
    .eq('study_id', studyId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as FormDefinitionRow }
}

// ─── Create New Version ───

export async function createFormVersion(
  formId: string,
  studyId: string
): Promise<ServerActionResult<FormDefinitionRow>> {
  const { role } = await requireStudyAccess(studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const supabase = await createClient()

  // Fetch existing form
  const { data: existing, error: fetchError } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('id', formId)
    .eq('study_id', studyId)
    .single()

  if (fetchError || !existing) {
    return { success: false, error: 'Form not found' }
  }

  // Deactivate current version
  const { error: deactivateError } = await supabase
    .from('form_definitions')
    .update({ is_active: false })
    .eq('id', formId)
    .eq('study_id', studyId)

  if (deactivateError) {
    return { success: false, error: deactivateError.message }
  }

  // Insert new version
  const { data, error } = await supabase
    .from('form_definitions')
    .insert({
      study_id: studyId,
      slug: existing.slug,
      title: existing.title,
      schema: existing.schema,
      rules: existing.rules,
      settings: existing.settings,
      version: existing.version + 1,
      is_active: true,
      is_locked: false,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as FormDefinitionRow }
}

