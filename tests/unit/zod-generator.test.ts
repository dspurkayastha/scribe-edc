import { describe, it, expect } from 'vitest'
import { generateZodSchema } from '@/lib/form-engine/zod-generator'
import type { FormSchema, Field } from '@/types/form-schema'
import { makeSimpleSchema, makeMultiFieldSchema } from './helpers'

/** Helper to test a single required field */
function schemaFor(field: Partial<Field> & { id: string; type: Field['type']; label: string }): FormSchema {
  return makeSimpleSchema({ required: true, ...field } as Field)
}

/** Helper to test a single optional field */
function optionalSchemaFor(field: Partial<Field> & { id: string; type: Field['type']; label: string }): FormSchema {
  return makeSimpleSchema({ required: false, ...field } as Field)
}

// ═══════════════════════════════════════════════════════════════
// TEXT FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - text field', () => {
  it('validates required text field', () => {
    const zod = generateZodSchema(schemaFor({ id: 'name', type: 'text', label: 'Name' }))
    expect(zod.safeParse({ name: 'John' }).success).toBe(true)
    expect(zod.safeParse({}).success).toBe(false)
  })

  it('allows optional text field to be missing or null', () => {
    const zod = generateZodSchema(optionalSchemaFor({ id: 'name', type: 'text', label: 'Name' }))
    expect(zod.safeParse({}).success).toBe(true)
    expect(zod.safeParse({ name: null }).success).toBe(true)
    expect(zod.safeParse({ name: undefined }).success).toBe(true)
    expect(zod.safeParse({ name: 'John' }).success).toBe(true)
  })

  it('validates minLength', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'name', type: 'text', label: 'Name',
      validation: { minLength: 3 },
    }))
    expect(zod.safeParse({ name: 'Jo' }).success).toBe(false)
    expect(zod.safeParse({ name: 'John' }).success).toBe(true)
  })

  it('validates maxLength', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'name', type: 'text', label: 'Name',
      validation: { maxLength: 5 },
    }))
    expect(zod.safeParse({ name: 'Jonathan' }).success).toBe(false)
    expect(zod.safeParse({ name: 'John' }).success).toBe(true)
  })

  it('validates pattern (regex)', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'code', type: 'text', label: 'Code',
      validation: { pattern: '^[A-Z]{3}\\d{3}$' },
    }))
    expect(zod.safeParse({ code: 'ABC123' }).success).toBe(true)
    expect(zod.safeParse({ code: 'abc123' }).success).toBe(false)
    expect(zod.safeParse({ code: 'ABCD1234' }).success).toBe(false)
  })

  it('validates pattern with custom message', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'code', type: 'text', label: 'Code',
      validation: { pattern: '^\\d+$', patternMessage: 'Must be numeric' },
    }))
    const result = zod.safeParse({ code: 'abc' })
    expect(result.success).toBe(false)
  })

  it('skips ReDoS-vulnerable patterns', () => {
    // When pattern is vulnerable, the generator skips adding regex
    const zod = generateZodSchema(schemaFor({
      id: 'val', type: 'text', label: 'Val',
      validation: { pattern: '(a+)+' },
    }))
    // With a vulnerable pattern, the regex is NOT applied, so any string passes
    expect(zod.safeParse({ val: 'anything' }).success).toBe(true)
  })

  it('rejects non-string values', () => {
    const zod = generateZodSchema(schemaFor({ id: 'name', type: 'text', label: 'Name' }))
    expect(zod.safeParse({ name: 123 }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// TEXTAREA FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - textarea field', () => {
  it('validates required textarea', () => {
    const zod = generateZodSchema(schemaFor({ id: 'notes', type: 'textarea', label: 'Notes' }))
    expect(zod.safeParse({ notes: 'Some notes here' }).success).toBe(true)
    expect(zod.safeParse({}).success).toBe(false)
  })

  it('validates minLength and maxLength', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'notes', type: 'textarea', label: 'Notes',
      validation: { minLength: 10, maxLength: 100 },
    }))
    expect(zod.safeParse({ notes: 'Short' }).success).toBe(false)
    expect(zod.safeParse({ notes: 'This is long enough' }).success).toBe(true)
    expect(zod.safeParse({ notes: 'x'.repeat(101) }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// NUMBER FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - number field', () => {
  it('validates required number', () => {
    const zod = generateZodSchema(schemaFor({ id: 'weight', type: 'number', label: 'Weight' }))
    expect(zod.safeParse({ weight: 75.5 }).success).toBe(true)
    expect(zod.safeParse({ weight: 'abc' }).success).toBe(false)
    expect(zod.safeParse({}).success).toBe(false)
  })

  it('allows decimal numbers', () => {
    const zod = generateZodSchema(schemaFor({ id: 'val', type: 'number', label: 'Val' }))
    expect(zod.safeParse({ val: 3.14 }).success).toBe(true)
  })

  it('validates min', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'bp', type: 'number', label: 'BP',
      validation: { min: 0 },
    }))
    expect(zod.safeParse({ bp: -1 }).success).toBe(false)
    expect(zod.safeParse({ bp: 0 }).success).toBe(true)
  })

  it('validates max', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'bp', type: 'number', label: 'BP',
      validation: { max: 300 },
    }))
    expect(zod.safeParse({ bp: 301 }).success).toBe(false)
    expect(zod.safeParse({ bp: 300 }).success).toBe(true)
  })

  it('validates min and max together', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'temp', type: 'number', label: 'Temperature',
      validation: { min: 35, max: 42 },
    }))
    expect(zod.safeParse({ temp: 34 }).success).toBe(false)
    expect(zod.safeParse({ temp: 37 }).success).toBe(true)
    expect(zod.safeParse({ temp: 43 }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// INTEGER FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - integer field', () => {
  it('validates required integer', () => {
    const zod = generateZodSchema(schemaFor({ id: 'age', type: 'integer', label: 'Age' }))
    expect(zod.safeParse({ age: 25 }).success).toBe(true)
    expect(zod.safeParse({}).success).toBe(false)
  })

  it('rejects decimal numbers', () => {
    const zod = generateZodSchema(schemaFor({ id: 'age', type: 'integer', label: 'Age' }))
    expect(zod.safeParse({ age: 25.5 }).success).toBe(false)
  })

  it('validates min/max', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'age', type: 'integer', label: 'Age',
      validation: { min: 0, max: 120 },
    }))
    expect(zod.safeParse({ age: -1 }).success).toBe(false)
    expect(zod.safeParse({ age: 0 }).success).toBe(true)
    expect(zod.safeParse({ age: 121 }).success).toBe(false)
    expect(zod.safeParse({ age: 120 }).success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// DATE FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - date field', () => {
  it('accepts YYYY-MM-DD format', () => {
    const zod = generateZodSchema(schemaFor({ id: 'dob', type: 'date', label: 'DOB' }))
    expect(zod.safeParse({ dob: '2000-01-15' }).success).toBe(true)
    expect(zod.safeParse({ dob: '1985-12-31' }).success).toBe(true)
  })

  it('rejects invalid date formats', () => {
    const zod = generateZodSchema(schemaFor({ id: 'dob', type: 'date', label: 'DOB' }))
    expect(zod.safeParse({ dob: 'not-a-date' }).success).toBe(false)
    expect(zod.safeParse({ dob: '15-01-2000' }).success).toBe(false)
    expect(zod.safeParse({ dob: '2000/01/15' }).success).toBe(false)
    expect(zod.safeParse({ dob: '2000-1-5' }).success).toBe(false) // needs zero-padding
  })
})

