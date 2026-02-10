import type { ServerActionResult } from '@/types/app'

/**
 * Check optimistic lock by comparing the expected updated_at timestamp
 * with the current value in the database.
 */
export async function checkOptimisticLock(
  supabase: any,
  table: string,
  recordId: string,
  studyId: string,
  expectedUpdatedAt: string
): Promise<ServerActionResult> {
  const { data } = await supabase
    .from(table)
    .select('updated_at')
    .eq('id', recordId)
    .eq('study_id', studyId)
    .single()

  if (!data) {
    return { success: false, error: 'Record not found' }
  }

  if (data.updated_at !== expectedUpdatedAt) {
    return {
      success: false,
      error: 'This record has been modified by another user. Please refresh and try again.',
    }
  }

  return { success: true, data: undefined }
}
