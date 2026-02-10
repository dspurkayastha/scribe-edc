import { describe, it, expect } from 'vitest'
import { isReDoSVulnerable, validateRegexPattern } from '@/lib/form-engine/regex-safety'

describe('Regex Safety', () => {
  describe('isReDoSVulnerable', () => {
    it('marks safe patterns as not vulnerable', () => {
      expect(isReDoSVulnerable('^[a-z]+$')).toBe(false)
      expect(isReDoSVulnerable('^\\d{1,10}$')).toBe(false)
      expect(isReDoSVulnerable('^[A-Z]{2}\\d{4}$')).toBe(false)
    })

    it('marks known ReDoS patterns as vulnerable', () => {
      // Classic ReDoS: nested quantifiers
      expect(isReDoSVulnerable('(a+)+')).toBe(true)
      expect(isReDoSVulnerable('([a-zA-Z]+)*')).toBe(true)
    })

    it('marks overly long patterns as vulnerable', () => {
      const longPattern = 'a'.repeat(201)
      expect(isReDoSVulnerable(longPattern)).toBe(true)
    })
  })

  describe('validateRegexPattern', () => {
    it('accepts safe patterns', () => {
      expect(validateRegexPattern('^[a-z]+$')).toBeNull()
      expect(validateRegexPattern('^\\d{3}-\\d{4}$')).toBeNull()
    })

    it('rejects invalid regex syntax', () => {
      const error = validateRegexPattern('[invalid')
      expect(error).toContain('Invalid regex')
    })

    it('rejects overly long patterns', () => {
      const error = validateRegexPattern('x'.repeat(201))
      expect(error).toContain('too long')
    })

    it('rejects ReDoS-vulnerable patterns', () => {
      const error = validateRegexPattern('(a+)+')
      expect(error).toContain('ReDoS')
    })
  })
})
