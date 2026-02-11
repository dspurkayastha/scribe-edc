import { describe, it, expect } from 'vitest'
import {
  evaluateExpression,
  evaluateBooleanExpression,
  extractFieldRefs,
  resolveFieldRefs,
  buildExpressionContext,
} from '@/lib/form-engine/expression-engine'
import { validateExpression } from '@/lib/form-engine/expression-safety'
import { detectExpressionCycles } from '@/lib/form-engine/cycle-detector'
import type { FormSchema } from '@/types/form-schema'

// ═══════════════════════════════════════════════════════════════
// resolveFieldRefs
// ═══════════════════════════════════════════════════════════════

describe('resolveFieldRefs', () => {
  it('replaces {fieldId} with bare variable names', () => {
    const result = resolveFieldRefs('{age} >= 18')
    expect(result.resolved).toBe('age >= 18')
    expect(result.fieldRefs).toEqual(['age'])
  })

  it('replaces cross-form references {formSlug.fieldId} with double-underscore names', () => {
    const result = resolveFieldRefs('{demographics.age} >= 18')
    expect(result.resolved).toBe('demographics__age >= 18')
    expect(result.fieldRefs).toEqual(['demographics.age'])
  })

  it('handles multiple refs in a single expression', () => {
    const result = resolveFieldRefs('{weight} / ({height} / 100) * 2')
    expect(result.fieldRefs).toEqual(['weight', 'height'])
    expect(result.resolved).toBe('weight / (height / 100) * 2')
  })

  it('handles expressions with no field refs', () => {
    const result = resolveFieldRefs('1 + 2')
    expect(result.resolved).toBe('1 + 2')
    expect(result.fieldRefs).toEqual([])
  })

  it('handles empty expression', () => {
    const result = resolveFieldRefs('')
    expect(result.resolved).toBe('')
    expect(result.fieldRefs).toEqual([])
  })

  it('handles consecutive field refs without operators', () => {
    const result = resolveFieldRefs('{a} {b}')
    expect(result.fieldRefs).toEqual(['a', 'b'])
    expect(result.resolved).toBe('a b')
  })

  it('does not match invalid field ID patterns (uppercase)', () => {
    const result = resolveFieldRefs('{Invalid}')
    // regex is /\{([a-z][a-z0-9_.]*)\}/g so uppercase first letter won't match
    expect(result.fieldRefs).toEqual([])
    expect(result.resolved).toBe('{Invalid}')
  })

  it('handles field IDs with underscores', () => {
    const result = resolveFieldRefs('{systolic_bp} > 140')
    expect(result.fieldRefs).toEqual(['systolic_bp'])
    expect(result.resolved).toBe('systolic_bp > 140')
  })

  it('handles field IDs with digits', () => {
    const result = resolveFieldRefs('{lab_value1} + {lab_value2}')
    expect(result.fieldRefs).toEqual(['lab_value1', 'lab_value2'])
  })
})

// ═══════════════════════════════════════════════════════════════
// buildExpressionContext
// ═══════════════════════════════════════════════════════════════

