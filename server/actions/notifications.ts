'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/session'
import type { ServerActionResult, PaginatedResult } from '@/types/app'
import type { NotificationRow } from '@/types/database'

export async function getNotifications(
  options?: { page?: number; pageSize?: number; unreadOnly?: boolean }
): Promise<PaginatedResult<NotificationRow>> {
  const user = await requireAuth()
  const supabase = await createClient()

  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (options?.unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, count } = await query

  return {
    data: (data ?? []) as NotificationRow[],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getUnreadCount(): Promise<number> {
  const user = await requireAuth()
  const supabase = await createClient()

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return count ?? 0
}

export async function markAsRead(notificationId: string): Promise<ServerActionResult> {
  const user = await requireAuth()
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function markAllAsRead(): Promise<ServerActionResult> {
  const user = await requireAuth()
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function createNotification(input: {
  studyId: string
  userId: string
  type: string
  title: string
  body?: string
  link?: string
}): Promise<ServerActionResult<NotificationRow>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      study_id: input.studyId,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as NotificationRow }
}
