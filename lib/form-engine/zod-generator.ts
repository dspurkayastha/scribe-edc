import { z } from 'zod'
import type { FormSchema, Field, Section } from '@/types/form-schema'
import { isReDoSVulnerable } from './regex-safety'

/**
 * Generate a Zod schema from a FormSchema definition.
 * Used for both client-side and server-side validation.
 */
export function generateZodSchema(
  schema: FormSchema
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const page of schema.pages) {
    for (const section of page.sections) {
      if (section.repeatable) {
        const itemShape = buildFieldShapes(section.fields)
        let arraySchema = z.array(z.object(itemShape))
        if (section.minRepeat) arraySchema = arraySchema.min(section.minRepeat)
        if (section.maxRepeat) arraySchema = arraySchema.max(section.maxRepeat)
        shape[section.id] =
          section.minRepeat && section.minRepeat > 0
            ? arraySchema
            : arraySchema.optional()
      } else {
        Object.assign(shape, buildFieldShapes(section.fields))
      }
    }
  }

  return z.object(shape)
}

function buildFieldShapes(fields: Field[]): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of fields) {
    if (field.type === 'descriptive') continue

    let schema: z.ZodTypeAny = buildFieldSchema(field)

    // Apply required/optional
    if (field.required === true) {
      shape[field.id] = schema
    } else {
      shape[field.id] = schema.optional().nullable()
    }
  }

  return shape
}

function buildFieldSchema(field: Field): z.ZodTypeAny {
  switch (field.type) {
    case 'text':
    case 'textarea': {
      let schema = z.string()
      if (field.validation?.minLength) schema = schema.min(field.validation.minLength)
      if (field.validation?.maxLength) schema = schema.max(field.validation.maxLength)
      if (field.validation?.pattern && !isReDoSVulnerable(field.validation.pattern)) {
        schema = schema.regex(
          new RegExp(field.validation.pattern),
          field.validation.patternMessage ?? 'Invalid format'
        )
      }
      return schema
    }

    case 'number':
    case 'slider':
    case 'likert': {
      let schema = z.number()
      if (field.validation?.min !== undefined) schema = schema.min(field.validation.min)
      if (field.validation?.max !== undefined) schema = schema.max(field.validation.max)
      return schema
    }

    case 'integer': {
      let schema = z.number().int()
      if (field.validation?.min !== undefined) schema = schema.min(field.validation.min)
      if (field.validation?.max !== undefined) schema = schema.max(field.validation.max)
      return schema
    }

    case 'date':
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')

    case 'datetime':
      return z.string().datetime({ message: 'Invalid datetime format' })

    case 'time':
      return z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')

    case 'radio':
    case 'dropdown':
    case 'lookup': {
      if (field.options && field.options.length > 0) {
        return z.enum(field.options.map((o) => o.value) as [string, ...string[]])
      }
      return z.string()
    }

    case 'checkbox':
      return z.array(z.string())

    case 'matrix':
      return z.record(z.string(), z.union([z.string(), z.number()]))

    case 'calculated':
      return z.union([z.string(), z.number()])

    case 'file':
      return z.string().url('Invalid file URL')

    case 'signature':
      return z.string()

    default:
      return z.unknown()
  }
}
