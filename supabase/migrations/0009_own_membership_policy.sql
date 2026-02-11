-- Allow users to always see their own study_members rows.
-- This prevents circular dependency where get_user_memberships()
-- needs to read study_members but study_members RLS needs get_user_memberships().

CREATE POLICY "Users can view own memberships" ON study_members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
