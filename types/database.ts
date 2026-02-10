// ══════════════════════════════════════════════════════════════
// DATABASE TYPE DEFINITIONS
// Manual types matching the Supabase schema
// Will be supplemented by auto-generated types from `supabase gen types`
// ══════════════════════════════════════════════════════════════

// ─── Enum unions (matching CHECK constraints) ───

export type StudyType =
  | 'parallel_rct'
  | 'crossover_rct'
  | 'factorial'
  | 'cluster_rct'
  | 'single_arm'
  | 'observational'
  | 'case_control'
  | 'registry'

export type StudyStatus = 'setup' | 'recruiting' | 'paused' | 'closed' | 'archived'

export type MemberRole = 'pi' | 'co_investigator' | 'data_entry' | 'read_only' | 'monitor'

export type ParticipantStatus =
  | 'screening'
  | 'eligible'
  | 'ineligible'
  | 'enrolled'
  | 'randomized'
  | 'on_treatment'
  | 'completed'
  | 'withdrawn'
  | 'lost_to_followup'
  | 'screen_failure'

export type FormResponseStatus = 'draft' | 'complete' | 'verified' | 'locked' | 'signed'

export type EventType = 'scheduled' | 'unscheduled' | 'repeating' | 'as_needed'

export type EventAnchor = 'enrollment' | 'randomization' | 'surgery' | 'custom'

export type PeriodType = 'treatment' | 'washout' | 'run_in' | 'follow_up'

export type RandomizationMethod =
  | 'simple'
  | 'block'
  | 'stratified_block'
  | 'minimization'
  | 'cluster'

export type AllocationUnit = 'participant' | 'site' | 'cluster'

export type AeSeverity = 'mild' | 'moderate' | 'severe'

export type AeRelatedness = 'unrelated' | 'unlikely' | 'possible' | 'probable' | 'definite'

export type AeOutcome =
  | 'resolved'
  | 'ongoing'
  | 'resolved_with_sequelae'
  | 'fatal'
  | 'unknown'

export type QueryStatus = 'open' | 'answered' | 'closed' | 'cancelled'

export type QueryPriority = 'low' | 'normal' | 'high' | 'critical'

export type QueryCategory = 'manual' | 'auto_validation' | 'auto_range' | 'auto_missing'

export type NotificationChannel = 'in_app' | 'email' | 'both'

export type NotificationRecipients =
  | 'pi'
  | 'co_investigator'
  | 'all_staff'
  | 'site_coordinator'
  | 'monitor'
  | 'custom'

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

export type EligibilityCriteriaType = 'inclusion' | 'exclusion'

// ─── Row types ───