// ═══════════════════════════════════════════════════════════════
// DATETIME FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - datetime field', () => {
  it('accepts valid ISO datetime strings', () => {
    const zod = generateZodSchema(schemaFor({ id: 'ts', type: 'datetime', label: 'Timestamp' }))
    expect(zod.safeParse({ ts: '2024-01-15T10:30:00Z' }).success).toBe(true)
    expect(zod.safeParse({ ts: '2024-01-15T10:30:00.000Z' }).success).toBe(true)
  })

  it('rejects invalid datetime formats', () => {
    const zod = generateZodSchema(schemaFor({ id: 'ts', type: 'datetime', label: 'Timestamp' }))
    expect(zod.safeParse({ ts: '2024-01-15' }).success).toBe(false)
    expect(zod.safeParse({ ts: 'not-a-datetime' }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// TIME FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - time field', () => {
  it('accepts HH:MM format', () => {
    const zod = generateZodSchema(schemaFor({ id: 'time', type: 'time', label: 'Time' }))
    expect(zod.safeParse({ time: '08:30' }).success).toBe(true)
    expect(zod.safeParse({ time: '23:59' }).success).toBe(true)
  })

  it('rejects invalid time formats', () => {
    const zod = generateZodSchema(schemaFor({ id: 'time', type: 'time', label: 'Time' }))
    expect(zod.safeParse({ time: '8:30' }).success).toBe(false) // needs zero-pad
    expect(zod.safeParse({ time: '08:30:00' }).success).toBe(false) // includes seconds
    expect(zod.safeParse({ time: 'noon' }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// RADIO FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - radio field', () => {
  it('validates with enum options', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'sex', type: 'radio', label: 'Sex',
      options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' },
      ],
    }))
    expect(zod.safeParse({ sex: 'male' }).success).toBe(true)
    expect(zod.safeParse({ sex: 'female' }).success).toBe(true)
    expect(zod.safeParse({ sex: 'invalid' }).success).toBe(false)
  })

  it('falls back to string when no options', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'choice', type: 'radio', label: 'Choice',
      options: [],
    }))
    expect(zod.safeParse({ choice: 'anything' }).success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// DROPDOWN FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - dropdown field', () => {
  it('validates with enum options', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'country', type: 'dropdown', label: 'Country',
      options: [
        { value: 'us', label: 'United States' },
        { value: 'uk', label: 'United Kingdom' },
      ],
    }))
    expect(zod.safeParse({ country: 'us' }).success).toBe(true)
    expect(zod.safeParse({ country: 'fr' }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// LOOKUP FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - lookup field', () => {
  it('validates with enum options when present', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'diagnosis', type: 'lookup', label: 'Diagnosis',
      options: [
        { value: 'icd10_001', label: 'Condition A' },
        { value: 'icd10_002', label: 'Condition B' },
      ],
    }))
    expect(zod.safeParse({ diagnosis: 'icd10_001' }).success).toBe(true)
    expect(zod.safeParse({ diagnosis: 'invalid' }).success).toBe(false)
  })

  it('falls back to string when no options', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'diagnosis', type: 'lookup', label: 'Diagnosis',
    }))
    expect(zod.safeParse({ diagnosis: 'any_value' }).success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// CHECKBOX FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - checkbox field', () => {
  it('validates as array of strings', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'conditions', type: 'checkbox', label: 'Conditions',
      options: [
        { value: 'diabetes', label: 'Diabetes' },
        { value: 'hypertension', label: 'Hypertension' },
      ],
    }))
    expect(zod.safeParse({ conditions: ['diabetes'] }).success).toBe(true)
    expect(zod.safeParse({ conditions: ['diabetes', 'hypertension'] }).success).toBe(true)
    expect(zod.safeParse({ conditions: [] }).success).toBe(true)
  })

  it('rejects non-array values', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'conditions', type: 'checkbox', label: 'Conditions',
      options: [{ value: 'a', label: 'A' }],
    }))
    expect(zod.safeParse({ conditions: 'diabetes' }).success).toBe(false)
    expect(zod.safeParse({ conditions: 123 }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// SLIDER FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - slider field', () => {
  it('validates as number with min/max', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'pain', type: 'slider', label: 'Pain Level',
      validation: { min: 0, max: 10 },
    }))
    expect(zod.safeParse({ pain: 5 }).success).toBe(true)
    expect(zod.safeParse({ pain: -1 }).success).toBe(false)
    expect(zod.safeParse({ pain: 11 }).success).toBe(false)
  })

  it('rejects non-number values', () => {
    const zod = generateZodSchema(schemaFor({ id: 'pain', type: 'slider', label: 'Pain' }))
    expect(zod.safeParse({ pain: 'high' }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// LIKERT FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - likert field', () => {
  it('validates as number with min/max', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'satisfaction', type: 'likert', label: 'Satisfaction',
      validation: { min: 1, max: 5 },
    }))
    expect(zod.safeParse({ satisfaction: 3 }).success).toBe(true)
    expect(zod.safeParse({ satisfaction: 0 }).success).toBe(false)
    expect(zod.safeParse({ satisfaction: 6 }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// MATRIX FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - matrix field', () => {
  it('validates with defined rows (required)', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'assessment', type: 'matrix', label: 'Assessment',
      matrixRows: [
        { value: 'pain', label: 'Pain' },
        { value: 'fatigue', label: 'Fatigue' },
      ],
    }))
    expect(zod.safeParse({
      assessment: { pain: 'mild', fatigue: 'moderate' },
    }).success).toBe(true)
  })

  it('validates with defined rows (required, empty string rejected)', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'assessment', type: 'matrix', label: 'Assessment',
      required: true,
      matrixRows: [
        { value: 'pain', label: 'Pain' },
        { value: 'fatigue', label: 'Fatigue' },
      ],
    }))
    // Required matrix rows need min(1) string
    expect(zod.safeParse({
      assessment: { pain: '', fatigue: 'moderate' },
    }).success).toBe(false)
  })

  it('falls back to record type when no rows defined', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'assessment', type: 'matrix', label: 'Assessment',
    }))
    expect(zod.safeParse({
      assessment: { any_key: 'any_value' },
    }).success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// CALCULATED FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - calculated field', () => {
  it('accepts string values', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'bmi', type: 'calculated', label: 'BMI',
    }))
    expect(zod.safeParse({ bmi: '24.5' }).success).toBe(true)
  })

  it('accepts number values', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'bmi', type: 'calculated', label: 'BMI',
    }))
    expect(zod.safeParse({ bmi: 24.5 }).success).toBe(true)
  })

  it('rejects boolean values', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'bmi', type: 'calculated', label: 'BMI',
    }))
    expect(zod.safeParse({ bmi: true }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// FILE FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - file field', () => {
  it('validates required file object', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'consent_doc', type: 'file', label: 'Consent Document',
    }))
    expect(zod.safeParse({
      consent_doc: {
        filename: 'consent.pdf',
        path: '/uploads/consent.pdf',
        size: 12345,
      },
    }).success).toBe(true)
  })

  it('validates with optional mimeType', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'doc', type: 'file', label: 'Document',
    }))
    expect(zod.safeParse({
      doc: {
        filename: 'doc.pdf',
        path: '/uploads/doc.pdf',
        size: 1000,
        mimeType: 'application/pdf',
      },
    }).success).toBe(true)
  })

  it('rejects missing filename', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'doc', type: 'file', label: 'Document',
    }))
    expect(zod.safeParse({
      doc: { filename: '', path: '/path', size: 100 },
    }).success).toBe(false)
  })

  it('rejects non-positive file size', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'doc', type: 'file', label: 'Document',
    }))
    expect(zod.safeParse({
      doc: { filename: 'test.pdf', path: '/path', size: 0 },
    }).success).toBe(false)
    expect(zod.safeParse({
      doc: { filename: 'test.pdf', path: '/path', size: -1 },
    }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// SIGNATURE FIELD
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - signature field', () => {
  it('validates required signature object', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'sig', type: 'signature', label: 'Signature',
    }))
    expect(zod.safeParse({
      sig: {
        name: 'Dr. Smith',
        confirmed: true,
        timestamp: '2024-01-15T10:30:00Z',
      },
    }).success).toBe(true)
  })

  it('rejects name too short (< 2 chars)', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'sig', type: 'signature', label: 'Signature',
    }))
    expect(zod.safeParse({
      sig: { name: 'A', confirmed: true, timestamp: '2024-01-15T10:30:00Z' },
    }).success).toBe(false)
  })

  it('rejects confirmed: false', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'sig', type: 'signature', label: 'Signature',
    }))
    expect(zod.safeParse({
      sig: { name: 'Dr. Smith', confirmed: false, timestamp: '2024-01-15T10:30:00Z' },
    }).success).toBe(false)
  })

  it('rejects missing timestamp', () => {
    const zod = generateZodSchema(schemaFor({
      id: 'sig', type: 'signature', label: 'Signature',
    }))
    expect(zod.safeParse({
      sig: { name: 'Dr. Smith', confirmed: true, timestamp: '' },
    }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// DESCRIPTIVE FIELD (should be skipped)
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - descriptive field', () => {
  it('is completely skipped from the schema', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 's1',
          title: 'Section',
          fields: [
            { id: 'info', type: 'descriptive', label: 'This is informational text.' },
            { id: 'name', type: 'text', label: 'Name', required: true },
          ],
        }],
      }],
    }
    const zod = generateZodSchema(schema)
    // info field should not be in the schema at all
    expect(zod.safeParse({ name: 'Test' }).success).toBe(true)
    // Extra fields from descriptive should not cause issues
    expect(zod.safeParse({ name: 'Test', info: 'anything' }).success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// REPEATABLE SECTIONS
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - repeatable sections', () => {
  it('generates array schema for repeatable sections', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 'medications',
          title: 'Medications',
          repeatable: true,
          minRepeat: 0,
          maxRepeat: 10,
          fields: [
            { id: 'drug_name', type: 'text', label: 'Drug', required: true },
            { id: 'dose', type: 'text', label: 'Dose', required: true },
          ],
        }],
      }],
    }
    const zod = generateZodSchema(schema)
    expect(zod.safeParse({
      medications: [{ drug_name: 'Aspirin', dose: '100mg' }],
    }).success).toBe(true)
    expect(zod.safeParse({ medications: [] }).success).toBe(true)
  })

  it('enforces minRepeat when > 0', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 'medications',
          title: 'Medications',
          repeatable: true,
          minRepeat: 1,
          maxRepeat: 5,
          fields: [
            { id: 'drug_name', type: 'text', label: 'Drug', required: true },
          ],
        }],
      }],
    }
    const zod = generateZodSchema(schema)
    // minRepeat=1 means the array is required and must have at least 1 item
    expect(zod.safeParse({
      medications: [],
    }).success).toBe(false)
    expect(zod.safeParse({
      medications: [{ drug_name: 'Aspirin' }],
    }).success).toBe(true)
  })

  it('enforces maxRepeat', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 'items',
          title: 'Items',
          repeatable: true,
          minRepeat: 0,
          maxRepeat: 2,
          fields: [
            { id: 'name', type: 'text', label: 'Name', required: true },
          ],
        }],
      }],
    }
    const zod = generateZodSchema(schema)
    expect(zod.safeParse({
      items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    }).success).toBe(false) // exceeds maxRepeat=2
    expect(zod.safeParse({
      items: [{ name: 'A' }, { name: 'B' }],
    }).success).toBe(true)
  })

  it('makes repeatable section optional when minRepeat is 0 or not set', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 'items',
          title: 'Items',
          repeatable: true,
          minRepeat: 0,
          fields: [
            { id: 'name', type: 'text', label: 'Name', required: true },
          ],
        }],
      }],
    }
    const zod = generateZodSchema(schema)
    // Section is optional, so missing is OK
    expect(zod.safeParse({}).success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// MULTI-FIELD SCHEMA
// ═══════════════════════════════════════════════════════════════

describe('Zod Generator - multi-field schema', () => {
  it('validates all fields in a complex schema', () => {
    const schema = makeMultiFieldSchema([
      { id: 'name', type: 'text', label: 'Name', required: true },
      { id: 'age', type: 'integer', label: 'Age', required: true, validation: { min: 0, max: 120 } },
      {
        id: 'sex', type: 'radio', label: 'Sex', required: true,
        options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }],
      },
      { id: 'notes', type: 'textarea', label: 'Notes', required: false },
    ])

    const zod = generateZodSchema(schema)
    expect(zod.safeParse({
      name: 'John Doe',
      age: 30,
      sex: 'male',
    }).success).toBe(true)

    // Missing required fields
    expect(zod.safeParse({ name: 'John' }).success).toBe(false)
  })
})