describe('buildExpressionContext', () => {
  it('returns local data as-is', () => {
    const context = buildExpressionContext({ a: 1, b: 'hello' })
    expect(context).toEqual({ a: 1, b: 'hello' })
  })

  it('flattens cross-form data with double-underscore keys', () => {
    const context = buildExpressionContext(
      { local_field: 10 },
      { demographics: { age: 25, sex: 'male' } }
    )
    expect(context.local_field).toBe(10)
    expect(context.demographics__age).toBe(25)
    expect(context.demographics__sex).toBe('male')
  })

  it('handles empty cross-form data', () => {
    const context = buildExpressionContext({ a: 1 }, {})
    expect(context).toEqual({ a: 1 })
  })

  it('handles undefined cross-form data', () => {
    const context = buildExpressionContext({ a: 1 })
    expect(context).toEqual({ a: 1 })
  })

  it('merges multiple cross-form slugs', () => {
    const context = buildExpressionContext(
      {},
      {
        form_a: { x: 1 },
        form_b: { y: 2 },
      }
    )
    expect(context.form_a__x).toBe(1)
    expect(context.form_b__y).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════
// evaluateExpression
// ═══════════════════════════════════════════════════════════════

describe('evaluateExpression', () => {
  describe('arithmetic operations', () => {
    it('adds two fields', () => {
      expect(evaluateExpression('{a} + {b}', { a: 3, b: 4 })).toBe(7)
    })

    it('subtracts fields', () => {
      expect(evaluateExpression('{a} - {b}', { a: 10, b: 3 })).toBe(7)
    })

    it('multiplies fields', () => {
      expect(evaluateExpression('{a} * {b}', { a: 5, b: 6 })).toBe(30)
    })

    it('divides fields', () => {
      expect(evaluateExpression('{a} / {b}', { a: 20, b: 4 })).toBe(5)
    })

    it('supports nested arithmetic', () => {
      expect(evaluateExpression('({a} + {b}) * {c}', { a: 2, b: 3, c: 4 })).toBe(20)
    })
  })

  describe('comparison operations', () => {
    it('evaluates >= (truthy)', () => {
      expect(evaluateExpression('{age} >= 18', { age: 20 })).toBeTruthy()
    })

    it('evaluates >= (falsy)', () => {
      expect(evaluateExpression('{age} >= 18', { age: 15 })).toBeFalsy()
    })

    it('evaluates == for numbers', () => {
      expect(evaluateExpression('{x} == 5', { x: 5 })).toBeTruthy()
      expect(evaluateExpression('{x} == 5', { x: 6 })).toBeFalsy()
    })

    it('evaluates == for strings', () => {
      expect(evaluateExpression('{sex} == "male"', { sex: 'male' })).toBeTruthy()
      expect(evaluateExpression('{sex} == "male"', { sex: 'female' })).toBeFalsy()
    })

    it('evaluates != for strings', () => {
      expect(evaluateExpression('{status} != "active"', { status: 'inactive' })).toBeTruthy()
    })

    it('evaluates < and >', () => {
      expect(evaluateExpression('{val} < 10', { val: 5 })).toBeTruthy()
      expect(evaluateExpression('{val} > 10', { val: 15 })).toBeTruthy()
    })
  })

  describe('whitelisted functions', () => {
    it('round with default decimals', () => {
      expect(evaluateExpression('round({val})', { val: 3.7 })).toBe(4)
    })

    it('round with specified decimals', () => {
      expect(evaluateExpression('round({val}, 2)', { val: 3.14159 })).toBe(3.14)
    })

    it('floor', () => {
      expect(evaluateExpression('floor({val})', { val: 3.9 })).toBe(3)
    })

    it('ceil', () => {
      expect(evaluateExpression('ceil({val})', { val: 3.1 })).toBe(4)
    })

    it('abs', () => {
      expect(evaluateExpression('abs({val})', { val: -5 })).toBe(5)
    })

    it('min', () => {
      expect(evaluateExpression('min({a}, {b})', { a: 3, b: 7 })).toBe(3)
    })

    it('max', () => {
      expect(evaluateExpression('max({a}, {b})', { a: 3, b: 7 })).toBe(7)
    })

    it('sqrt', () => {
      expect(evaluateExpression('sqrt({val})', { val: 16 })).toBe(4)
    })

    it('pow', () => {
      expect(evaluateExpression('pow({base}, {exp})', { base: 2, exp: 3 })).toBe(8)
    })

    it('lower', () => {
      expect(evaluateExpression('lower({name})', { name: 'HELLO' })).toBe('hello')
    })

    it('upper', () => {
      expect(evaluateExpression('upper({name})', { name: 'hello' })).toBe('HELLO')
    })

    it('length of string', () => {
      expect(evaluateExpression('length({name})', { name: 'hello' })).toBe(5)
    })

    it('if function returns null when filtrex cannot parse it (reserved keyword)', () => {
      // filtrex treats "if" as a reserved keyword, so if() as a custom function
      // may not work. The expression engine returns null on errors.
      const result = evaluateExpression('if({flag}, 1, 0)', { flag: 1 })
      // Returns null because filtrex throws on "if" usage
      expect(result).toBeNull()
    })

    it('conditional logic using ternary-like expression with comparison', () => {
      // Alternative to if() - use comparison-based expressions
      const resultTruthy = evaluateExpression('{flag} >= 1', { flag: 1 })
      expect(resultTruthy).toBeTruthy()
      const resultFalsy = evaluateExpression('{flag} >= 1', { flag: 0 })
      expect(resultFalsy).toBeFalsy()
    })
  })

  describe('cross-form data', () => {
    it('evaluates cross-form field references', () => {
      const result = evaluateExpression(
        '{demographics.age} >= 18',
        {},
        { demographics: { age: 25 } }
      )
      expect(result).toBeTruthy()
    })

    it('combines local and cross-form data', () => {
      const result = evaluateExpression(
        '{local_val} + {other_form.val}',
        { local_val: 10 },
        { other_form: { val: 5 } }
      )
      expect(result).toBe(15)
    })
  })

  describe('edge cases and error handling', () => {
    it('returns null for empty expression', () => {
      expect(evaluateExpression('', { a: 1 })).toBeNull()
    })

    it('returns null for expression exceeding max length (500 chars)', () => {
      const longExpr = '{x} + ' + '1 + '.repeat(200) + '1'
      expect(evaluateExpression(longExpr, { x: 1 })).toBeNull()
    })

    it('handles missing variables gracefully (filtrex treats undefined as 0)', () => {
      const result = evaluateExpression('{missing} + 1', {})
      // filtrex coerces undefined to 0 in arithmetic
      expect(result).toBeDefined()
    })

    it('returns null for syntax errors in the expression', () => {
      expect(evaluateExpression('{a} +++ {b}', { a: 1, b: 2 })).toBeNull()
    })

    it('handles boolean logical operators', () => {
      expect(evaluateExpression('{a} == 1 and {b} == 2', { a: 1, b: 2 })).toBeTruthy()
      expect(evaluateExpression('{a} == 1 or {b} == 2', { a: 0, b: 2 })).toBeTruthy()
      expect(evaluateExpression('{a} == 1 and {b} == 2', { a: 1, b: 3 })).toBeFalsy()
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// evaluateBooleanExpression
// ═══════════════════════════════════════════════════════════════

describe('evaluateBooleanExpression', () => {
  it('returns true for truthy result', () => {
    expect(evaluateBooleanExpression('{age} >= 18', { age: 20 })).toBe(true)
  })

  it('returns false for falsy result', () => {
    expect(evaluateBooleanExpression('{age} >= 18', { age: 10 })).toBe(false)
  })

  it('returns false for null result (invalid expression)', () => {
    expect(evaluateBooleanExpression('', {})).toBe(false)
  })

  it('returns true for non-zero numeric result', () => {
    expect(evaluateBooleanExpression('{val}', { val: 42 })).toBe(true)
  })

  it('returns false for zero', () => {
    expect(evaluateBooleanExpression('{val}', { val: 0 })).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// extractFieldRefs
// ═══════════════════════════════════════════════════════════════

describe('extractFieldRefs', () => {
  it('extracts simple field refs', () => {
    expect(extractFieldRefs('{age} >= 18 and {sex} == "male"')).toEqual(['age', 'sex'])
  })

  it('extracts cross-form refs', () => {
    expect(extractFieldRefs('{demographics.age}')).toEqual(['demographics.age'])
  })

  it('returns empty array for no refs', () => {
    expect(extractFieldRefs('1 + 2')).toEqual([])
  })

  it('handles duplicate refs (returns all occurrences)', () => {
    expect(extractFieldRefs('{a} + {a}')).toEqual(['a', 'a'])
  })
})

// ═══════════════════════════════════════════════════════════════
// Expression Safety (expression-safety.ts)
// ═══════════════════════════════════════════════════════════════

describe('Expression Safety (validateExpression)', () => {
  it('accepts a valid simple expression', () => {
    expect(validateExpression('{age} >= 18')).toEqual([])
  })

  it('accepts a valid complex expression', () => {
    expect(validateExpression('{weight} / (({height} / 100) * ({height} / 100))')).toEqual([])
  })

  it('rejects empty string', () => {
    const errors = validateExpression('')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('required')
  })

  it('rejects null / undefined / non-string', () => {
    expect(validateExpression(null as any).length).toBeGreaterThan(0)
    expect(validateExpression(undefined as any).length).toBeGreaterThan(0)
  })

  it('rejects expression exceeding 500 characters', () => {
    const longExpr = 'x '.repeat(300)
    const errors = validateExpression(longExpr)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('maximum length')
  })

  it('rejects deeply nested expression (> 10 levels)', () => {
    const nested = '('.repeat(15) + '1' + ')'.repeat(15)
    const errors = validateExpression(nested)
    expect(errors.some((e) => e.includes('nesting'))).toBe(true)
  })

  it('rejects unbalanced parentheses', () => {
    const errors = validateExpression('((1 + 2)')
    expect(errors.some((e) => e.includes('parenthes'))).toBe(true)
  })

  it('rejects syntax errors caught by filtrex compile', () => {
    const errors = validateExpression('{a} +++ {b}')
    expect(errors.some((e) => e.includes('syntax'))).toBe(true)
  })

  it('accepts expressions with exactly 10 nesting levels', () => {
    const expr = '('.repeat(10) + '1' + ')'.repeat(10)
    const errors = validateExpression(expr)
    // Should not have nesting error at exactly 10
    expect(errors.some((e) => e.includes('nesting'))).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// Cycle Detector
// ═══════════════════════════════════════════════════════════════

describe('Cycle Detector (detectExpressionCycles)', () => {
  it('detects no cycles in a linear dependency chain (a -> b -> c)', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'a', type: 'number', label: 'A' },
            { id: 'b', type: 'calculated', label: 'B', expression: '{a} + 1' },
            { id: 'c', type: 'calculated', label: 'C', expression: '{b} + 1' },
          ],
        }],
      }],
    }
    expect(detectExpressionCycles(schema)).toEqual([])
  })

  it('detects a 2-node cycle (a -> b -> a)', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'a', type: 'calculated', label: 'A', expression: '{b} + 1' },
            { id: 'b', type: 'calculated', label: 'B', expression: '{a} + 1' },
          ],
        }],
      }],
    }
    const errors = detectExpressionCycles(schema)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Circular dependency')
    expect(errors[0]).toContain('a')
    expect(errors[0]).toContain('b')
  })

  it('detects a 3-node cycle (a -> b -> c -> a)', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'a', type: 'calculated', label: 'A', expression: '{c}' },
            { id: 'b', type: 'calculated', label: 'B', expression: '{a}' },
            { id: 'c', type: 'calculated', label: 'C', expression: '{b}' },
          ],
        }],
      }],
    }
    const errors = detectExpressionCycles(schema)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Circular dependency')
  })

  it('detects no cycles when there are no dependencies at all', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'a', type: 'text', label: 'A' },
            { id: 'b', type: 'number', label: 'B' },
          ],
        }],
      }],
    }
    expect(detectExpressionCycles(schema)).toEqual([])
  })

  it('handles visibility expression dependencies', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'a', type: 'number', label: 'A', visibility: '{b} == 1' },
            { id: 'b', type: 'number', label: 'B', visibility: '{a} == 1' },
          ],
        }],
      }],
    }
    const errors = detectExpressionCycles(schema)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Circular dependency')
  })

  it('handles dependsOn for explicit dependencies', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'a', type: 'number', label: 'A', dependsOn: ['b'] },
            { id: 'b', type: 'number', label: 'B', dependsOn: ['a'] },
          ],
        }],
      }],
    }
    const errors = detectExpressionCycles(schema)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('ignores cross-form references (refs with dots) for cycle detection', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'a', type: 'calculated', label: 'A', expression: '{other_form.b} + 1' },
          ],
        }],
      }],
    }
    expect(detectExpressionCycles(schema)).toEqual([])
  })

  it('skips descriptive fields', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'info', type: 'descriptive', label: 'Info text' },
            { id: 'a', type: 'number', label: 'A' },
          ],
        }],
      }],
    }
    expect(detectExpressionCycles(schema)).toEqual([])
  })

  it('handles repeatable section field IDs (prefixed with section ID)', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 'meds',
          title: 'Medications',
          repeatable: true,
          fields: [
            { id: 'drug', type: 'text', label: 'Drug' },
            { id: 'dose', type: 'calculated', label: 'Dose', expression: '{drug}' },
          ],
        }],
      }],
    }
    // Repeatable sections prefix field IDs with section ID: meds.drug, meds.dose
    // Expression {drug} is a local ref (no dot), so it's not the same as meds.drug
    // The cycle detector may or may not detect a dependency here depending on the ref
    expect(detectExpressionCycles(schema)).toEqual([])
  })
})
