import type { MemberRole } from '@/types/database'

type Permission =
  | 'view_data'
  | 'edit_data'
  | 'randomize'
  | 'delete_participants'
  | 'manage_users'
  | 'export_data'
  | 'manage_queries'
  | 'acknowledge_sae'
  | 'edit_study_config'
  | 'lock_forms'
  | 'sign_forms'
  | 'view_audit_trail'

const ROLE_PERMISSIONS: Record<MemberRole, Set<Permission>> = {
  pi: new Set([
    'view_data',
    'edit_data',
    'randomize',
    'delete_participants',
    'manage_users',
    'export_data',
    'manage_queries',
    'acknowledge_sae',
    'edit_study_config',
    'lock_forms',
    'sign_forms',
    'view_audit_trail',
  ]),
  co_investigator: new Set([
    'view_data',
    'edit_data',
    'randomize',
    'delete_participants',
    'manage_users',
    'export_data',
    'manage_queries',
    'lock_forms',
    'sign_forms',
    'view_audit_trail',
  ]),
  data_entry: new Set([
    'view_data',
    'edit_data',
    'view_audit_trail',
  ]),
  read_only: new Set([
    'view_data',
  ]),
  monitor: new Set([
    'view_data',
    'export_data',
    'manage_queries',
    'view_audit_trail',
  ]),
}

export function hasPermission(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false
}

export function canEditData(role: MemberRole): boolean {
  return hasPermission(role, 'edit_data')
}

export function canRandomize(role: MemberRole): boolean {
  return hasPermission(role, 'randomize')
}

export function canExport(role: MemberRole): boolean {
  return hasPermission(role, 'export_data')
}

export function canManageQueries(role: MemberRole): boolean {
  return hasPermission(role, 'manage_queries')
}

export function canLockForms(role: MemberRole): boolean {
  return hasPermission(role, 'lock_forms')
}

export function canSignForms(role: MemberRole): boolean {
  return hasPermission(role, 'sign_forms')
}

export function canManageUsers(role: MemberRole): boolean {
  return hasPermission(role, 'manage_users')
}

export function canEditStudyConfig(role: MemberRole): boolean {
  return hasPermission(role, 'edit_study_config')
}

export function canViewAuditTrail(role: MemberRole): boolean {
  return hasPermission(role, 'view_audit_trail')
}

export function canAcknowledgeSAE(role: MemberRole): boolean {
  return hasPermission(role, 'acknowledge_sae')
}

export function canDeleteParticipants(role: MemberRole): boolean {
  return hasPermission(role, 'delete_participants')
}
