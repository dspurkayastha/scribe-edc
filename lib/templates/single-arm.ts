import { demographicsSchema, vitalsSchema } from './shared-forms'

export const singleArmTemplate = {
  name: 'Single-Arm Interventional',
  description: 'A single-arm interventional study with pre/post measurement.',
  studyType: 'single_arm' as const,
  arms: [
    { name: 'Treatment', label: 'Treatment Group', allocation: 1 },
  ],
  events: [
    { name: 'screening', label: 'Screening', event_type: 'scheduled' as const, day_offset: 0, window_before: 0, window_after: 7, sort_order: 0 },
    { name: 'pre_treatment', label: 'Pre-Treatment', event_type: 'scheduled' as const, day_offset: 0, window_before: 0, window_after: 3, sort_order: 1 },
    { name: 'post_treatment', label: 'Post-Treatment', event_type: 'scheduled' as const, day_offset: 7, window_before: 1, window_after: 3, sort_order: 2 },
    { name: 'd30', label: 'Day 30 Follow-up', event_type: 'scheduled' as const, day_offset: 30, window_before: 3, window_after: 7, sort_order: 3 },
  ],
  forms: [
    { slug: 'demographics', title: 'Demographics', schema: demographicsSchema },
    { slug: 'vitals', title: 'Vital Signs', schema: vitalsSchema },
  ],
  eventForms: [
    { event: 'screening', form: 'demographics', required: true },
    { event: 'pre_treatment', form: 'vitals', required: true },
    { event: 'post_treatment', form: 'vitals', required: true },
    { event: 'd30', form: 'vitals', required: true },
  ],
}
