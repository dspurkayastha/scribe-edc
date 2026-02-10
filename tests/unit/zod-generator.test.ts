import { describe, it, expect } from 'vitest'
import { generateZodSchema } from '@/lib/form-engine/zod-generator'
import type { FormSchema } from '@/types/form-schema'

describe('Zod Generator', () => {
  it('generates schema for text fields', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 's1',
          title: 'Section',
          fields: [
            { id: 'name', type: 'text', label: 'Name', required: true },
          ],
        }],
      }],
    }

    const zodSchema = generateZodSchema(schema)
    const result = zodSchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
  })

  it('validates required fields', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 's1',
          title: 'Section',
          fields: [
            { id: 'name', type: 'text', label: 'Name', required: true },
          ],
        }],
      }],
    }

    const zodSchema = generateZodSchema(schema)
    const result = zodSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('allows optional fields to be null', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 's1',
          title: 'Section',
          fields: [
            { id: 'notes', type: 'text', label: 'Notes', required: false },
          ],
        }],
      }],
    }

    const zodSchema = generateZodSchema(schema)
    const result = zodSchema.safeParse({ notes: null })
    expect(result.success).toBe(true)
  })

  it('validates number fields with min/max', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 's1',
          title: 'Section',
          fields: [
            { id: 'age', type: 'integer', label: 'Age', required: true, validation: { min: 0, max: 120 } },
          ],
        }],
      }],
    }

    const zodSchema = generateZodSchema(schema)
    expect(zodSchema.safeParse({ age: 25 }).success).toBe(true)
    expect(zodSchema.safeParse({ age: -1 }).success).toBe(false)
    expect(zodSchema.safeParse({ age: 130 }).success).toBe(false)
    expect(zodSchema.safeParse({ age: 25.5 }).success).toBe(false) // not integer
  })

  it('validates date fields', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 's1',
          title: 'Section',
          fields: [
            { id: 'dob', type: 'date', label: 'DOB', required: true },
          ],
        }],
      }],
    }

    const zodSchema = generateZodSchema(schema)
    expect(zodSchema.safeParse({ dob: '2000-01-15' }).success).toBe(true)
    expect(zodSchema.safeParse({ dob: 'not-a-date' }).success).toBe(false)
  })

  it('validates radio/dropdown with enum options', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 's1',
          title: 'Section',
          fields: [
            {
              id: 'sex',
              type: 'radio',
              label: 'Sex',
              required: true,
              options: [
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ],
            },
          ],
        }],
      }],
    }

    const zodSchema = generateZodSchema(schema)
    expect(zodSchema.safeParse({ sex: 'male' }).success).toBe(true)
    expect(zodSchema.safeParse({ sex: 'invalid' }).success).toBe(false)
  })

  it('validates checkbox fields as arrays', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 's1',
          title: 'Section',
          fields: [
            {
              id: 'comorbidities',
              type: 'checkbox',
              label: 'Comorbidities',
              required: true,
              options: [
                { value: 'diabetes', label: 'Diabetes' },
                { value: 'hypertension', label: 'Hypertension' },
              ],
            },
          ],
        }],
      }],
    }

    const zodSchema = generateZodSchema(schema)
    expect(zodSchema.safeParse({ comorbidities: ['diabetes'] }).success).toBe(true)
    expect(zodSchema.safeParse({ comorbidities: 'diabetes' }).success).toBe(false)
  })

  it('handles repeatable sections', () => {
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

    const zodSchema = generateZodSchema(schema)
    expect(zodSchema.safeParse({
      medications: [{ drug_name: 'Aspirin', dose: '100mg' }],
    }).success).toBe(true)
    expect(zodSchema.safeParse({ medications: [] }).success).toBe(true)
  })

  it('skips descriptive fields', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Test',
        sections: [{
          id: 's1',
          title: 'Section',
          fields: [
            { id: 'info', type: 'descriptive', label: 'This is info text' },
            { id: 'name', type: 'text', label: 'Name', required: true },
          ],
        }],
      }],
    }

    const zodSchema = generateZodSchema(schema)
    expect(zodSchema.safeParse({ name: 'Test' }).success).toBe(true)
  })
})
