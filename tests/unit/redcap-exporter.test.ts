import { describe, it, expect } from 'vitest'
import { exportToRedcapCsv } from '@/lib/form-engine/redcap-exporter'
import { parseRedcapDataDictionary } from '@/lib/form-engine/redcap-importer'
import type { FormSchema, Field } from '@/types/form-schema'

function makeSchema(fields: Field[]): FormSchema {
  return {
    pages: [{
      id: 'p1',
      title: 'Test',
      sections: [{
        id: 's1',
        title: 'Section 1',
        fields,
      }],
    }],
  }
}

// ═══════════════════════════════════════════════════════════════
// Basic Export
// ═══════════════════════════════════════════════════════════════

describe('exportToRedcapCsv', () => {
  it('exports CSV with header row', () => {
    const csv = exportToRedcapCsv([])
    const lines = csv.split('\n')
    expect(lines[0]).toContain('Variable / Field Name')
    expect(lines[0]).toContain('Form Name')
  })

  it('exports a text field', () => {
    const csv = exportToRedcapCsv([{
      slug: 'demographics',
      title: 'Demographics',
      schema: makeSchema([
        { id: 'name', type: 'text', label: 'Full Name', required: true },
      ]),
    }])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2) // header + 1 field
    expect(lines[1]).toContain('name')
    expect(lines[1]).toContain('demographics')
    expect(lines[1]).toContain('text')
    expect(lines[1]).toContain('Full Name')
    expect(lines[1]).toContain(',y,') // required
  })

  it('exports radio field with choices', () => {
    const csv = exportToRedcapCsv([{
      slug: 'demo',
      title: 'Demo',
      schema: makeSchema([{
        id: 'sex',
        type: 'radio',
        label: 'Sex',
        options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
        ],
      }]),
    }])
    expect(csv).toContain('male, Male | female, Female')
    expect(csv).toContain('radio')
  })

  it('exports number field with validation', () => {
    const csv = exportToRedcapCsv([{
      slug: 'vitals',
      title: 'Vitals',
      schema: makeSchema([{
        id: 'weight',
        type: 'number',
        label: 'Weight',
        validation: { min: 20, max: 300 },
      }]),
    }])
    expect(csv).toContain('number') // validation type
    expect(csv).toContain('20')
    expect(csv).toContain('300')
  })

  it('exports date field', () => {
    const csv = exportToRedcapCsv([{
      slug: 'demo',
      title: 'Demo',
      schema: makeSchema([{ id: 'dob', type: 'date', label: 'Date of Birth' }]),
    }])
    expect(csv).toContain('date_mdy')
  })

  it('exports calculated field with expression', () => {
    const csv = exportToRedcapCsv([{
      slug: 'vitals',
      title: 'Vitals',
      schema: makeSchema([{
        id: 'bmi',
        type: 'calculated',
        label: 'BMI',
        expression: '{weight} / ({height}/100)^2',
      }]),
    }])
    expect(csv).toContain('calc')
    expect(csv).toContain('[weight] / ([height]/100)^2')
  })

  it('exports visibility as branching logic', () => {
    const csv = exportToRedcapCsv([{
      slug: 'demo',
      title: 'Demo',
      schema: makeSchema([{
        id: 'preg',
        type: 'radio',
        label: 'Pregnant?',
        visibility: '{sex} == "female"',
        options: [{ value: '1', label: 'Yes' }, { value: '0', label: 'No' }],
      }]),
    }])
    expect(csv).toContain("[sex] = 'female'")
  })

  it('exports section headers only on first field', () => {
    const csv = exportToRedcapCsv([{
      slug: 'demo',
      title: 'Demo',
      schema: {
        pages: [{
          id: 'p1',
          title: 'Page',
          sections: [{
            id: 's1',
            title: 'Basic Info',
            fields: [
              { id: 'f1', type: 'text', label: 'Field 1' },
              { id: 'f2', type: 'text', label: 'Field 2' },
            ],
          }],
        }],
      },
    }])
    const lines = csv.split('\n')
    // First data row should have section header, second should not
    expect(lines[1]).toContain('Basic Info')
    // Second data row should have empty section header
    const cells = lines[2].split(',')
    expect(cells[2]).toBe('') // Section Header column
  })

  it('exports multiple forms', () => {
    const csv = exportToRedcapCsv([
      { slug: 'demo', title: 'Demo', schema: makeSchema([{ id: 'f1', type: 'text', label: 'F1' }]) },
      { slug: 'vitals', title: 'Vitals', schema: makeSchema([{ id: 'f2', type: 'text', label: 'F2' }]) },
    ])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3) // header + 2 fields
    expect(lines[1]).toContain('demo')
    expect(lines[2]).toContain('vitals')
  })
})

// ═══════════════════════════════════════════════════════════════
// Round-trip Tests
// ═══════════════════════════════════════════════════════════════

describe('round-trip (import → export → import)', () => {
  it('preserves basic text field through round-trip', () => {
    const original: FormSchema = makeSchema([
      { id: 'first_name', type: 'text', label: 'First Name', required: true },
    ])

    const csv = exportToRedcapCsv([{ slug: 'demo', title: 'Demo', schema: original }])
    const reimported = parseRedcapDataDictionary(csv)

    expect(reimported.forms).toHaveLength(1)
    const field = reimported.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.id).toBe('first_name')
    expect(field.type).toBe('text')
    expect(field.label).toBe('First Name')
    expect(field.required).toBe(true)
  })

  it('preserves radio options through round-trip', () => {
    const original: FormSchema = makeSchema([{
      id: 'sex',
      type: 'radio',
      label: 'Sex',
      options: [
        { value: '1', label: 'Male' },
        { value: '2', label: 'Female' },
      ],
    }])

    const csv = exportToRedcapCsv([{ slug: 'demo', title: 'Demo', schema: original }])
    const reimported = parseRedcapDataDictionary(csv)
    const field = reimported.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('radio')
    expect(field.options).toHaveLength(2)
    expect(field.options![0]).toEqual({ value: '1', label: 'Male' })
  })

  it('preserves number validation through round-trip', () => {
    const original: FormSchema = makeSchema([{
      id: 'age',
      type: 'integer',
      label: 'Age',
      validation: { min: 0, max: 120 },
    }])

    const csv = exportToRedcapCsv([{ slug: 'demo', title: 'Demo', schema: original }])
    const reimported = parseRedcapDataDictionary(csv)
    const field = reimported.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('integer')
    expect(field.validation?.min).toBe(0)
    expect(field.validation?.max).toBe(120)
  })

  it('preserves form slug through round-trip', () => {
    const original: FormSchema = makeSchema([
      { id: 'f1', type: 'text', label: 'Field' },
    ])

    const csv = exportToRedcapCsv([{ slug: 'my-form', title: 'My Form', schema: original }])
    const reimported = parseRedcapDataDictionary(csv)
    expect(reimported.forms[0].slug).toBe('my-form')
  })
})
