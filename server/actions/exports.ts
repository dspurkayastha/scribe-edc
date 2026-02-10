'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canExport } from '@/lib/auth/permissions'
import { parseFormSchema, getAllFields } from '@/lib/form-engine/schema-parser'

export async function exportWideCsv(
  studyId: string,
  formSlug: string
): Promise<{ success: boolean; csv?: string; error?: string }> {
  const { role } = await requireStudyAccess(studyId)
  if (!canExport(role)) return { success: false, error: 'Insufficient permissions' }

  const supabase = await createClient()

  // Get form definition
  const { data: formDef } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('study_id', studyId)
    .eq('slug', formSlug)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!formDef) return { success: false, error: 'Form definition not found' }

  // Get all responses
  const { data: responses } = await supabase
    .from('form_responses')
    .select('*, participants(study_number, status)')
    .eq('study_id', studyId)
    .eq('form_id', formDef.id)
    .is('deleted_at', null)
    .order('created_at')

  if (!responses || responses.length === 0) {
    return { success: false, error: 'No data to export' }
  }

  // Parse schema to get field definitions
  const schema = parseFormSchema(formDef.schema)
  const fields = getAllFields(schema).filter((f) => f.type !== 'descriptive')

  // Build CSV header
  const headers = ['study_number', 'participant_status', 'form_status', ...fields.map((f) => f.id)]

  // Build CSV rows
  const rows = responses.map((r: any) => {
    const data = r.data as Record<string, unknown>
    const participant = r.participants as any
    return [
      participant?.study_number ?? '',
      participant?.status ?? '',
      r.status,
      ...fields.map((f) => {
        const val = data[f.id]
        if (val === null || val === undefined) return ''
        if (Array.isArray(val)) return val.join(';')
        return String(val)
      }),
    ]
  })

  // Build CSV string
  const csvLines = [headers.join(','), ...rows.map((r: string[]) =>
    r.map((cell) => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`
      }
      return cell
    }).join(',')
  )]

  return { success: true, csv: csvLines.join('\n') }
}

export async function exportLongCsv(
  studyId: string,
  formSlug: string
): Promise<{ success: boolean; csv?: string; error?: string }> {
  const { role } = await requireStudyAccess(studyId)
  if (!canExport(role)) return { success: false, error: 'Insufficient permissions' }

  const supabase = await createClient()

  const { data: formDef } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('study_id', studyId)
    .eq('slug', formSlug)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!formDef) return { success: false, error: 'Form definition not found' }

  const { data: responses } = await supabase
    .from('form_responses')
    .select('*, participants(study_number)')
    .eq('study_id', studyId)
    .eq('form_id', formDef.id)
    .is('deleted_at', null)
    .order('created_at')

  if (!responses || responses.length === 0) {
    return { success: false, error: 'No data to export' }
  }

  const headers = ['study_number', 'field_id', 'value', 'form_status']
  const rows: string[][] = []

  for (const r of responses as any[]) {
    const data = r.data as Record<string, unknown>
    const studyNumber = r.participants?.study_number ?? ''
    for (const [key, val] of Object.entries(data)) {
      if (val !== null && val !== undefined) {
        rows.push([studyNumber, key, String(val), r.status])
      }
    }
  }

  const csvLines = [
    headers.join(','),
    ...rows.map((r) =>
      r.map((cell) => {
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`
        }
        return cell
      }).join(',')
    ),
  ]

  return { success: true, csv: csvLines.join('\n') }
}

export async function exportJson(
  studyId: string,
  formSlug: string
): Promise<{ success: boolean; json?: string; error?: string }> {
  const { role } = await requireStudyAccess(studyId)
  if (!canExport(role)) return { success: false, error: 'Insufficient permissions' }

  const supabase = await createClient()

  const { data: formDef } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('study_id', studyId)
    .eq('slug', formSlug)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!formDef) return { success: false, error: 'Form definition not found' }

  const { data: responses } = await supabase
    .from('form_responses')
    .select('*, participants(study_number, status)')
    .eq('study_id', studyId)
    .eq('form_id', formDef.id)
    .is('deleted_at', null)
    .order('created_at')

  return { success: true, json: JSON.stringify(responses ?? [], null, 2) }
}
