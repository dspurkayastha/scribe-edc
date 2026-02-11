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

describe('parseFormSchema', () => {
  it('parses a valid schema and preserves page count', () => {
    const result = parseFormSchema(validSchema)
    expect(result.pages).toHaveLength(2)
    expect(result.pages[0].sections).toHaveLength(2)
  })

  it('normalizes field defaults (required=false, disabled=false)', () => {
    const result = parseFormSchema(validSchema)
    const field = result.pages[0].sections[0].fields[0]
    expect(field.required).toBe(false)
    expect(field.disabled).toBe(false)
  })

  it('preserves explicit field values', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{
          id: 's1',
          title: 'S',
          fields: [
            { id: 'name', type: 'text', label: 'Name', required: true, disabled: true },
          ],
        }],
      }],
    }
    const result = parseFormSchema(schema)
    expect(result.pages[0].sections[0].fields[0].required).toBe(true)
    expect(result.pages[0].sections[0].fields[0].disabled).toBe(true)
  })

  it('normalizes repeatable section defaults (minRepeat=1, maxRepeat=10)', () => {
    const result = parseFormSchema(validSchema)
    const section = result.pages[0].sections[1]
    expect(section.repeatable).toBe(true)
    expect(section.minRepeat).toBe(1)
    expect(section.maxRepeat).toBe(10)
  })

  it('normalizes non-repeatable section (repeatable=false, no min/max)', () => {
    const result = parseFormSchema(validSchema)
    const section = result.pages[0].sections[0]
    expect(section.repeatable).toBe(false)
    expect(section.minRepeat).toBeUndefined()
    expect(section.maxRepeat).toBeUndefined()
  })

  it('throws for null input', () => {
    expect(() => parseFormSchema(null)).toThrow('Invalid form schema')
  })

  it('throws for undefined input', () => {
    expect(() => parseFormSchema(undefined)).toThrow('Invalid form schema')
  })

  it('throws for empty object', () => {
    expect(() => parseFormSchema({})).toThrow('Invalid form schema')
  })

  it('throws for non-array pages', () => {
    expect(() => parseFormSchema({ pages: 'not-array' })).toThrow('Invalid form schema')
  })

  it('throws for number input', () => {
    expect(() => parseFormSchema(42)).toThrow('Invalid form schema')
  })

  it('handles pages with missing sections (defaults to empty)', () => {
    const schema = { pages: [{ id: 'p1', title: 'P' }] }
    const result = parseFormSchema(schema)
    expect(result.pages[0].sections).toEqual([])
  })

  it('handles sections with missing fields (defaults to empty)', () => {
    const schema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{ id: 's1', title: 'S' }],
      }],
    }
    const result = parseFormSchema(schema)
    expect(result.pages[0].sections[0].fields).toEqual([])
  })

  it('preserves extra page properties', () => {
    const schema = {
      pages: [{
        id: 'p1',
        title: 'Page Title',
        description: 'Page desc',
        sections: [],
      }],
    }
    const result = parseFormSchema(schema)
    expect(result.pages[0].title).toBe('Page Title')
    expect(result.pages[0].description).toBe('Page desc')
  })
})

describe('getAllFields', () => {
  it('returns all fields across all pages and sections', () => {
    const fields = getAllFields(validSchema)
    expect(fields).toHaveLength(4)
    expect(fields.map((f) => f.id)).toEqual(['name', 'age', 'med', 'notes'])
  })

  it('returns empty for schema with no fields', () => {
    const schema: FormSchema = {
      pages: [{
        id: 'p1',
        title: 'P',
        sections: [{ id: 's1', title: 'S', fields: [] }],
      }],
    }
    expect(getAllFields(schema)).toEqual([])
  })

  it('returns fields from multiple pages', () => {
    const schema: FormSchema = {
      pages: [
        { id: 'p1', title: 'P1', sections: [{ id: 's1', title: 'S1', fields: [{ id: 'a', type: 'text', label: 'A' }] }] },
        { id: 'p2', title: 'P2', sections: [{ id: 's2', title: 'S2', fields: [{ id: 'b', type: 'text', label: 'B' }] }] },
      ],
    }
    const fields = getAllFields(schema)
    expect(fields).toHaveLength(2)
    expect(fields.map(f => f.id)).toEqual(['a', 'b'])
  })
})

describe('getFieldById', () => {
  it('finds a field by ID', () => {
    const field = getFieldById(validSchema, 'age')
    expect(field).toBeDefined()
    expect(field!.label).toBe('Age')
    expect(field!.type).toBe('integer')
  })

  it('finds a field in a later page', () => {
    const field = getFieldById(validSchema, 'notes')
    expect(field).toBeDefined()
    expect(field!.type).toBe('textarea')
  })

  it('finds a field in a repeatable section', () => {
    const field = getFieldById(validSchema, 'med')
    expect(field).toBeDefined()
    expect(field!.type).toBe('text')
  })

  it('returns undefined for non-existent field', () => {
    expect(getFieldById(validSchema, 'nonexistent')).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(getFieldById(validSchema, '')).toBeUndefined()
  })
})
