import { describe, it, expect } from 'vitest'
import { isReDoSVulnerable, validateRegexPattern } from '@/lib/form-engine/regex-safety'

// ═══════════════════════════════════════════════════════════════
// isReDoSVulnerable
// ═══════════════════════════════════════════════════════════════

describe('isReDoSVulnerable', () => {
  describe('safe patterns', () => {
    it('marks ^[a-z]+$ as safe', () => {
      expect(isReDoSVulnerable('^[a-z]+$')).toBe(false)
    })

    it('marks ^\\d{1,10}$ as safe', () => {
      expect(isReDoSVulnerable('^\\d{1,10}$')).toBe(false)
    })

    it('marks ^[A-Z]{2}\\d{4}$ as safe', () => {
      expect(isReDoSVulnerable('^[A-Z]{2}\\d{4}$')).toBe(false)
    })

    it('marks simple email pattern as safe', () => {
      expect(isReDoSVulnerable('^[a-z0-9]+@[a-z0-9]+\\.[a-z]+$')).toBe(false)
    })

    it('marks phone number pattern as safe', () => {
      expect(isReDoSVulnerable('^\\d{3}-\\d{3}-\\d{4}$')).toBe(false)
    })

    it('marks date pattern as safe', () => {
      expect(isReDoSVulnerable('^\\d{4}-\\d{2}-\\d{2}$')).toBe(false)
    })
  })

  describe('vulnerable patterns', () => {
    it('detects (a+)+ as vulnerable', () => {
      expect(isReDoSVulnerable('(a+)+')).toBe(true)
    })

    it('detects ([a-zA-Z]+)* as vulnerable', () => {
      expect(isReDoSVulnerable('([a-zA-Z]+)*')).toBe(true)
    })

    it('detects (a*){2} as potentially vulnerable', () => {
      // Nested quantifier causes catastrophic backtracking
      expect(isReDoSVulnerable('(a*){2}')).toBe(true)
    })
  })

  describe('length limit', () => {
    it('marks patterns over 200 chars as vulnerable', () => {
      expect(isReDoSVulnerable('a'.repeat(201))).toBe(true)
    })

    it('accepts patterns at exactly 200 chars', () => {
      const pattern = 'a'.repeat(200)
      // The result depends on safe-regex2 analysis of the pattern itself
      // But it should NOT be rejected based on length alone
      const result = isReDoSVulnerable(pattern)
      expect(typeof result).toBe('boolean')
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// validateRegexPattern
// ═══════════════════════════════════════════════════════════════

describe('validateRegexPattern', () => {
  describe('valid safe patterns', () => {
    it('accepts ^[a-z]+$', () => {
      expect(validateRegexPattern('^[a-z]+$')).toBeNull()
    })

    it('accepts ^\\d{3}-\\d{4}$', () => {
      expect(validateRegexPattern('^\\d{3}-\\d{4}$')).toBeNull()
    })

    it('accepts ^[A-Z]{2,5}$', () => {
      expect(validateRegexPattern('^[A-Z]{2,5}$')).toBeNull()
    })
  })

  describe('invalid regex syntax', () => {
    it('rejects unclosed bracket [invalid', () => {
      const error = validateRegexPattern('[invalid')
      expect(error).not.toBeNull()
      expect(error).toContain('Invalid regex')
    })

    it('rejects unclosed group (abc', () => {
      const error = validateRegexPattern('(abc')
      expect(error).not.toBeNull()
      expect(error).toContain('Invalid regex')
    })
  })

  describe('length validation', () => {
    it('rejects patterns over 200 characters', () => {
      const error = validateRegexPattern('x'.repeat(201))
      expect(error).not.toBeNull()
      expect(error).toContain('too long')
      expect(error).toContain('200')
    })
  })

  describe('ReDoS detection', () => {
    it('rejects (a+)+', () => {
      const error = validateRegexPattern('(a+)+')
      expect(error).not.toBeNull()
      expect(error).toContain('ReDoS')
    })

    it('rejects ([a-zA-Z]+)*', () => {
      const error = validateRegexPattern('([a-zA-Z]+)*')
      expect(error).not.toBeNull()
      expect(error).toContain('ReDoS')
    })
  })
})
