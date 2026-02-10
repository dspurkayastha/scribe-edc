'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireStudyAccess } from '@/lib/auth/session'
import { canSignForms } from '@/lib/auth/permissions'
import type { ServerActionResult } from '@/types/app'
import type { SignatureRow } from '@/types/database'

export async function signForm(input: {
  studyId: string
  formResponseId: string
  meaning: string
  password: string
}): Promise<ServerActionResult<SignatureRow>> {
  const user = await requireAuth()
  const { role } = await requireStudyAccess(input.studyId)

  if (!canSignForms(role)) {
    return { success: false, error: 'Insufficient permissions to sign forms' }
  }

  // Re-authenticate with password (21 CFR Part 11 requirement)
  const supabase = await createClient()
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: input.password,
  })

  if (authError) {
    return { success: false, error: 'Authentication failed. Please check your password.' }
  }

  // Get signer profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Verify form is in correct state (locked or verified)
  const { data: response } = await supabase
    .from('form_responses')
    .select('status')
    .eq('id', input.formResponseId)
    .eq('study_id', input.studyId)
    .single()

  if (!response) {
    return { success: false, error: 'Form response not found' }
  }

  if (!['locked', 'verified', 'complete'].includes(response.status)) {
    return { success: false, error: 'Form must be completed, verified, or locked before signing' }
  }

  // Create signature
  const { data, error } = await supabase
    .from('signatures')
    .insert({
      study_id: input.studyId,
      form_response_id: input.formResponseId,
      signer_id: user.id,
      signer_name: profile?.full_name ?? user.email!,
      signer_role: role,
      meaning: input.meaning,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'You have already signed this form with this meaning' }
    }
    return { success: false, error: error.message }
  }

  // Update form status to signed
  await supabase
    .from('form_responses')
    .update({ status: 'signed' })
    .eq('id', input.formResponseId)
    .eq('study_id', input.studyId)

  return { success: true, data: data as SignatureRow }
}

export async function getFormSignatures(
  formResponseId: string
): Promise<SignatureRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('signatures')
    .select('*')
    .eq('form_response_id', formResponseId)
    .order('signed_at', { ascending: true })

  return (data ?? []) as SignatureRow[]
}
