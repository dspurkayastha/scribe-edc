import type { FormSchema, ValidationError } from '@/types/form-schema'
import { isReDoSVulnerable } from './regex-safety'
import { validateExpression } from './expression-safety'
import { detectExpressionCycles } from './cycle-detector'

const FIELD_ID_REGEX = /^[a-z][a-z0-9_]*$/

/**
 * Validates a form schema for structural correctness, safety, and consistency.
 * Called before saving a form definition to the database.
 */
export function validateFormSchema(schema: FormSchema): ValidationError[] {
  const errors: ValidationError[] = []

  if (!schema?.pages || !Array.isArray(schema.pages) || schema.pages.length === 0) {
    errors.push({ field: '_schema', message: 'Schema must have at least one page' })
    return errors
  }

  const allFieldIds = new Set<string>()
  const allSectionIds = new Set<string>()
  const allPageIds = new Set<string>()

  for (const page of schema.pages) {
    // Page ID uniqueness
    if (allPageIds.has(page.id)) {
      errors.push({ field: page.id, message: `Duplicate page ID: ${page.id}` })
    }
    allPageIds.add(page.id)

    // Page visibility expression
    if (page.visibility) {
      const exprErrors = validateExpression(page.visibility)
      for (const err of exprErrors) {
        errors.push({ field: page.id, message: `Page visibility: ${err}` })
      }
    }

    for (const section of page.sections) {
      // Section ID uniqueness
      if (allSectionIds.has(section.id)) {
        errors.push({ field: section.id, message: `Duplicate section ID: ${section.id}` })
      }
      allSectionIds.add(section.id)

      // Section visibility expression
      if (section.visibility) {
        const exprErrors = validateExpression(section.visibility)
        for (const err of exprErrors) {
          errors.push({ field: section.id, message: `Section visibility: ${err}` })
        }
      }

      for (const field of section.fields) {
        // Field ID format
        if (!FIELD_ID_REGEX.test(field.id)) {
          errors.push({
            field: field.id,
            message: 'Field ID must start with lowercase letter, contain only lowercase letters, digits, and underscores',
          })
        }

        // Field ID uniqueness (within non-repeatable sections)
        if (!section.repeatable && allFieldIds.has(field.id)) {
          errors.push({ field: field.id, message: `Duplicate field ID: ${field.id}` })
        }
        allFieldIds.add(field.id)

        // Regex safety (ReDoS protection)
        if (field.validation?.pattern) {
          if (field.validation.pattern.length > 200) {
            errors.push({ field: field.id, message: 'Pattern too long (max 200 chars)' })
          } else if (isReDoSVulnerable(field.validation.pattern)) {
            errors.push({ field: field.id, message: 'Pattern is vulnerable to ReDoS' })
          }
        }

        // Calculated field expression validation
        if (field.type === 'calculated' && field.expression) {
          const exprErrors = validateExpression(field.expression)
          for (const err of exprErrors) {
            errors.push({ field: field.id, message: `Calculated expression: ${err}` })
          }
        }

        // Visibility expression validation
        if (typeof field.visibility === 'string') {
          const exprErrors = validateExpression(field.visibility)
          for (const err of exprErrors) {
            errors.push({ field: field.id, message: `Visibility expression: ${err}` })
          }
        }

        // Required expression validation
        if (typeof field.required === 'string') {
          const exprErrors = validateExpression(field.required)
          for (const err of exprErrors) {
            errors.push({ field: field.id, message: `Required expression: ${err}` })
          }
        }

        // Radio/checkbox/dropdown must have options or optionListSlug
        if (['radio', 'dropdown', 'checkbox'].includes(field.type)) {
          if ((!field.options || field.options.length === 0) && !field.optionListSlug) {
            errors.push({ field: field.id, message: 'Must have options or optionListSlug' })
          }
        }
      }
    }
  }

  // Expression dependency cycle detection
  errors.push(
    ...detectExpressionCycles(schema).map((msg) => ({ field: '_schema', message: msg }))
  )

  return errors
}
