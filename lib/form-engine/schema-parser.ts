import type { FormSchema, Page, Section, Field } from '@/types/form-schema'

/**
 * Parse and normalize a form schema from the database.
 * Applies defaults for optional fields.
 */
export function parseFormSchema(raw: unknown): FormSchema {
  const schema = raw as FormSchema

  if (!schema?.pages || !Array.isArray(schema.pages)) {
    throw new Error('Invalid form schema: missing pages array')
  }

  return {
    pages: schema.pages.map(normalizePage),
  }
}

function normalizePage(page: Page): Page {
  return {
    ...page,
    sections: (page.sections ?? []).map(normalizeSection),
  }
}

function normalizeSection(section: Section): Section {
  return {
    ...section,
    repeatable: section.repeatable ?? false,
    minRepeat: section.minRepeat ?? (section.repeatable ? 1 : undefined),
    maxRepeat: section.maxRepeat ?? (section.repeatable ? 10 : undefined),
    fields: (section.fields ?? []).map(normalizeField),
  }
}

function normalizeField(field: Field): Field {
  return {
    ...field,
    required: field.required ?? false,
    disabled: field.disabled ?? false,
  }
}

/**
 * Get all fields from a schema in a flat list.
 */
export function getAllFields(schema: FormSchema): Field[] {
  const fields: Field[] = []
  for (const page of schema.pages) {
    for (const section of page.sections) {
      fields.push(...section.fields)
    }
  }
  return fields
}

/**
 * Get a field by ID from the schema.
 */
export function getFieldById(schema: FormSchema, fieldId: string): Field | undefined {
  for (const page of schema.pages) {
    for (const section of page.sections) {
      const field = section.fields.find((f) => f.id === fieldId)
      if (field) return field
    }
  }
  return undefined
}
