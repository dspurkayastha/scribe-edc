// ══════════════════════════════════════════════════════════════
// FORM SCHEMA TYPE DEFINITIONS
// Defines the JSON structure stored in form_definitions.schema
// ══════════════════════════════════════════════════════════════

export interface FormSchema {
  pages: Page[]
}

export interface Page {
  id: string
  title: string
  description?: string
  visibility?: string // filtrex expression — hide entire page conditionally
  sections: Section[]
}

export interface Section {
  id: string
  title: string
  description?: string
  visibility?: string // filtrex expression — hide entire section
  repeatable?: boolean
  minRepeat?: number // default 1
  maxRepeat?: number // default 10; null = unlimited
  repeatLabel?: string // "Medication #{n}"
  fields: Field[]
}

export interface Field {
  id: string // MUST match ^[a-z][a-z0-9_]*$
  type: FieldType
  label: string
  description?: string
  placeholder?: string
  required?: boolean | string // boolean or filtrex expression
  disabled?: boolean | string
  visibility?: string // filtrex expression
  defaultValue?: unknown

  // Type-specific
  validation?: ValidationRules
  options?: Option[] // inline options for radio/checkbox/dropdown
  optionListSlug?: string // reference to option_lists table
  expression?: string // for calculated fields
  dependsOn?: string[] // field IDs this depends on (same form)
  crossFormRef?: string // "{form_slug.field_id}" for cross-form reads
  min?: number // slider, likert
  max?: number
  step?: number
  accept?: string // file upload MIME types
  maxFileSize?: number // bytes
  rows?: number // textarea
  matrixRows?: Option[] // matrix row items
  columns?: MatrixColumn[] // matrix type
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'integer'
  | 'date'
  | 'datetime'
  | 'time'
  | 'radio'
  | 'checkbox'
  | 'dropdown'
  | 'lookup'
  | 'slider'
  | 'likert'
  | 'matrix'
  | 'calculated'
  | 'file'
  | 'signature'
  | 'descriptive'

export interface Option {
  value: string
  label: string
}

export interface ValidationRules {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string // regex (max 200 chars, tested for ReDoS)
  patternMessage?: string
  custom?: string // filtrex expression returning boolean
  customMessage?: string
}

export interface MatrixColumn {
  id: string
  label: string
  type: 'radio' | 'checkbox' | 'number' | 'text'
  options?: Option[]
}

export interface Rule {
  id: string
  trigger: string // filtrex expression
  action: RuleAction
  target: string // field ID, section ID, or page ID
  value?: string // expression (for calculate)
  message?: string // for validate/warn/query
}

export type RuleAction =
  | 'show'
  | 'hide'
  | 'require'
  | 'unrequire'
  | 'enable'
  | 'disable'
  | 'calculate'
  | 'validate'
  | 'warn'
  | 'auto_query'

export interface ValidationError {
  field: string
  message: string
}
