import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  canEditData,
  canRandomize,
  canExport,
  canLockForms,
  canSignForms,
  canManageUsers,
  canEditStudyConfig,
  canViewAuditTrail,
  canAcknowledgeSAE,
  canDeleteParticipants,
} from '@/lib/auth/permissions'

describe('Permissions', () => {
  describe('PI role', () => {
    it('has all permissions', () => {
      expect(canEditData('pi')).toBe(true)
      expect(canRandomize('pi')).toBe(true)
      expect(canExport('pi')).toBe(true)
      expect(canLockForms('pi')).toBe(true)
      expect(canSignForms('pi')).toBe(true)
      expect(canManageUsers('pi')).toBe(true)
      expect(canEditStudyConfig('pi')).toBe(true)
      expect(canViewAuditTrail('pi')).toBe(true)
      expect(canAcknowledgeSAE('pi')).toBe(true)
      expect(canDeleteParticipants('pi')).toBe(true)
    })
  })

  describe('Data entry role', () => {
    it('can edit data and view audit trail', () => {
      expect(canEditData('data_entry')).toBe(true)
      expect(canViewAuditTrail('data_entry')).toBe(true)
    })

    it('cannot randomize, export, or manage', () => {
      expect(canRandomize('data_entry')).toBe(false)
      expect(canExport('data_entry')).toBe(false)
      expect(canLockForms('data_entry')).toBe(false)
      expect(canSignForms('data_entry')).toBe(false)
      expect(canManageUsers('data_entry')).toBe(false)
      expect(canEditStudyConfig('data_entry')).toBe(false)
      expect(canDeleteParticipants('data_entry')).toBe(false)
    })
  })

  describe('Read-only role', () => {
    it('can only view data', () => {
      expect(hasPermission('read_only', 'view_data')).toBe(true)
      expect(canEditData('read_only')).toBe(false)
      expect(canRandomize('read_only')).toBe(false)
      expect(canExport('read_only')).toBe(false)
      expect(canViewAuditTrail('read_only')).toBe(false)
    })
  })

  describe('Monitor role', () => {
    it('can view, export, manage queries, and view audit trail', () => {
      expect(hasPermission('monitor', 'view_data')).toBe(true)
      expect(canExport('monitor')).toBe(true)
      expect(canViewAuditTrail('monitor')).toBe(true)
    })

    it('cannot edit data or manage users', () => {
      expect(canEditData('monitor')).toBe(false)
      expect(canManageUsers('monitor')).toBe(false)
      expect(canRandomize('monitor')).toBe(false)
    })
  })

  describe('Co-investigator role', () => {
    it('has most PI permissions except SAE acknowledgment and study config', () => {
      expect(canEditData('co_investigator')).toBe(true)
      expect(canRandomize('co_investigator')).toBe(true)
      expect(canLockForms('co_investigator')).toBe(true)
      expect(canSignForms('co_investigator')).toBe(true)
      expect(canAcknowledgeSAE('co_investigator')).toBe(false)
      expect(canEditStudyConfig('co_investigator')).toBe(false)
    })
  })
})
