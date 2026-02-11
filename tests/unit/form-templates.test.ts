import { describe, it, expect } from 'vitest'
import { validateFormSchema } from '@/lib/form-engine/schema-validator'
import { formTemplates } from '@/lib/templates/form-templates'
import { demographicsSchema, vitalsSchema, adverseEventsSchema } from '@/lib/templates/shared-forms'

describe('form templates validation', () => {
  it('validates all registered templates', () => {
    for (const template of formTemplates) {
      const errors = validateFormSchema(template.schema)
      expect(errors, `Template "${template.name}" has validation errors: ${errors.map((e) => e.message).join(', ')}`).toEqual([])
    }
  })

  it('validates demographics schema', () => {
    const errors = validateFormSchema(demographicsSchema)
    expect(errors).toEqual([])
  })

  it('validates vitals schema', () => {
    const errors = validateFormSchema(vitalsSchema)
    expect(errors).toEqual([])
  })

  it('validates adverse events schema', () => {
    const errors = validateFormSchema(adverseEventsSchema)
    expect(errors).toEqual([])
  })

  it('all templates have required fields', () => {
    for (const template of formTemplates) {
      expect(template.id).toBeTruthy()
      expect(template.name).toBeTruthy()
      expect(template.description).toBeTruthy()
      expect(template.fieldCount).toBeGreaterThan(0)
      expect(template.schema.pages.length).toBeGreaterThan(0)
    }
  })

  it('all templates have unique IDs', () => {
    const ids = formTemplates.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('fieldCount matches actual field count', () => {
    for (const template of formTemplates) {
      let actualCount = 0
      for (const page of template.schema.pages) {
        for (const section of page.sections) {
          actualCount += section.fields.length
        }
      }
      expect(template.fieldCount, `Template "${template.name}" fieldCount mismatch`).toBe(actualCount)
    }
  })

  it('has at least 6 templates', () => {
    expect(formTemplates.length).toBeGreaterThanOrEqual(6)
  })
})
