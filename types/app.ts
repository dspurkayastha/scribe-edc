// ══════════════════════════════════════════════════════════════
// APPLICATION-LEVEL TYPE DEFINITIONS
// ══════════════════════════════════════════════════════════════

import type { MemberRole } from './database'

/** Study context extracted from URL params and JWT */
export interface StudyContext {
  orgSlug: string
  studySlug: string
  studyId: string
  orgId: string
  userRole: MemberRole
  siteId: string | null
}

/** JWT claims with embedded study memberships */
export interface JWTClaims {
  sub: string
  email: string
  memberships: JWTMembership[]
}

export interface JWTMembership {
  study_id: string
  role: MemberRole
  site_id: string | null
}

/** Generic result type for Server Actions */
export type ServerActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

/** Paginated result wrapper */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Route params for study-scoped pages */
export interface StudyRouteParams {
  orgSlug: string
  studySlug: string
}

/** Route params for participant-scoped pages */
export interface ParticipantRouteParams extends StudyRouteParams {
  participantId: string
}

/** Route params for form-scoped pages */
export interface FormRouteParams extends ParticipantRouteParams {
  formSlug: string
}

/** Dashboard metric card data */
export interface DashboardMetric {
  label: string
  value: number | string
  change?: number
  target?: number
  description?: string
}

/** Export format options */
export type ExportFormat = 'csv_wide' | 'csv_long' | 'json'
