import { describe, it, expect } from 'vitest'
import {
  evaluateExpression,
  evaluateBooleanExpression,
  extractFieldRefs,
  resolveFieldRefs,
} from '@/lib/form-engine/expression-engine'
import { validateExpression } from '@/lib/form-engine/expression-safety'
import { detectExpressionCycles } from '@/lib/form-engine/cycle-detector'
import type { FormSchema } from '@/types/form-schema'

describe('Expression Engine', () => {
  describe('resolveFieldRefs', () => {
    it('replaces {fieldId} with variable names', () => {
      const result = resolveFieldRefs('{age} >= 18')
      expect(result.resolved).toBe('age >= 18')
      expect(result.fieldRefs).toEqual(['age'])
    })

    it('handles cross-form references', () => {
      const result = resolveFieldRefs('{demographics.age} >= 18')
      expect(result.resolved).toBe('demographics__age >= 18')
      expect(result.fieldRefs).toEqual(['demographics.age'])
    })

    it('handles multiple refs', () => {
      const result = resolveFieldRefs('{weight} / ({height}/100)^2')
      expect(result.fieldRefs).toEqual(['weight', 'height'])
    })
  })

  describe('evaluateExpression', () => {
    it('evaluates simple arithmetic', () => {
      expect(evaluateExpression('{a} + {b}', { a: 3, b: 4 })).toBe(7)
    })

    it('evaluates comparisons', () => {
      expect(evaluateExpression('{age} >= 18', { age: 20 })).toBeTruthy()
      expect(evaluateExpression('{age} >= 18', { age: 15 })).toBeFalsy()
    })

    it('handles string comparison', () => {
      expect(evaluateExpression('{sex} == "male"', { sex: 'male' })).toBeTruthy()
      expect(evaluateExpression('{sex} == "male"', { sex: 'female' })).toBeFalsy()
    })

    it('returns null for invalid expressions', () => {
      expect(evaluateExpression('', { a: 1 })).toBeNull()
    })

    it('returns null for oversized expressions', () => {
      const longExpr = '{x} + ' + '1 + '.repeat(200) + '1'
      expect(evaluateExpression(longExpr, { x: 1 })).toBeNull()
    })

    it('handles missing variables gracefully', () => {
      const result = evaluateExpression('{missing} + 1', {})
      // filtrex treats undefined as 0 in arithmetic
      expect(result).toBeDefined()
    })
  })

  describe('evaluateBooleanExpression', () => {
    it('returns boolean for truthy expressions', () => {
      expect(evaluateBooleanExpression('{age} >= 18', { age: 20 })).toBe(true)
    })

    it('returns false for falsy expressions', () => {
      expect(evaluateBooleanExpression('{age} >= 18', { age: 10 })).toBe(false)
    })
  })

  describe('extractFieldRefs', () => {
    it('extracts simple field refs', () => {
      expect(extractFieldRefs('{age} >= 18 and {sex} == "male"')).toEqual(['age', 'sex'])
    })

    it('extracts cross-form refs', () => {
      expect(extractFieldRefs('{demographics.age}')).toEqual(['demographics.age'])
    })
  })
})

describe('Expression Safety', () => {
  it('accepts valid expressions', () => {
    expect(validateExpression('{age} >= 18')).toEqual([])
  })

  it('rejects empty expressions', () => {
    expect(validateExpression('')).toHaveLength(1)
  })

  it('rejects expressions that are too long', () => {
    const longExpr = 'x '.repeat(300)
    const errors = validateExpression(longExpr)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects deeply nested expressions', () => {
    const nested = '('.repeat(15) + '1' + ')'.repeat(15)
    const errors = validateExpression(nested)
    expect(errors.some((e) => e.includes('nesting'))).toBe(true)
  })

  it('rejects unbalanced parentheses', () => {
    const errors = validateExpression('((1 + 2)')
    expect(errors.some((e) => e.includes('parenthes'))).toBe(true)
  })
})

describe('Cycle Detector', () => {
  it('detects no cycles in a valid schema', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'a', type: 'number', label: 'A' },
            { id: 'b', type: 'number', label: 'B' },
            { id: 'c', type: 'calculated', label: 'C', expression: '{a} + {b}', dependsOn: ['a', 'b'] },
          ],
        }],
      }],
    }
    expect(detectExpressionCycles(schema)).toEqual([])
  })

  it('detects circular dependencies', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'a', type: 'calculated', label: 'A', expression: '{b} + 1', dependsOn: ['b'] },
            { id: 'b', type: 'calculated', label: 'B', expression: '{a} + 1', dependsOn: ['a'] },
          ],
        }],
      }],
    }
    const errors = detectExpressionCycles(schema)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Circular dependency')
  })
})
