import { describe, it, expect } from 'vitest'
import { parseFormSchema, getAllFields, getFieldById } from '@/lib/form-engine/schema-parser'
import type { FormSchema } from '@/types/form-schema'

const validSchema: FormSchema = {
  pages: [{
    id: 'p1',
    title: 'Page 1',
    sections: [{
      id: 's1',
      title: 'Section 1',
      fields: [
        { id: 'name', type: 'text', label: 'Name' },
        { id: 'age', type: 'integer', label: 'Age' },
      ],
    }, {
      id: 's2',
      title: 'Repeating',
      repeatable: true,
      fields: [
        { id: 'med', type: 'text', label: 'Medication' },
      ],
    }],
  }, {
    id: 'p2',
    title: 'Page 2',
    sections: [{
      id: 's3',
      title: 'Section 3',
      fields: [
        { id: 'notes', type: 'textarea', label: 'Notes' },
      ],
    }],
  }],
}

describe('Schema Parser', () => {
  describe('parseFormSchema', () => {
    it('parses a valid schema', () => {
      const result = parseFormSchema(validSchema)
      expect(result.pages).toHaveLength(2)
      expect(result.pages[0].sections).toHaveLength(2)
    })

    it('normalizes field defaults', () => {
      const result = parseFormSchema(validSchema)
      const field = result.pages[0].sections[0].fields[0]
      expect(field.required).toBe(false)
      expect(field.disabled).toBe(false)
    })

    it('normalizes repeatable section defaults', () => {
      const result = parseFormSchema(validSchema)
      const section = result.pages[0].sections[1]
      expect(section.repeatable).toBe(true)
      expect(section.minRepeat).toBe(1)
      expect(section.maxRepeat).toBe(10)
    })

    it('non-repeatable sections have no minRepeat/maxRepeat', () => {
      const result = parseFormSchema(validSchema)
      const section = result.pages[0].sections[0]
      expect(section.repeatable).toBe(false)
      expect(section.minRepeat).toBeUndefined()
      expect(section.maxRepeat).toBeUndefined()
    })

    it('throws for invalid schema', () => {
      expect(() => parseFormSchema(null)).toThrow('Invalid form schema')
      expect(() => parseFormSchema({})).toThrow('Invalid form schema')
      expect(() => parseFormSchema({ pages: 'not-array' })).toThrow('Invalid form schema')
    })
  })

  describe('getAllFields', () => {
    it('returns all fields across pages and sections', () => {
      const fields = getAllFields(validSchema)
      expect(fields).toHaveLength(4)
      expect(fields.map((f) => f.id)).toEqual(['name', 'age', 'med', 'notes'])
    })
  })

  describe('getFieldById', () => {
    it('finds a field by ID', () => {
      const field = getFieldById(validSchema, 'age')
      expect(field).toBeDefined()
      expect(field!.label).toBe('Age')
      expect(field!.type).toBe('integer')
    })

    it('returns undefined for missing field', () => {
      expect(getFieldById(validSchema, 'nonexistent')).toBeUndefined()
    })
  })
})
