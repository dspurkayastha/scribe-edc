-- ═══════════════════════════════════════════════════════════════
-- Migration 0011: Option list RLS policies
-- Phase 2: Form Builder - option_lists table policies
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS (may already be enabled)
ALTER TABLE option_lists ENABLE ROW LEVEL SECURITY;

-- SELECT: any study member can read option lists for their studies + global lists
CREATE POLICY option_lists_select ON option_lists
  FOR SELECT
  USING (
    study_id IS NULL
    OR study_id IN (
      SELECT study_id FROM study_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- INSERT: PI and co_investigator can create option lists
CREATE POLICY option_lists_insert ON option_lists
  FOR INSERT
  WITH CHECK (
    study_id IN (
      SELECT study_id FROM study_members
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('pi', 'co_investigator')
    )
  );

-- UPDATE: PI and co_investigator can update study-specific option lists
CREATE POLICY option_lists_update ON option_lists
  FOR UPDATE
  USING (
    study_id IN (
      SELECT study_id FROM study_members
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('pi', 'co_investigator')
    )
  );

-- DELETE: PI and co_investigator can delete study-specific option lists
CREATE POLICY option_lists_delete ON option_lists
  FOR DELETE
  USING (
    study_id IN (
      SELECT study_id FROM study_members
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('pi', 'co_investigator')
    )
  );
