'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/session'
import type { ServerActionResult } from '@/types/app'
import type { OrganizationRow } from '@/types/database'
import { z } from 'zod'

const createOrgSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(50),
})

export async function createOrganization(
  input: z.infer<typeof createOrgSchema>
): Promise<ServerActionResult<OrganizationRow>> {
  const user = await requireAuth()
  const parsed = createOrgSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organizations')
    .insert({ name: parsed.data.name, slug: parsed.data.slug })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Organization slug already taken' }
    }
    return { success: false, error: error.message }
  }

  return { success: true, data: data as OrganizationRow }
}

export async function getOrganization(slug: string): Promise<OrganizationRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single()

  return data as OrganizationRow | null
}

export async function listOrganizations(): Promise<OrganizationRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .order('name')

  return (data ?? []) as OrganizationRow[]
}
