import { demographicsSchema, vitalsSchema } from './shared-forms'

export const observationalTemplate = {
  name: 'Observational Cohort',
  description: 'A prospective observational cohort study with periodic follow-up.',
  studyType: 'observational' as const,
  arms: [],
  events: [
    { name: 'enrollment', label: 'Enrollment', event_type: 'scheduled' as const, day_offset: 0, window_before: 0, window_after: 7, sort_order: 0 },
    { name: 'm3', label: '3-Month Follow-up', event_type: 'scheduled' as const, day_offset: 90, window_before: 7, window_after: 14, sort_order: 1 },
    { name: 'm6', label: '6-Month Follow-up', event_type: 'scheduled' as const, day_offset: 180, window_before: 7, window_after: 14, sort_order: 2 },
    { name: 'm12', label: '12-Month Follow-up', event_type: 'scheduled' as const, day_offset: 365, window_before: 14, window_after: 30, sort_order: 3 },
  ],
  forms: [
    { slug: 'demographics', title: 'Demographics', schema: demographicsSchema },
    { slug: 'vitals', title: 'Vital Signs', schema: vitalsSchema },
  ],
  eventForms: [
    { event: 'enrollment', form: 'demographics', required: true },
    { event: 'enrollment', form: 'vitals', required: true },
    { event: 'm3', form: 'vitals', required: true },
    { event: 'm6', form: 'vitals', required: true },
    { event: 'm12', form: 'vitals', required: true },
  ],
}
