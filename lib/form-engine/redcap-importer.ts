/**
 * REDCap Data Dictionary CSV → SCRIBE FormSchema converter.
 *
 * REDCap CSV columns (18):
 * Variable / Field Name, Form Name, Section Header, Field Type,
 * Field Label, Choices (Calculations OR Slider Labels),
 * Field Note, Text Validation Type OR Show Slider Number,
 * Text Validation Min, Text Validation Max, Identifier?,
 * Branching Logic (Show field only if...), Required Field?,
 * Custom Alignment, Question Number, Matrix Group Name,
 * Matrix Ranking?, Field Annotation
 */

import type { FormSchema, Page, Section, Field, FieldType, Option } from '@/types/form-schema'
import { convertRedcapBranching } from './redcap-branching-converter'

export interface ImportResult {
  forms: { slug: string; title: string; schema: FormSchema }[]
  warnings: string[]
}

interface RedcapRow {
  'Variable / Field Name': string
  'Form Name': string
  'Section Header': string
  'Field Type': string
  'Field Label': string
  'Choices, Calculations, OR Slider Labels': string
  'Field Note': string
  'Text Validation Type OR Show Slider Number': string
  'Text Validation Min': string
  'Text Validation Max': string
  'Identifier?': string
  'Branching Logic (Show field only if...)': string
  'Required Field?': string
  'Custom Alignment': string
  'Question Number': string
  'Matrix Group Name': string
  'Matrix Ranking?': string
  'Field Annotation': string
}

// ─── CSV Parser ───

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header.trim()] = (values[idx] ?? '').trim()
    })
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }
  values.push(current)
  return values
}

// ─── Type Mapping ───

function mapFieldType(
  rcType: string,
  validationType: string
): FieldType {
  switch (rcType) {
    case 'text':
      return mapTextValidationType(validationType)
    case 'notes':
      return 'textarea'
    case 'radio':
      return 'radio'
    case 'dropdown':
      return 'dropdown'
    case 'checkbox':
      return 'checkbox'
    case 'calc':
      return 'calculated'
    case 'slider':
      return 'slider'
    case 'yesno':
      return 'radio'
    case 'truefalse':
      return 'radio'
    case 'file':
      return 'file'
    case 'descriptive':
      return 'descriptive'
    default:
      return 'text'
  }
}

function mapTextValidationType(validationType: string): FieldType {
  if (!validationType) return 'text'

  if (validationType.startsWith('date_')) return 'date'
  if (validationType.startsWith('datetime_')) return 'datetime'
  if (validationType === 'time' || validationType === 'time_mm_ss') return 'time'
  if (validationType === 'number') return 'number'
  if (validationType === 'integer') return 'integer'
  if (validationType === 'email') return 'text'
  if (validationType === 'phone') return 'text'

  return 'text'
}

// ─── Options Parsing ───

function parseChoices(choicesStr: string): Option[] {
  if (!choicesStr) return []

  return choicesStr.split('|').map((choice) => {
    const trimmed = choice.trim()
    const commaIndex = trimmed.indexOf(',')
    if (commaIndex === -1) {
      return { value: trimmed, label: trimmed }
    }
    return {
      value: trimmed.slice(0, commaIndex).trim(),
      label: trimmed.slice(commaIndex + 1).trim(),
    }
  })
}

function getYesNoOptions(): Option[] {
  return [
    { value: '1', label: 'Yes' },
    { value: '0', label: 'No' },
  ]
}

function getTrueFalseOptions(): Option[] {
  return [
    { value: '1', label: 'True' },
    { value: '0', label: 'False' },
  ]
}

// ─── Slug helper ───

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'form'
}

