import { describe, it, expect } from 'vitest'
import { parseRedcapDataDictionary } from '@/lib/form-engine/redcap-importer'

const HEADER = 'Variable / Field Name,Form Name,Section Header,Field Type,Field Label,"Choices, Calculations, OR Slider Labels",Field Note,Text Validation Type OR Show Slider Number,Text Validation Min,Text Validation Max,Identifier?,Branching Logic (Show field only if...),Required Field?,Custom Alignment,Question Number,Matrix Group Name,Matrix Ranking?,Field Annotation'

function makeCSV(rows: string[]): string {
  return [HEADER, ...rows].join('\n')
}

function makeRow(overrides: Record<string, string>): string {
  const defaults: Record<string, string> = {
    'Variable / Field Name': 'test_field',
    'Form Name': 'test_form',
    'Section Header': '',
    'Field Type': 'text',
    'Field Label': 'Test Field',
    'Choices, Calculations, OR Slider Labels': '',
    'Field Note': '',
    'Text Validation Type OR Show Slider Number': '',
    'Text Validation Min': '',
    'Text Validation Max': '',
    'Identifier?': '',
    'Branching Logic (Show field only if...)': '',
    'Required Field?': '',
    'Custom Alignment': '',
    'Question Number': '',
    'Matrix Group Name': '',
    'Matrix Ranking?': '',
    'Field Annotation': '',
  }
  const merged = { ...defaults, ...overrides }
  return Object.values(merged).map(v => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v).join(',')
}

// ═══════════════════════════════════════════════════════════════
// Basic parsing
// ═══════════════════════════════════════════════════════════════

