import { describe, it, expect } from 'vitest'
import { validateFormSchema } from '@/lib/form-engine/schema-validator'
import type { FormSchema } from '@/types/form-schema'

// ═══════════════════════════════════════════════════════════════
// VALID SCHEMAS
// ═══════════════════════════════════════════════════════════════

describe('validateFormSchema - valid schemas', () => {
  it('accepts a minimal valid schema', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'name', type: 'text', label: 'Name', required: true },
          ],
        }],
      }],
    }
    expect(validateFormSchema(schema)).toEqual([])
  })

  it('accepts a schema with multiple pages and sections', () => {
    const schema: FormSchema = {
      pages: [
        {
          id: 'p1',
          title: 'Page 1',
          sections: [{
            id: 's1',
            title: 'Section 1',
            fields: [
              { id: 'name', type: 'text', label: 'Name' },
              { id: 'age', type: 'integer', label: 'Age' },
            ],
          }],
        },
        {
          id: 'p2',
          title: 'Page 2',
          sections: [{
            id: 's2',
            title: 'Section 2',
            fields: [
              { id: 'notes', type: 'textarea', label: 'Notes' },
            ],
          }],
        },
      ],
    }
    expect(validateFormSchema(schema)).toEqual([])
  })

  it('accepts radio fields with options', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{
            id: 'sex',
            type: 'radio',
            label: 'Sex',
            options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }],
          }],
        }],
      }],
    }
    expect(validateFormSchema(schema)).toEqual([])
  })

  it('accepts radio fields with optionListSlug', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{
            id: 'diagnosis',
            type: 'dropdown',
            label: 'Diagnosis',
            optionListSlug: 'icd10_codes',
          }],
        }],
      }],
    }
    expect(validateFormSchema(schema)).toEqual([])
  })

  it('accepts calculated fields with valid expressions', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [
            { id: 'weight', type: 'number', label: 'Weight' },
            { id: 'height', type: 'number', label: 'Height' },
            { id: 'bmi', type: 'calculated', label: 'BMI', expression: '{weight} / ({height} / 100) * ({height} / 100)' },
          ],
        }],
      }],
    }
    expect(validateFormSchema(schema)).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════
// EMPTY / MISSING SCHEMA
// ═══════════════════════════════════════════════════════════════

describe('validateFormSchema - empty/missing schema', () => {
  it('rejects schema with empty pages array', () => {
    const schema = { pages: [] } as FormSchema
    const errors = validateFormSchema(schema)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].message).toContain('at least one page')
  })

  it('rejects null schema', () => {
    const errors = validateFormSchema(null as any)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects undefined schema', () => {
    const errors = validateFormSchema(undefined as any)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects schema without pages property', () => {
    const errors = validateFormSchema({} as any)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects schema with non-array pages', () => {
    const errors = validateFormSchema({ pages: 'not-array' } as any)
    expect(errors.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// DUPLICATE IDs
// ═══════════════════════════════════════════════════════════════

describe('validateFormSchema - duplicate IDs', () => {
  it('rejects duplicate field IDs within same section', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'name', type: 'text', label: 'Name' },
            { id: 'name', type: 'text', label: 'Name Again' },
          ],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Duplicate field ID'))).toBe(true)
  })

  it('rejects duplicate field IDs across sections', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [
          {
            id: 's1',
            title: 'Section 1',
            fields: [{ id: 'name', type: 'text', label: 'Name' }],
          },
          {
            id: 's2',
            title: 'Section 2',
            fields: [{ id: 'name', type: 'text', label: 'Name' }],
          },
        ],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Duplicate field ID'))).toBe(true)
  })

  it('rejects duplicate page IDs', () => {
    const schema: FormSchema = {
      pages: [
        { id: 'p1', title: 'Page 1', sections: [{ id: 's1', title: 'S1', fields: [{ id: 'a', type: 'text', label: 'A' }] }] },
        { id: 'p1', title: 'Page 1 Copy', sections: [{ id: 's2', title: 'S2', fields: [{ id: 'b', type: 'text', label: 'B' }] }] },
      ],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Duplicate page'))).toBe(true)
  })

  it('rejects duplicate section IDs', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [
          { id: 's1', title: 'Section 1', fields: [{ id: 'a', type: 'text', label: 'A' }] },
          { id: 's1', title: 'Section 1 Dup', fields: [{ id: 'b', type: 'text', label: 'B' }] },
        ],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Duplicate section'))).toBe(true)
  })

  it('allows duplicate field IDs within a repeatable section', () => {
    // Repeatable sections can have same field IDs because they're scoped
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Repeatable',
          repeatable: true,
          fields: [
            { id: 'drug', type: 'text', label: 'Drug' },
          ],
        }, {
          id: 's2',
          title: 'Repeatable 2',
          repeatable: true,
          fields: [
            { id: 'drug', type: 'text', label: 'Drug' },
          ],
        }],
      }],
    }
    // The validator only skips duplicate check within a repeatable section,
    // but both sections register field IDs. Let's check what happens:
    const errors = validateFormSchema(schema)
    // The code skips duplicate check only when section.repeatable is true for the field's section
    // Since both sections are repeatable, both will skip the duplicate check
    expect(errors.filter(e => e.message.includes('Duplicate field ID'))).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════
