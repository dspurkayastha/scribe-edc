'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canViewAuditTrail } from '@/lib/auth/permissions'
import type { PaginatedResult } from '@/types/app'
import type { AuditLogRow } from '@/types/database'

export async function getAuditLog(
  studyId: string,
  options?: {
    page?: number
    pageSize?: number
    tableName?: string
    action?: string
    userId?: string
    dateFrom?: string
    dateTo?: string
    recordId?: string
  }
): Promise<PaginatedResult<AuditLogRow>> {
  const { role } = await requireStudyAccess(studyId)

  if (!canViewAuditTrail(role)) {
    return { data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 }
  }

  const supabase = await createClient()
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 25
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('study_id', studyId)
    .order('changed_at', { ascending: false })
    .range(from, to)

  if (options?.tableName) query = query.eq('table_name', options.tableName)
  if (options?.action) query = query.eq('action', options.action)
  if (options?.userId) query = query.eq('changed_by', options.userId)
  if (options?.dateFrom) query = query.gte('changed_at', options.dateFrom)
  if (options?.dateTo) query = query.lte('changed_at', options.dateTo)
  if (options?.recordId) query = query.eq('record_id', options.recordId)

  const { data, count } = await query

  return {
    data: (data ?? []) as AuditLogRow[],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getRecordHistory(
  recordId: string,
  studyId: string
): Promise<AuditLogRow[]> {
  const { role } = await requireStudyAccess(studyId)

  if (!canViewAuditTrail(role)) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('audit_log')
    .select('*')
    .eq('record_id', recordId)
    .eq('study_id', studyId)
    .order('changed_at', { ascending: false })

  return (data ?? []) as AuditLogRow[]
}
