'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import type { DashboardMetric } from '@/types/app'

export interface DashboardData {
  enrollment: DashboardMetric
  armBalance: Array<{ name: string; count: number }>
  siteEnrollment: Array<{ name: string; count: number }>
  openQueries: DashboardMetric
  saeAlerts: DashboardMetric
  formCompleteness: DashboardMetric
  formStatusBreakdown: Array<{ status: string; count: number }>
}

export async function getDashboardMetrics(studyId: string): Promise<DashboardData> {
  await requireStudyAccess(studyId)
  const supabase = await createClient()

  // Parallel queries for dashboard data
  const [
    studyResult,
    participantsResult,
    allocationsResult,
    sitesResult,
    queriesResult,
    saeResult,
    responsesResult,
  ] = await Promise.all([
    supabase.from('studies').select('target_sample').eq('id', studyId).single(),
    supabase.from('participants').select('id, status, site_id', { count: 'exact' }).eq('study_id', studyId).is('deleted_at', null),
    supabase.from('randomization_allocations').select('arm_id, study_arms(name)').eq('study_id', studyId),
    supabase.from('study_sites').select('id, name').eq('study_id', studyId),
    supabase.from('data_queries').select('id', { count: 'exact' }).eq('study_id', studyId).eq('status', 'open'),
    supabase.from('adverse_events').select('id', { count: 'exact' }).eq('study_id', studyId).eq('is_sae', true).is('sae_acknowledged_by', null),
    supabase.from('form_responses').select('status', { count: 'exact' }).eq('study_id', studyId).is('deleted_at', null),
  ])

  const targetSample = studyResult.data?.target_sample ?? 0
  const totalParticipants = participantsResult.count ?? 0

  // Arm balance
  const armCounts: Record<string, number> = {}
  for (const alloc of allocationsResult.data ?? []) {
    const armName = (alloc as any).study_arms?.name ?? 'Unknown'
    armCounts[armName] = (armCounts[armName] ?? 0) + 1
  }

  // Site enrollment
  const siteMap: Record<string, string> = {}
  for (const site of sitesResult.data ?? []) {
    siteMap[site.id] = site.name
  }
  const siteCounts: Record<string, number> = {}
  for (const p of participantsResult.data ?? []) {
    const siteName = p.site_id ? (siteMap[p.site_id] ?? 'Unknown') : 'Unassigned'
    siteCounts[siteName] = (siteCounts[siteName] ?? 0) + 1
  }

  // Form status breakdown
  const statusCounts: Record<string, number> = {}
  for (const r of responsesResult.data ?? []) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
  }

  const totalResponses = responsesResult.count ?? 0
  const completedResponses = (statusCounts['complete'] ?? 0) + (statusCounts['verified'] ?? 0) +
    (statusCounts['locked'] ?? 0) + (statusCounts['signed'] ?? 0)

  return {
    enrollment: {
      label: 'Enrollment',
      value: totalParticipants,
      target: targetSample || undefined,
      description: targetSample ? `${totalParticipants} / ${targetSample}` : `${totalParticipants} enrolled`,
    },
    armBalance: Object.entries(armCounts).map(([name, count]) => ({ name, count })),
    siteEnrollment: Object.entries(siteCounts).map(([name, count]) => ({ name, count })),
    openQueries: {
      label: 'Open Queries',
      value: queriesResult.count ?? 0,
    },
    saeAlerts: {
      label: 'Unacknowledged SAEs',
      value: saeResult.count ?? 0,
    },
    formCompleteness: {
      label: 'Form Completeness',
      value: totalResponses > 0 ? `${Math.round((completedResponses / totalResponses) * 100)}%` : 'N/A',
    },
    formStatusBreakdown: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
  }
}
