import { describe, it, expect } from 'vitest'
import { simpleRctTemplate } from '@/lib/templates/simple-rct'
import { observationalTemplate } from '@/lib/templates/observational'
import { singleArmTemplate } from '@/lib/templates/single-arm'
import { validateFormSchema } from '@/lib/form-engine/schema-validator'

describe('Study Templates', () => {
  describe('Simple RCT template', () => {
    it('has required structure', () => {
      expect(simpleRctTemplate.name).toBeDefined()
      expect(simpleRctTemplate.description).toBeDefined()
      expect(simpleRctTemplate.studyType).toBe('parallel_rct')
      expect(simpleRctTemplate.arms).toHaveLength(2)
      expect(simpleRctTemplate.events.length).toBeGreaterThan(0)
      expect(simpleRctTemplate.forms.length).toBeGreaterThan(0)
    })

    it('has valid form schemas', () => {
      for (const form of simpleRctTemplate.forms) {
        const errors = validateFormSchema(form.schema)
        expect(errors, `Form "${form.slug}" has validation errors: ${errors.map((e) => e.message).join(', ')}`).toEqual([])
      }
    })

    it('event-form mappings reference valid events and forms', () => {
      const eventNames = new Set(simpleRctTemplate.events.map((e) => e.name))
      const formSlugs = new Set(simpleRctTemplate.forms.map((f) => f.slug))

      for (const ef of simpleRctTemplate.eventForms) {
        expect(eventNames.has(ef.event), `Unknown event: ${ef.event}`).toBe(true)
        expect(formSlugs.has(ef.form), `Unknown form: ${ef.form}`).toBe(true)
      }
    })
  })

  describe('Observational template', () => {
    it('has required structure', () => {
      expect(observationalTemplate.name).toBeDefined()
      expect(observationalTemplate.studyType).toBe('observational')
      expect(observationalTemplate.arms).toHaveLength(0)
      expect(observationalTemplate.events.length).toBeGreaterThan(0)
      expect(observationalTemplate.forms.length).toBeGreaterThan(0)
    })

    it('has valid form schemas', () => {
      for (const form of observationalTemplate.forms) {
        const errors = validateFormSchema(form.schema)
        expect(errors, `Form "${form.slug}" has validation errors: ${errors.map((e) => e.message).join(', ')}`).toEqual([])
      }
    })
  })

  describe('Single-arm template', () => {
    it('has required structure', () => {
      expect(singleArmTemplate.name).toBeDefined()
      expect(singleArmTemplate.studyType).toBe('single_arm')
      expect(singleArmTemplate.arms).toHaveLength(1)
      expect(singleArmTemplate.events.length).toBeGreaterThan(0)
      expect(singleArmTemplate.forms.length).toBeGreaterThan(0)
    })

    it('has valid form schemas', () => {
      for (const form of singleArmTemplate.forms) {
        const errors = validateFormSchema(form.schema)
        expect(errors, `Form "${form.slug}" has validation errors: ${errors.map((e) => e.message).join(', ')}`).toEqual([])
      }
    })
  })
})
