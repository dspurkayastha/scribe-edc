import { describe, it, expect } from 'vitest'
import { validateFormSchema } from '@/lib/form-engine/schema-validator'
import type { FormSchema } from '@/types/form-schema'

describe('Schema Validator', () => {
  it('accepts a valid schema', () => {
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

  it('rejects empty schema', () => {
    const schema = { pages: [] } as FormSchema
    const errors = validateFormSchema(schema)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects invalid field IDs', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'Invalid-ID', type: 'text', label: 'Bad ID' },
          ],
        }],
      }],
    }

    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('Field ID'))).toBe(true)
  })

  it('rejects duplicate field IDs', () => {
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
    expect(errors.some((e) => e.message.includes('Duplicate'))).toBe(true)
  })

  it('rejects radio without options', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'Page 1',
        sections: [{
          id: 's1',
          title: 'Section 1',
          fields: [
            { id: 'choice', type: 'radio', label: 'Choice' },
          ],
        }],
      }],
    }

    const errors = validateFormSchema(schema)
    expect(errors.some((e) => e.message.includes('options'))).toBe(true)
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
})