export interface OrganizationRow {
  id: string
  name: string
  slug: string
  logo_url: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserProfileRow {
  id: string
  email: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface StudyRow {
  id: string
  organization_id: string
  name: string
  short_name: string
  slug: string
  protocol_id: string | null
  id_prefix: string
  study_type: StudyType
  target_sample: number | null
  status: StudyStatus
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface StudySiteRow {
  id: string
  study_id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
}

export interface StudyArmRow {
  id: string
  study_id: string
  name: string
  label: string
  allocation: number
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface StudyPeriodRow {
  id: string
  study_id: string
  name: string
  label: string
  period_type: PeriodType
  duration_days: number | null
  sort_order: number
  created_at: string
}

export interface StudyStratumRow {
  id: string
  study_id: string
  name: string
  label: string
  rule: string | null
  sort_order: number
  created_at: string
}

export interface OptionListRow {
  id: string
  study_id: string | null
  slug: string
  label: string
  options: Array<{ value: string; label: string }>
  is_searchable: boolean
  created_at: string
  updated_at: string
}

export interface StudyEventRow {
  id: string
  study_id: string
  arm_id: string | null
  period_id: string | null
  name: string
  label: string
  event_type: EventType
  day_offset: number | null
  anchor: EventAnchor
  anchor_event_id: string | null
  window_before: number
  window_after: number
  max_repeats: number | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface FormDefinitionRow {
  id: string
  study_id: string
  slug: string
  title: string
  version: number
  schema: Record<string, unknown>
  rules: unknown[]
  settings: Record<string, unknown>
  is_active: boolean
  is_locked: boolean
  locked_by: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
}

export interface EventFormRow {
  id: string
  event_id: string
  form_id: string
  is_required: boolean
  sort_order: number
}

export interface EligibilityCriteriaRow {
  id: string
  study_id: string
  label: string
  rule: string
  type: EligibilityCriteriaType
  sort_order: number
  created_at: string
}

export interface StudyMemberRow {
  id: string
  study_id: string
  user_id: string
  site_id: string | null
  role: MemberRole
  is_active: boolean
  created_at: string
}

export interface ParticipantRow {
  id: string
  study_id: string
  site_id: string | null
  study_number: string
  status: ParticipantStatus
  enrolled_at: string | null
  created_by: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface FormResponseRow {
  id: string
  study_id: string
  participant_id: string
  form_id: string
  form_version: number
  event_id: string | null
  instance_number: number
  data: Record<string, unknown>
  status: FormResponseStatus
  completed_by: string | null
  completed_at: string | null
  verified_by: string | null
  verified_at: string | null
  locked_by: string | null
  locked_at: string | null
  updated_at: string
  deleted_at: string | null
  created_at: string
}

export interface RandomizationConfigRow {
  id: string
  study_id: string
  method: RandomizationMethod
  block_sizes: number[] | null
  allocation_unit: AllocationUnit
  password_hash: string | null
  settings: Record<string, unknown>
  created_at: string
}

export interface RandomizationSequenceRow {
  id: string
  study_id: string
  stratum_id: string | null
  sequence_number: number
  arm_id: string
  used_at: string | null
  used_by: string | null
  participant_id: string | null
  created_at: string
}

export interface RandomizationAllocationRow {
  id: string
  study_id: string
  participant_id: string
  arm_id: string
  stratum_id: string | null
  sequence_id: string | null
  period_id: string | null
  randomized_by: string
  randomized_at: string
}

export interface AdverseEventRow {
  id: string
  study_id: string
  participant_id: string
  event_number: number
  description: string
  onset_date: string
  resolution_date: string | null
  severity: AeSeverity
  relatedness: AeRelatedness
  outcome: AeOutcome
  is_sae: boolean
  sae_criteria: string[] | null
  sae_reported_at: string | null
  sae_acknowledged_by: string | null
  sae_acknowledged_at: string | null
  reported_by: string
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface DataQueryRow {
  id: string
  study_id: string
  participant_id: string
  form_response_id: string | null
  field_id: string | null
  query_text: string
  status: QueryStatus
  priority: QueryPriority
  category: QueryCategory
  raised_by: string | null
  assigned_to: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export interface QueryResponseRow {
  id: string
  query_id: string
  response_text: string
  responded_by: string
  created_at: string
}

export interface SignatureRow {
  id: string
  study_id: string
  form_response_id: string
  signer_id: string
  signer_name: string
  signer_role: string
  meaning: string
  ip_address: string | null
  user_agent: string | null
  signed_at: string
}

export interface NotificationRow {
  id: string
  study_id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export interface AuditLogRow {
  id: string
  study_id: string | null
  table_name: string
  record_id: string
  action: AuditAction
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_fields: string[] | null
  reason: string | null
  changed_by: string | null
  ip_address: string | null
  user_agent: string | null
  changed_at: string
}

export interface NotificationRuleRow {
  id: string
  study_id: string
  event_type: string
  channel: NotificationChannel
  recipients: NotificationRecipients
  custom_user_ids: string[] | null
  is_active: boolean
  created_at: string
}

export interface UnblindingEventRow {
  id: string
  study_id: string
  participant_id: string
  reason: string
  unblinded_by: string
  disclosed_to: string[] | null
  created_at: string
}

// ─── Insert types (omit auto-generated fields) ───

export type OrganizationInsert = Omit<OrganizationRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}
export type StudyInsert = Omit<StudyRow, 'id' | 'created_at' | 'updated_at' | 'status'> & {
  id?: string
  status?: StudyStatus
}
export type ParticipantInsert = Omit<
  ParticipantRow,
  'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'status'
> & {
  id?: string
  status?: ParticipantStatus
}
export type FormResponseInsert = Omit<
  FormResponseRow,
  'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'status'
> & {
  id?: string
  status?: FormResponseStatus
}

// ─── Update types (all fields optional except id) ───

export type OrganizationUpdate = Partial<Omit<OrganizationRow, 'id' | 'created_at'>>
export type StudyUpdate = Partial<Omit<StudyRow, 'id' | 'created_at' | 'organization_id'>>
export type ParticipantUpdate = Partial<Omit<ParticipantRow, 'id' | 'created_at' | 'study_id'>>
export type FormResponseUpdate = Partial<
  Omit<FormResponseRow, 'id' | 'created_at' | 'study_id' | 'participant_id' | 'form_id'>
>