function titleCase(slug: string): string {
  return slug
    .split(/[-_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// ─── Main Importer ───

export function parseRedcapDataDictionary(csvText: string): ImportResult {
  const warnings: string[] = []
  const rows = parseCSV(csvText) as unknown as RedcapRow[]

  if (rows.length === 0) {
    warnings.push('No data rows found in CSV')
    return { forms: [], warnings }
  }

  // Group rows by Form Name
  const formGroups = new Map<string, RedcapRow[]>()
  for (const row of rows) {
    const formName = row['Form Name'] || 'unnamed_form'
    if (!formGroups.has(formName)) {
      formGroups.set(formName, [])
    }
    formGroups.get(formName)!.push(row)
  }

  const forms: ImportResult['forms'] = []

  for (const [formName, formRows] of formGroups) {
    const slug = slugify(formName)
    const title = titleCase(formName)

    // Group by Section Header within each form
    const sections: Section[] = []
    let currentSectionTitle = 'Default Section'
    let currentFields: Field[] = []
    let sectionCounter = 0

    for (const row of formRows) {
      // Check for section header
      if (row['Section Header'] && row['Section Header'] !== currentSectionTitle) {
        // Save previous section if it has fields
        if (currentFields.length > 0) {
          sectionCounter++
          sections.push({
            id: `section_${sectionCounter}`,
            title: currentSectionTitle,
            fields: currentFields,
          })
          currentFields = []
        }
        currentSectionTitle = row['Section Header']
      }

      // Convert the field
      const fieldId = row['Variable / Field Name']
      if (!fieldId) {
        warnings.push(`Row skipped: no Variable / Field Name`)
        continue
      }

      // Sanitize field ID to match SCRIBE pattern
      const sanitizedId = fieldId.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+/, '').replace(/_+$/, '')
      if (!sanitizedId) {
        warnings.push(`Field "${fieldId}" has invalid ID after sanitization, skipped`)
        continue
      }

      const rcType = row['Field Type']
      const validationType = row['Text Validation Type OR Show Slider Number']
      const fieldType = mapFieldType(rcType, validationType)

      const field: Field = {
        id: sanitizedId,
        type: fieldType,
        label: row['Field Label'] || fieldId,
      }

      // Description from Field Note
      if (row['Field Note']) {
        field.description = row['Field Note']
      }

      // Required
      if (row['Required Field?'] === 'y') {
        field.required = true
      }

      // Branching logic → visibility
      if (row['Branching Logic (Show field only if...)']) {
        try {
          const converted = convertRedcapBranching(row['Branching Logic (Show field only if...)'])
          if (converted) {
            field.visibility = converted
          }
        } catch {
          warnings.push(`Field "${fieldId}": could not convert branching logic`)
        }
      }

      // Options
      if (['radio', 'dropdown', 'checkbox'].includes(fieldType)) {
        if (rcType === 'yesno') {
          field.options = getYesNoOptions()
        } else if (rcType === 'truefalse') {
          field.options = getTrueFalseOptions()
        } else {
          const opts = parseChoices(row['Choices, Calculations, OR Slider Labels'])
          if (opts.length > 0) {
            field.options = opts
          } else {
            warnings.push(`Field "${fieldId}" (${fieldType}): no choices found`)
          }
        }
      }

      // Calculated expression
      if (fieldType === 'calculated') {
        const calcExpr = row['Choices, Calculations, OR Slider Labels']
        if (calcExpr) {
          field.expression = convertRedcapBranching(calcExpr)
        }
      }

      // Slider settings
      if (fieldType === 'slider') {
        field.min = 0
        field.max = 100
        field.step = 1
        // Slider labels in REDCap are stored in Choices column
        // Format: "low label | mid label | high label"
      }

      // Validation min/max
      if (row['Text Validation Min'] || row['Text Validation Max']) {
        field.validation = {}
        if (row['Text Validation Min']) {
          const minVal = parseFloat(row['Text Validation Min'])
          if (!isNaN(minVal)) field.validation.min = minVal
        }
        if (row['Text Validation Max']) {
          const maxVal = parseFloat(row['Text Validation Max'])
          if (!isNaN(maxVal)) field.validation.max = maxVal
        }
      }

      // Email pattern
      if (validationType === 'email') {
        field.validation = { ...field.validation, pattern: '^[^@]+@[^@]+\\.[^@]+$', patternMessage: 'Invalid email' }
      }

      currentFields.push(field)
    }

    // Push last section
    if (currentFields.length > 0) {
      sectionCounter++
      sections.push({
        id: `section_${sectionCounter}`,
        title: currentSectionTitle,
        fields: currentFields,
      })
    }

    if (sections.length === 0) {
      warnings.push(`Form "${formName}": no fields found, skipped`)
      continue
    }

    const schema: FormSchema = {
      pages: [{
        id: 'page1',
        title: title,
        sections,
      }],
    }

    forms.push({ slug, title, schema })
  }

  return { forms, warnings }
}
