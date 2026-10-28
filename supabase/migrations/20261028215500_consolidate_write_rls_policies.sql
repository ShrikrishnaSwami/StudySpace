-- Consolidate remaining overlapping permissive INSERT/UPDATE policies.
-- The OR conditions preserve the previous permissive-policy semantics exactly.

DROP POLICY IF EXISTS "Admins grade submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Users update own submissions" ON public.assignment_submissions;
CREATE POLICY "Update permitted assignment submissions"
ON public.assignment_submissions
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'apha9213@gmail.com'
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'apha9213@gmail.com'
);

DROP POLICY IF EXISTS "Admins create assignments" ON public.assignments;
DROP POLICY IF EXISTS "Users can create own assignments" ON public.assignments;
CREATE POLICY "Create permitted assignments"
ON public.assignments
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR (
    lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'apha9213@gmail.com'
    AND assigned_by = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Students update progress on assigned assignments" ON public.assignments;
DROP POLICY IF EXISTS "Users can update own assignments" ON public.assignments;
CREATE POLICY "Update permitted assignments"
ON public.assignments
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR assigned_to = (SELECT auth.uid())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR assigned_to = (SELECT auth.uid())
);
