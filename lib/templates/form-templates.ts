import type { FormSchema } from '@/types/form-schema'
import { demographicsSchema, vitalsSchema, adverseEventsSchema } from './shared-forms'

export interface FormTemplate {
  id: string
  name: string
  description: string
  fieldCount: number
  schema: FormSchema
}

function countFields(schema: FormSchema): number {
  return schema.pages.reduce(
    (sum, page) => sum + page.sections.reduce(
      (sSum, section) => sSum + section.fields.length, 0
    ), 0
  )
}

// ─── New Templates ───

export const labResultsSchema: FormSchema = {
  pages: [{
    id: 'page1',
    title: 'Lab Results',
    sections: [{
      id: 'hematology',
      title: 'Hematology',
      fields: [
        { id: 'collection_date', type: 'date', label: 'Collection Date', required: true },
        { id: 'wbc', type: 'number', label: 'WBC (10^3/uL)', validation: { min: 0, max: 100 } },
        { id: 'rbc', type: 'number', label: 'RBC (10^6/uL)', validation: { min: 0, max: 10 } },
        { id: 'hemoglobin', type: 'number', label: 'Hemoglobin (g/dL)', validation: { min: 0, max: 25 } },
        { id: 'hematocrit', type: 'number', label: 'Hematocrit (%)', validation: { min: 0, max: 100 } },
        { id: 'platelet_count', type: 'integer', label: 'Platelet Count (10^3/uL)', validation: { min: 0, max: 1000 } },
      ],
    }, {
      id: 'chemistry',
      title: 'Chemistry Panel',
      fields: [
        { id: 'glucose', type: 'number', label: 'Glucose (mg/dL)', validation: { min: 0, max: 500 } },
        { id: 'creatinine', type: 'number', label: 'Creatinine (mg/dL)', validation: { min: 0, max: 20 }, step: 0.1 },
        { id: 'alt', type: 'integer', label: 'ALT (U/L)', validation: { min: 0, max: 1000 } },
        { id: 'ast', type: 'integer', label: 'AST (U/L)', validation: { min: 0, max: 1000 } },
        { id: 'lab_notes', type: 'textarea', label: 'Notes', rows: 2 },
      ],
    }],
  }],
}

export const consentSchema: FormSchema = {
  pages: [{
    id: 'page1',
    title: 'Informed Consent',
    sections: [{
      id: 'consent_info',
      title: 'Consent Information',
      fields: [
        { id: 'consent_instructions', type: 'descriptive', label: 'The participant must read and sign the informed consent form before any study procedures are performed.' },
        { id: 'consent_date', type: 'date', label: 'Date of Consent', required: true },
        { id: 'consent_version', type: 'text', label: 'Consent Form Version', required: true, placeholder: 'e.g. v3.0, 2025-01-15' },
        { id: 'consent_given', type: 'radio', label: 'Informed Consent Obtained?', required: true, options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]},
        { id: 'reason_not_consented', type: 'textarea', label: 'Reason Not Consented', rows: 2, visibility: '{consent_given} == "no"' },
        { id: 'consenter_name', type: 'text', label: 'Name of Person Obtaining Consent', required: true },
        { id: 'witness_required', type: 'radio', label: 'Witness Required?', options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]},
        { id: 'witness_name', type: 'text', label: 'Witness Name', visibility: '{witness_required} == "yes"' },
        { id: 'consent_signature', type: 'signature', label: 'Participant Signature', required: true },
      ],
    }],
  }],
}

export const studyCompletionSchema: FormSchema = {
  pages: [{
    id: 'page1',
    title: 'Study Completion',
    sections: [{
      id: 'completion_info',
      title: 'Completion Information',
      fields: [
        { id: 'completion_date', type: 'date', label: 'Date of Completion/Withdrawal', required: true },
        { id: 'completion_status', type: 'radio', label: 'Status', required: true, options: [
          { value: 'completed', label: 'Completed per protocol' },
          { value: 'early_termination', label: 'Early termination' },
          { value: 'withdrawn_consent', label: 'Withdrawn consent' },
          { value: 'lost_to_followup', label: 'Lost to follow-up' },
          { value: 'death', label: 'Death' },
          { value: 'other', label: 'Other' },
        ]},
        { id: 'reason_detail', type: 'textarea', label: 'Details / Reason', rows: 3, visibility: '{completion_status} != "completed"', required: '{completion_status} != "completed"' },
        { id: 'last_dose_date', type: 'date', label: 'Date of Last Study Drug Dose' },
        { id: 'last_visit_date', type: 'date', label: 'Date of Last Study Visit' },
        { id: 'final_notes', type: 'textarea', label: 'Additional Notes', rows: 3 },
      ],
    }],
  }],
}

// ─── Template Registry ───

export const formTemplates: FormTemplate[] = [
  {
    id: 'demographics',
    name: 'Demographics',
    description: 'Basic participant demographics: name, DOB, sex, contact info',
    fieldCount: countFields(demographicsSchema),
    schema: demographicsSchema,
  },
  {
    id: 'vitals',
    name: 'Vital Signs',
    description: 'Standard vital measurements: weight, height, BP, HR, temperature',
    fieldCount: countFields(vitalsSchema),
    schema: vitalsSchema,
  },
  {
    id: 'adverse-events',
    name: 'Adverse Events',
    description: 'Repeatable AE form: description, severity, relatedness, outcome',
    fieldCount: countFields(adverseEventsSchema),
    schema: adverseEventsSchema,
  },
  {
    id: 'lab-results',
    name: 'Lab Results',
    description: 'Hematology and chemistry panel with standard ranges',
    fieldCount: countFields(labResultsSchema),
    schema: labResultsSchema,
  },
  {
    id: 'consent',
    name: 'Informed Consent',
    description: 'ICF tracking: consent date, version, signatures, witness',
    fieldCount: countFields(consentSchema),
    schema: consentSchema,
  },
  {
    id: 'study-completion',
    name: 'Study Completion',
    description: 'End-of-study form: completion status, withdrawal reason, dates',
    fieldCount: countFields(studyCompletionSchema),
    schema: studyCompletionSchema,
  },
]