// INVALID FIELD IDs
// ═══════════════════════════════════════════════════════════════

describe('validateFormSchema - field ID format', () => {
  it('rejects field IDs starting with uppercase', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{ id: 'InvalidId', type: 'text', label: 'Bad' }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Field ID'))).toBe(true)
  })

  it('rejects field IDs with hyphens', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{ id: 'field-name', type: 'text', label: 'Bad' }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Field ID'))).toBe(true)
  })

  it('rejects field IDs starting with digit', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{ id: '1field', type: 'text', label: 'Bad' }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Field ID'))).toBe(true)
  })

  it('accepts valid field IDs with lowercase, digits, underscores', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [
            { id: 'field_name_1', type: 'text', label: 'Good' },
            { id: 'a', type: 'text', label: 'Single char' },
          ],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.filter(e => e.message.includes('Field ID'))).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════
// REDOS PATTERNS
// ═══════════════════════════════════════════════════════════════

describe('validateFormSchema - regex patterns', () => {
  it('rejects fields with ReDoS-vulnerable patterns', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{
            id: 'val', type: 'text', label: 'Val',
            validation: { pattern: '(a+)+' },
          }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('ReDoS'))).toBe(true)
  })

  it('rejects fields with patterns too long (> 200 chars)', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{
            id: 'val', type: 'text', label: 'Val',
            validation: { pattern: 'a'.repeat(201) },
          }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Pattern too long'))).toBe(true)
  })

  it('accepts fields with safe patterns', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{
            id: 'code', type: 'text', label: 'Code',
            validation: { pattern: '^[A-Z]{3}\\d{4}$' },
          }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.filter(e => e.message.includes('Pattern') || e.message.includes('ReDoS'))).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════
// MISSING OPTIONS
// ═══════════════════════════════════════════════════════════════

describe('validateFormSchema - option fields', () => {
  it('rejects radio without options or optionListSlug', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{ id: 'choice', type: 'radio', label: 'Choice' }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('options'))).toBe(true)
  })

  it('rejects dropdown without options or optionListSlug', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{ id: 'drop', type: 'dropdown', label: 'Drop' }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('options'))).toBe(true)
  })

  it('rejects checkbox without options or optionListSlug', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{ id: 'checks', type: 'checkbox', label: 'Checks' }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('options'))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// EXPRESSION VALIDATION
// ═══════════════════════════════════════════════════════════════

describe('validateFormSchema - expression validation', () => {
  it('validates calculated field expressions', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{
            id: 'calc', type: 'calculated', label: 'Calc',
            expression: '{a} +++ {b}', // invalid expression
          }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Calculated expression'))).toBe(true)
  })

  it('validates field visibility expressions', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{
            id: 'val', type: 'text', label: 'Val',
            visibility: '((( bad syntax',
          }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Visibility expression'))).toBe(true)
  })

  it('validates required expression (when string)', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{
            id: 'val', type: 'text', label: 'Val',
            required: '((( bad syntax',
          }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Required expression'))).toBe(true)
  })

  it('validates page visibility expressions', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        visibility: '((( bad',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [{ id: 'a', type: 'text', label: 'A' }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Page visibility'))).toBe(true)
  })

  it('validates section visibility expressions', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          visibility: '((( bad',
          fields: [{ id: 'a', type: 'text', label: 'A' }],
        }],
      }],
    }
    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Section visibility'))).toBe(true)
  })
})
