'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canRandomize } from '@/lib/auth/permissions'
import type { ServerActionResult } from '@/types/app'
import type { RandomizationAllocationRow, StudyArmRow } from '@/types/database'

export async function randomizeParticipant(
  studyId: string,
  participantId: string
): Promise<ServerActionResult<RandomizationAllocationRow & { arm: StudyArmRow }>> {
  const { userId, role } = await requireStudyAccess(studyId)

  if (!canRandomize(role)) {
    return { success: false, error: 'Insufficient permissions to randomize participants' }
  }

  const supabase = await createClient()

  // Verify participant exists and is enrolled
  const { data: participant } = await supabase
    .from('participants')
    .select('id, status, study_id')
    .eq('id', participantId)
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .single()

  if (!participant) {
    return { success: false, error: 'Participant not found in this study' }
  }

  if (participant.status !== 'enrolled') {
    return { success: false, error: `Participant must be enrolled to randomize. Current status: ${participant.status}` }
  }

  // Check if already randomized (allocation exists)
  const { data: existingAllocation } = await supabase
    .from('randomization_allocations')
    .select('id')
    .eq('participant_id', participantId)
    .single()

  if (existingAllocation) {
    return { success: false, error: 'Participant has already been randomized' }
  }

  // Fetch active study arms with allocation ratios
  const { data: arms } = await supabase
    .from('study_arms')
    .select('*')
    .eq('study_id', studyId)
    .eq('is_active', true)
    .order('sort_order')

  if (!arms || arms.length === 0) {
    return { success: false, error: 'No active study arms configured for randomization' }
  }

  // Simple random allocation based on ratios
  // Build a weighted pool: e.g., arm A (allocation=2), arm B (allocation=1)
  // means pool = [A, A, B], pick one randomly
  const totalWeight = arms.reduce((sum, arm) => sum + (arm.allocation ?? 1), 0)
  const random = Math.random() * totalWeight
  let cumulative = 0
  let selectedArm: StudyArmRow | null = null

  for (const arm of arms) {
    cumulative += arm.allocation ?? 1
    if (random < cumulative) {
      selectedArm = arm as StudyArmRow
      break
    }
  }

  // Fallback to last arm if floating point issues
  if (!selectedArm) {
    selectedArm = arms[arms.length - 1] as StudyArmRow
  }

  // Create the allocation record
  const { data: allocation, error: allocError } = await supabase
    .from('randomization_allocations')
    .insert({
      study_id: studyId,
      participant_id: participantId,
      arm_id: selectedArm.id,
      randomized_by: userId,
      randomized_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (allocError) {
    return { success: false, error: allocError.message }
  }

  // Update participant status to 'randomized'
  const { error: statusError } = await supabase
    .from('participants')
    .update({ status: 'randomized' })
    .eq('id', participantId)

  if (statusError) {
    // Allocation was created but status update failed - log but don't fail
    console.error('Failed to update participant status after randomization:', statusError)
  }

  return {
    success: true,
    data: {
      ...(allocation as RandomizationAllocationRow),
      arm: selectedArm,
    },
  }
}

export async function getRandomizationAllocation(
  participantId: string
): Promise<(RandomizationAllocationRow & { arm: StudyArmRow }) | null> {
  const supabase = await createClient()

  const { data: allocation } = await supabase
    .from('randomization_allocations')
    .select('*, study_arms(*)')
    .eq('participant_id', participantId)
    .single()

  if (!allocation) return null

  return {
    ...(allocation as any),
    arm: (allocation as any).study_arms as StudyArmRow,
  }
}
