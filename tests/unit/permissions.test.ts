import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  canEditData,
  canRandomize,
  canExport,
  canManageQueries,
  canLockForms,
  canSignForms,
  canManageUsers,
  canEditStudyConfig,
  canViewAuditTrail,
  canAcknowledgeSAE,
  canDeleteParticipants,
} from '@/lib/auth/permissions'
import type { MemberRole } from '@/types/database'

const ALL_ROLES: MemberRole[] = ['pi', 'co_investigator', 'data_entry', 'read_only', 'monitor']

// ═══════════════════════════════════════════════════════════════
// PI ROLE - full access
// ═══════════════════════════════════════════════════════════════

describe('PI role', () => {
  const role: MemberRole = 'pi'

  it('has view_data permission', () => {
    expect(hasPermission(role, 'view_data')).toBe(true)
  })

  it('can edit data', () => {
    expect(canEditData(role)).toBe(true)
  })

  it('can randomize', () => {
    expect(canRandomize(role)).toBe(true)
  })

  it('can delete participants', () => {
    expect(canDeleteParticipants(role)).toBe(true)
  })

  it('can manage users', () => {
    expect(canManageUsers(role)).toBe(true)
  })

  it('can export data', () => {
    expect(canExport(role)).toBe(true)
  })

  it('can manage queries', () => {
    expect(canManageQueries(role)).toBe(true)
  })

  it('can acknowledge SAEs', () => {
    expect(canAcknowledgeSAE(role)).toBe(true)
  })

  it('can edit study config', () => {
    expect(canEditStudyConfig(role)).toBe(true)
  })

  it('can lock forms', () => {
    expect(canLockForms(role)).toBe(true)
  })

  it('can sign forms', () => {
    expect(canSignForms(role)).toBe(true)
  })

  it('can view audit trail', () => {
    expect(canViewAuditTrail(role)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// CO-INVESTIGATOR ROLE
// ═══════════════════════════════════════════════════════════════

describe('Co-investigator role', () => {
  const role: MemberRole = 'co_investigator'

  it('can view data', () => {
    expect(hasPermission(role, 'view_data')).toBe(true)
  })

  it('can edit data', () => {
    expect(canEditData(role)).toBe(true)
  })

  it('can randomize', () => {
    expect(canRandomize(role)).toBe(true)
  })

  it('can delete participants', () => {
    expect(canDeleteParticipants(role)).toBe(true)
  })

  it('can manage users', () => {
    expect(canManageUsers(role)).toBe(true)
  })

  it('can export data', () => {
    expect(canExport(role)).toBe(true)
  })

  it('can manage queries', () => {
    expect(canManageQueries(role)).toBe(true)
  })

  it('can lock forms', () => {
    expect(canLockForms(role)).toBe(true)
  })

  it('can sign forms', () => {
    expect(canSignForms(role)).toBe(true)
  })

  it('can view audit trail', () => {
    expect(canViewAuditTrail(role)).toBe(true)
  })

  it('CANNOT acknowledge SAEs', () => {
    expect(canAcknowledgeSAE(role)).toBe(false)
  })

  it('CANNOT edit study config', () => {
    expect(canEditStudyConfig(role)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// DATA ENTRY ROLE
// ═══════════════════════════════════════════════════════════════

describe('Data entry role', () => {
  const role: MemberRole = 'data_entry'

  it('can view data', () => {
    expect(hasPermission(role, 'view_data')).toBe(true)
  })

  it('can edit data', () => {
    expect(canEditData(role)).toBe(true)
  })

  it('can view audit trail', () => {
    expect(canViewAuditTrail(role)).toBe(true)
  })

  it('CANNOT randomize', () => {
    expect(canRandomize(role)).toBe(false)
  })

  it('CANNOT delete participants', () => {
    expect(canDeleteParticipants(role)).toBe(false)
  })

  it('CANNOT manage users', () => {
    expect(canManageUsers(role)).toBe(false)
  })

  it('CANNOT export data', () => {
    expect(canExport(role)).toBe(false)
  })

  it('CANNOT manage queries', () => {
    expect(canManageQueries(role)).toBe(false)
  })

  it('CANNOT acknowledge SAEs', () => {
    expect(canAcknowledgeSAE(role)).toBe(false)
  })

  it('CANNOT edit study config', () => {
    expect(canEditStudyConfig(role)).toBe(false)
  })

  it('CANNOT lock forms', () => {
    expect(canLockForms(role)).toBe(false)
  })

  it('CANNOT sign forms', () => {
    expect(canSignForms(role)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// READ-ONLY ROLE
// ═══════════════════════════════════════════════════════════════

describe('Read-only role', () => {
  const role: MemberRole = 'read_only'

  it('can view data', () => {
    expect(hasPermission(role, 'view_data')).toBe(true)
  })

  it('CANNOT edit data', () => {
    expect(canEditData(role)).toBe(false)
  })

  it('CANNOT randomize', () => {
    expect(canRandomize(role)).toBe(false)
  })

  it('CANNOT delete participants', () => {
    expect(canDeleteParticipants(role)).toBe(false)
  })

  it('CANNOT manage users', () => {
    expect(canManageUsers(role)).toBe(false)
  })

  it('CANNOT export data', () => {
    expect(canExport(role)).toBe(false)
  })

  it('CANNOT manage queries', () => {
    expect(canManageQueries(role)).toBe(false)
  })

  it('CANNOT acknowledge SAEs', () => {
    expect(canAcknowledgeSAE(role)).toBe(false)
  })

  it('CANNOT edit study config', () => {
    expect(canEditStudyConfig(role)).toBe(false)
  })

  it('CANNOT lock forms', () => {
    expect(canLockForms(role)).toBe(false)
  })

  it('CANNOT sign forms', () => {
    expect(canSignForms(role)).toBe(false)
  })

  it('CANNOT view audit trail', () => {
    expect(canViewAuditTrail(role)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// MONITOR ROLE
// ═══════════════════════════════════════════════════════════════

describe('Monitor role', () => {
  const role: MemberRole = 'monitor'

  it('can view data', () => {
    expect(hasPermission(role, 'view_data')).toBe(true)
  })

  it('can export data', () => {
    expect(canExport(role)).toBe(true)
  })

  it('can manage queries', () => {
    expect(canManageQueries(role)).toBe(true)
  })

  it('can view audit trail', () => {
    expect(canViewAuditTrail(role)).toBe(true)
  })

  it('CANNOT edit data', () => {
    expect(canEditData(role)).toBe(false)
  })

  it('CANNOT randomize', () => {
    expect(canRandomize(role)).toBe(false)
  })

  it('CANNOT delete participants', () => {
    expect(canDeleteParticipants(role)).toBe(false)
  })

  it('CANNOT manage users', () => {
    expect(canManageUsers(role)).toBe(false)
  })

  it('CANNOT acknowledge SAEs', () => {
    expect(canAcknowledgeSAE(role)).toBe(false)
  })

  it('CANNOT edit study config', () => {
    expect(canEditStudyConfig(role)).toBe(false)
  })

  it('CANNOT lock forms', () => {
    expect(canLockForms(role)).toBe(false)
  })

  it('CANNOT sign forms', () => {
    expect(canSignForms(role)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// hasPermission edge cases
// ═══════════════════════════════════════════════════════════════

describe('hasPermission edge cases', () => {
  it('returns false for unknown role', () => {
    expect(hasPermission('unknown_role' as MemberRole, 'view_data')).toBe(false)
  })

  it('returns false for unknown permission', () => {
    expect(hasPermission('pi', 'unknown_permission' as any)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// Cross-role matrix tests
// ═══════════════════════════════════════════════════════════════

describe('Permission matrix - canEditData', () => {
  it.each([
    ['pi', true],
    ['co_investigator', true],
    ['data_entry', true],
    ['read_only', false],
    ['monitor', false],
  ] as [MemberRole, boolean][])('%s canEditData = %s', (role, expected) => {
    expect(canEditData(role)).toBe(expected)
  })
})

describe('Permission matrix - canRandomize', () => {
  it.each([
    ['pi', true],
    ['co_investigator', true],
    ['data_entry', false],
    ['read_only', false],
    ['monitor', false],
  ] as [MemberRole, boolean][])('%s canRandomize = %s', (role, expected) => {
    expect(canRandomize(role)).toBe(expected)
  })
})

describe('Permission matrix - canExport', () => {
  it.each([
    ['pi', true],
    ['co_investigator', true],
    ['data_entry', false],
    ['read_only', false],
    ['monitor', true],
  ] as [MemberRole, boolean][])('%s canExport = %s', (role, expected) => {
    expect(canExport(role)).toBe(expected)
  })
})

describe('Permission matrix - canAcknowledgeSAE', () => {
  it.each([
    ['pi', true],
    ['co_investigator', false],
    ['data_entry', false],
    ['read_only', false],
    ['monitor', false],
  ] as [MemberRole, boolean][])('%s canAcknowledgeSAE = %s', (role, expected) => {
    expect(canAcknowledgeSAE(role)).toBe(expected)
  })
})

describe('Permission matrix - canEditStudyConfig', () => {
  it.each([
    ['pi', true],
    ['co_investigator', false],
    ['data_entry', false],
    ['read_only', false],
    ['monitor', false],
  ] as [MemberRole, boolean][])('%s canEditStudyConfig = %s', (role, expected) => {
    expect(canEditStudyConfig(role)).toBe(expected)
  })
})