describe('parseRedcapDataDictionary', () => {
  it('returns empty result for empty CSV', () => {
    const result = parseRedcapDataDictionary('')
    expect(result.forms).toHaveLength(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('parses a single text field', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'first_name',
      'Form Name': 'demographics',
      'Field Type': 'text',
      'Field Label': 'First Name',
      'Required Field?': 'y',
    })])
    const result = parseRedcapDataDictionary(csv)
    expect(result.forms).toHaveLength(1)
    expect(result.forms[0].slug).toBe('demographics')
    expect(result.forms[0].title).toBe('Demographics')

    const fields = result.forms[0].schema.pages[0].sections[0].fields
    expect(fields).toHaveLength(1)
    expect(fields[0].id).toBe('first_name')
    expect(fields[0].type).toBe('text')
    expect(fields[0].label).toBe('First Name')
    expect(fields[0].required).toBe(true)
  })

  // ─── Field Type Mapping ───

  it('maps radio field with choices', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'sex',
      'Field Type': 'radio',
      'Field Label': 'Sex',
      'Choices, Calculations, OR Slider Labels': '1, Male | 2, Female | 3, Other',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('radio')
    expect(field.options).toHaveLength(3)
    expect(field.options![0]).toEqual({ value: '1', label: 'Male' })
    expect(field.options![1]).toEqual({ value: '2', label: 'Female' })
  })

  it('maps dropdown field', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'country',
      'Field Type': 'dropdown',
      'Choices, Calculations, OR Slider Labels': 'us, United States | uk, United Kingdom',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('dropdown')
    expect(field.options).toHaveLength(2)
  })

  it('maps checkbox field', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'symptoms',
      'Field Type': 'checkbox',
      'Choices, Calculations, OR Slider Labels': '1, Headache | 2, Nausea | 3, Fatigue',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('checkbox')
    expect(field.options).toHaveLength(3)
  })

  it('maps yesno field to radio with Yes/No options', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'consent',
      'Field Type': 'yesno',
      'Field Label': 'Consent given?',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('radio')
    expect(field.options).toEqual([
      { value: '1', label: 'Yes' },
      { value: '0', label: 'No' },
    ])
  })

  it('maps truefalse field to radio with True/False options', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'is_valid',
      'Field Type': 'truefalse',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('radio')
    expect(field.options).toEqual([
      { value: '1', label: 'True' },
      { value: '0', label: 'False' },
    ])
  })

  it('maps notes field to textarea', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'comments',
      'Field Type': 'notes',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('textarea')
  })

  it('maps calc field to calculated', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'bmi',
      'Field Type': 'calc',
      'Choices, Calculations, OR Slider Labels': '[weight]/([height]/100)^2',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('calculated')
    expect(field.expression).toBe('{weight}/({height}/100)^2')
  })

  it('maps slider field', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'pain_level',
      'Field Type': 'slider',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('slider')
    expect(field.min).toBe(0)
    expect(field.max).toBe(100)
  })

  it('maps file upload field', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'scan_file',
      'Field Type': 'file',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('file')
  })

  it('maps descriptive field', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'instructions',
      'Field Type': 'descriptive',
      'Field Label': 'Please read the following instructions.',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('descriptive')
  })

  // ─── Text Validation Subtypes ───

  it('maps date validation to date type', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'dob',
      'Field Type': 'text',
      'Text Validation Type OR Show Slider Number': 'date_mdy',
    })])
    const result = parseRedcapDataDictionary(csv)
    expect(result.forms[0].schema.pages[0].sections[0].fields[0].type).toBe('date')
  })

  it('maps datetime validation to datetime type', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'visit_time',
      'Field Type': 'text',
      'Text Validation Type OR Show Slider Number': 'datetime_mdy',
    })])
    const result = parseRedcapDataDictionary(csv)
    expect(result.forms[0].schema.pages[0].sections[0].fields[0].type).toBe('datetime')
  })

  it('maps time validation to time type', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'dose_time',
      'Field Type': 'text',
      'Text Validation Type OR Show Slider Number': 'time',
    })])
    const result = parseRedcapDataDictionary(csv)
    expect(result.forms[0].schema.pages[0].sections[0].fields[0].type).toBe('time')
  })

  it('maps number validation to number type', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'weight',
      'Field Type': 'text',
      'Text Validation Type OR Show Slider Number': 'number',
      'Text Validation Min': '20',
      'Text Validation Max': '300',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('number')
    expect(field.validation?.min).toBe(20)
    expect(field.validation?.max).toBe(300)
  })

  it('maps integer validation to integer type', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'age',
      'Field Type': 'text',
      'Text Validation Type OR Show Slider Number': 'integer',
    })])
    const result = parseRedcapDataDictionary(csv)
    expect(result.forms[0].schema.pages[0].sections[0].fields[0].type).toBe('integer')
  })

  it('maps email validation to text with pattern', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'email',
      'Field Type': 'text',
      'Text Validation Type OR Show Slider Number': 'email',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.type).toBe('text')
    expect(field.validation?.pattern).toBeDefined()
  })

  // ─── Branching Logic ───

  it('converts branching logic to visibility', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'pregnancy_test',
      'Branching Logic (Show field only if...)': "[sex] = '2'",
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.visibility).toBe('{sex} == "2"')
  })

  // ─── Section Headers ───

  it('groups fields by section header', () => {
    const csv = makeCSV([
      makeRow({ 'Variable / Field Name': 'name', 'Section Header': 'Basic Info' }),
      makeRow({ 'Variable / Field Name': 'dob', 'Section Header': 'Basic Info' }),
      makeRow({ 'Variable / Field Name': 'weight', 'Section Header': 'Vitals' }),
      makeRow({ 'Variable / Field Name': 'height', 'Section Header': 'Vitals' }),
    ])
    const result = parseRedcapDataDictionary(csv)
    const sections = result.forms[0].schema.pages[0].sections
    expect(sections).toHaveLength(2)
    expect(sections[0].title).toBe('Basic Info')
    expect(sections[0].fields).toHaveLength(2)
    expect(sections[1].title).toBe('Vitals')
    expect(sections[1].fields).toHaveLength(2)
  })

  // ─── Multi-form Data Dictionary ───

  it('splits multi-form data dictionary into separate forms', () => {
    const csv = makeCSV([
      makeRow({ 'Variable / Field Name': 'name', 'Form Name': 'demographics' }),
      makeRow({ 'Variable / Field Name': 'dob', 'Form Name': 'demographics' }),
      makeRow({ 'Variable / Field Name': 'weight', 'Form Name': 'vitals' }),
      makeRow({ 'Variable / Field Name': 'height', 'Form Name': 'vitals' }),
      makeRow({ 'Variable / Field Name': 'ae_desc', 'Form Name': 'adverse_events' }),
    ])
    const result = parseRedcapDataDictionary(csv)
    expect(result.forms).toHaveLength(3)
    expect(result.forms[0].slug).toBe('demographics')
    expect(result.forms[1].slug).toBe('vitals')
    expect(result.forms[2].slug).toBe('adverse-events')
  })

  // ─── Field Note ───

  it('maps field note to description', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'weight',
      'Field Note': 'Record in kilograms',
    })])
    const result = parseRedcapDataDictionary(csv)
    expect(result.forms[0].schema.pages[0].sections[0].fields[0].description).toBe('Record in kilograms')
  })

  // ─── Edge cases ───

  it('handles quoted fields in CSV', () => {
    const csv = `${HEADER}\ntest_field,test_form,,text,"Label with, comma","1, Option A | 2, Option B",,,,,,,,,,,,`
    const result = parseRedcapDataDictionary(csv)
    expect(result.forms).toHaveLength(1)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.label).toBe('Label with, comma')
  })

  it('sanitizes invalid field IDs', () => {
    const csv = makeCSV([makeRow({
      'Variable / Field Name': 'my-field-name',
    })])
    const result = parseRedcapDataDictionary(csv)
    const field = result.forms[0].schema.pages[0].sections[0].fields[0]
    expect(field.id).toBe('my_field_name')
  })
})
