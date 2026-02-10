import type { FormSchema } from '@/types/form-schema'
import { demographicsSchema, vitalsSchema, adverseEventsSchema } from './shared-forms'

export const simpleRctTemplate = {
  name: 'Simple Parallel-Group RCT',
  description: 'A two-arm parallel-group randomized controlled trial with standard visit schedule.',
  studyType: 'parallel_rct' as const,
  arms: [
    { name: 'Control', label: 'Standard Treatment', allocation: 1 },
    { name: 'Experimental', label: 'Experimental Treatment', allocation: 1 },
  ],
  events: [
    { name: 'screening', label: 'Screening', event_type: 'scheduled' as const, day_offset: 0, window_before: 0, window_after: 7, sort_order: 0 },
    { name: 'baseline', label: 'Baseline', event_type: 'scheduled' as const, day_offset: 0, window_before: 0, window_after: 3, sort_order: 1 },
    { name: 'd30', label: 'Day 30 Follow-up', event_type: 'scheduled' as const, day_offset: 30, window_before: 3, window_after: 7, sort_order: 2 },
    { name: 'd90', label: 'Day 90 Follow-up', event_type: 'scheduled' as const, day_offset: 90, window_before: 7, window_after: 14, sort_order: 3 },
    { name: 'd180', label: 'Day 180 Follow-up', event_type: 'scheduled' as const, day_offset: 180, window_before: 7, window_after: 14, sort_order: 4 },
    { name: 'unscheduled', label: 'Unscheduled Visit', event_type: 'unscheduled' as const, day_offset: null, window_before: 0, window_after: 0, sort_order: 99 },
  ],
  forms: [
    { slug: 'demographics', title: 'Demographics', schema: demographicsSchema },
    { slug: 'vitals', title: 'Vital Signs', schema: vitalsSchema },
    { slug: 'adverse-events', title: 'Adverse Events', schema: adverseEventsSchema },
  ],
  eventForms: [
    { event: 'screening', form: 'demographics', required: true },
    { event: 'baseline', form: 'vitals', required: true },
    { event: 'd30', form: 'vitals', required: true },
    { event: 'd90', form: 'vitals', required: true },
    { event: 'd180', form: 'vitals', required: true },
  ],
}
