'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canEditStudyConfig } from '@/lib/auth/permissions'
import type { ServerActionResult } from '@/types/app'
import type { StudyRow, StudyType, StudyStatus } from '@/types/database'
import { z } from 'zod'

const updateStudyDetailsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  shortName: z.string().min(1, 'Short name is required').max(50),
  studyType: z.enum([
    'parallel_rct', 'crossover_rct', 'factorial', 'cluster_rct',
    'single_arm', 'observational', 'case_control', 'registry',
  ]),
  status: z.enum(['setup', 'recruiting', 'paused', 'closed', 'archived']),
  blinding: z.string().optional(),
  phase: z.string().optional(),
})

export type UpdateStudyDetailsInput = z.infer<typeof updateStudyDetailsSchema>

export async function updateStudyDetails(
  studyId: string,
  input: UpdateStudyDetailsInput
): Promise<ServerActionResult<StudyRow>> {
  const { role } = await requireStudyAccess(studyId)
  if (!canEditStudyConfig(role)) {
    return { success: false, error: 'You do not have permission to edit study configuration' }
  }

  const parsed = updateStudyDetailsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Invalid input',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()

  // First, get current settings to merge blinding/phase into them
  const { data: currentStudy, error: fetchError } = await supabase
    .from('studies')
    .select('settings')
    .eq('id', studyId)
    .single()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  const currentSettings = (currentStudy?.settings as Record<string, unknown>) ?? {}
  const mergedSettings = {
    ...currentSettings,
    ...(parsed.data.blinding !== undefined ? { blinding: parsed.data.blinding } : {}),
    ...(parsed.data.phase !== undefined ? { phase: parsed.data.phase } : {}),
  }

  const { data, error } = await supabase
    .from('studies')
    .update({
      name: parsed.data.name,
      short_name: parsed.data.shortName,
      study_type: parsed.data.studyType as StudyType,
      status: parsed.data.status as StudyStatus,
      settings: mergedSettings,
    })
    .eq('id', studyId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as StudyRow }
}
