'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canEditData, canLockForms } from '@/lib/auth/permissions'
import type { ServerActionResult } from '@/types/app'
import type { FormResponseRow } from '@/types/database'
import { checkOptimisticLock } from '@/lib/utils/optimistic-lock'

export async function completeForm(
  responseId: string,
  studyId: string,
  expectedUpdatedAt: string
): Promise<ServerActionResult> {
  const { userId, role } = await requireStudyAccess(studyId)
  if (!canEditData(role)) return { success: false, error: 'Insufficient permissions' }

  const supabase = await createClient()

  // Optimistic lock check
  const lockCheck = await checkOptimisticLock(supabase, 'form_responses', responseId, studyId, expectedUpdatedAt)
  if (!lockCheck.success) return lockCheck

  const { error } = await supabase
    .from('form_responses')
    .update({
      status: 'complete',
      completed_by: userId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', responseId)
    .eq('study_id', studyId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function verifyForm(
  responseId: string,
  studyId: string,
  expectedUpdatedAt: string
): Promise<ServerActionResult> {
  const { userId, role } = await requireStudyAccess(studyId)
  if (!canEditData(role)) return { success: false, error: 'Insufficient permissions' }

  const supabase = await createClient()

  const lockCheck = await checkOptimisticLock(supabase, 'form_responses', responseId, studyId, expectedUpdatedAt)
  if (!lockCheck.success) return lockCheck

  const { error } = await supabase
    .from('form_responses')
    .update({
      status: 'verified',
      verified_by: userId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', responseId)
    .eq('study_id', studyId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function lockForm(
  responseId: string,
  studyId: string,
  expectedUpdatedAt: string
): Promise<ServerActionResult> {
  const { userId, role } = await requireStudyAccess(studyId)
  if (!canLockForms(role)) return { success: false, error: 'Insufficient permissions' }

  const supabase = await createClient()

  const lockCheck = await checkOptimisticLock(supabase, 'form_responses', responseId, studyId, expectedUpdatedAt)
  if (!lockCheck.success) return lockCheck

  const { error } = await supabase
    .from('form_responses')
    .update({
      status: 'locked',
      locked_by: userId,
      locked_at: new Date().toISOString(),
    })
    .eq('id', responseId)
    .eq('study_id', studyId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function unlockForm(
  responseId: string,
  studyId: string,
  reason: string,
  expectedUpdatedAt: string
): Promise<ServerActionResult> {
  const { userId, role } = await requireStudyAccess(studyId)
  if (!canLockForms(role)) return { success: false, error: 'Insufficient permissions' }

  if (!reason || reason.trim().length < 5) {
    return { success: false, error: 'A reason for unlocking is required (minimum 5 characters)' }
  }

  const supabase = await createClient()

  const lockCheck = await checkOptimisticLock(supabase, 'form_responses', responseId, studyId, expectedUpdatedAt)
  if (!lockCheck.success) return lockCheck

  // Set reason for change for audit trigger
  await supabase.rpc('set_config', { setting: 'app.reason_for_change', value: reason })

  const { error } = await supabase
    .from('form_responses')
    .update({
      status: 'draft',
      locked_by: null,
      locked_at: null,
    })
    .eq('id', responseId)
    .eq('study_id', studyId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function editCompletedForm(
  responseId: string,
  studyId: string,
  reason: string,
  data: Record<string, unknown>,
  expectedUpdatedAt: string
): Promise<ServerActionResult> {
  const { userId, role } = await requireStudyAccess(studyId)
  if (!canEditData(role)) return { success: false, error: 'Insufficient permissions' }

  if (!reason || reason.trim().length < 5) {
    return { success: false, error: 'A reason for change is required (minimum 5 characters)' }
  }

  const supabase = await createClient()

  const lockCheck = await checkOptimisticLock(supabase, 'form_responses', responseId, studyId, expectedUpdatedAt)
  if (!lockCheck.success) return lockCheck

  // Set reason for change for audit trigger
  await supabase.rpc('set_config', { setting: 'app.reason_for_change', value: reason })

  const { error } = await supabase
    .from('form_responses')
    .update({
      data,
      status: 'draft',
    })
    .eq('id', responseId)
    .eq('study_id', studyId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}
