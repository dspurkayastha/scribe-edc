/**
 * SCRIBE FormSchema → REDCap Data Dictionary CSV exporter.
 *
 * Generates the 18-column CSV format that REDCap expects for data dictionary import.
 * Performs best-effort reverse conversion of filtrex expressions to REDCap branching logic.
 */

import type { FormSchema, Field, FieldType, Option } from '@/types/form-schema'

interface ExportForm {
  slug: string
  title: string
  schema: FormSchema
}

const CSV_HEADERS = [
  'Variable / Field Name',
  'Form Name',
  'Section Header',
  'Field Type',
  'Field Label',
  'Choices, Calculations, OR Slider Labels',
  'Field Note',
  'Text Validation Type OR Show Slider Number',
  'Text Validation Min',
  'Text Validation Max',
  'Identifier?',
  'Branching Logic (Show field only if...)',
  'Required Field?',
  'Custom Alignment',
  'Question Number',
  'Matrix Group Name',
  'Matrix Ranking?',
  'Field Annotation',
]

// ─── Type Mapping ───

function mapToRedcapType(field: Field): { fieldType: string; validationType: string } {
  switch (field.type) {
    case 'text':
      return { fieldType: 'text', validationType: '' }
    case 'textarea':
      return { fieldType: 'notes', validationType: '' }
    case 'number':
      return { fieldType: 'text', validationType: 'number' }
    case 'integer':
      return { fieldType: 'text', validationType: 'integer' }
    case 'date':
      return { fieldType: 'text', validationType: 'date_mdy' }
    case 'datetime':
      return { fieldType: 'text', validationType: 'datetime_mdy' }
    case 'time':
      return { fieldType: 'text', validationType: 'time' }
    case 'radio':
      return { fieldType: 'radio', validationType: '' }
    case 'checkbox':
      return { fieldType: 'checkbox', validationType: '' }
    case 'dropdown':
    case 'lookup':
      return { fieldType: 'dropdown', validationType: '' }
    case 'slider':
    case 'likert':
      return { fieldType: 'slider', validationType: '' }
    case 'calculated':
      return { fieldType: 'calc', validationType: '' }
    case 'file':
      return { fieldType: 'file', validationType: '' }
    case 'signature':
      return { fieldType: 'file', validationType: '' }
    case 'descriptive':
      return { fieldType: 'descriptive', validationType: '' }
    case 'matrix':
      return { fieldType: 'radio', validationType: '' }
    default:
      return { fieldType: 'text', validationType: '' }
  }
}

// ─── Choices Formatting ───

function formatChoices(field: Field): string {
  if (field.type === 'calculated' && field.expression) {
    return convertFiltrexToRedcap(field.expression)
  }

  if (!field.options || field.options.length === 0) return ''

  return field.options
    .map((opt) => `${opt.value}, ${opt.label}`)
    .join(' | ')
}

// ─── Branching Logic Reverse Conversion ───

function convertFiltrexToRedcap(expr: string): string {
  if (!expr) return ''

  let result = expr

  // Convert {field} → [field]
  result = result.replace(/\{(\w+)\}/g, '[$1]')

  // Convert "value" in {field} → [field(value)]='1' (already has [field] from above)
  result = result.replace(/"(\w+)" in \[(\w+)\]/g, "[$2($1)]='1'")

  // Convert == → =
  result = result.replace(/==/g, '=')

  // Convert != → <>
  result = result.replace(/!=/g, '<>')

  // Convert double quotes back to single quotes
  result = result.replace(/"([^"]*)"/g, "'$1'")

  // Convert and/or/not to uppercase
  result = result.replace(/\band\b/g, 'AND')
  result = result.replace(/\bor\b/g, 'OR')
  result = result.replace(/\bnot\b/g, 'NOT')

  return result
}

// ─── CSV Encoding ───

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ─── Main Export ───

export function exportToRedcapCsv(forms: ExportForm[]): string {
  const rows: string[][] = [CSV_HEADERS]

  for (const form of forms) {
    for (const page of form.schema.pages) {
      for (const section of page.sections) {
        let isFirstInSection = true

        for (const field of section.fields) {
          const { fieldType, validationType } = mapToRedcapType(field)

          const row: string[] = [
            field.id,                                        // Variable / Field Name
            form.slug,                                       // Form Name
            isFirstInSection ? section.title : '',           // Section Header
            fieldType,                                       // Field Type
            field.label,                                     // Field Label
            formatChoices(field),                             // Choices
            field.description ?? '',                         // Field Note
            validationType,                                  // Text Validation Type
            field.validation?.min?.toString() ?? '',          // Text Validation Min
            field.validation?.max?.toString() ?? '',          // Text Validation Max
            '',                                              // Identifier?
            field.visibility ? convertFiltrexToRedcap(field.visibility) : '', // Branching Logic
            field.required === true ? 'y' : '',              // Required Field?
            '',                                              // Custom Alignment
            '',                                              // Question Number
            '',                                              // Matrix Group Name
            '',                                              // Matrix Ranking?
            '',                                              // Field Annotation
          ]

          rows.push(row)
          isFirstInSection = false
        }
      }
    }
  }

  return rows.map((row) => row.map(escapeCSV).join(',')).join('\n')
}
