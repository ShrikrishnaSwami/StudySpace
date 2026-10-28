-- Consolidate equivalent SELECT policies into one OR predicate per table.
-- This preserves the existing access rules while avoiding repeated permissive
-- policy evaluation for authenticated reads.

DROP POLICY IF EXISTS "Admins read all submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Users read own submissions" ON public.assignment_submissions;
CREATE POLICY "Read permitted assignment submissions"
ON public.assignment_submissions FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'apha9213@gmail.com'
);

DROP POLICY IF EXISTS "Admins read all assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students view assigned assignments" ON public.assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON public.assignments;
CREATE POLICY "Read permitted assignments"
ON public.assignments FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR assigned_to = (SELECT auth.uid())
  OR lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'apha9213@gmail.com'
);

DROP POLICY IF EXISTS "Admins read all courses" ON public.courses;
DROP POLICY IF EXISTS "Students view assigned course" ON public.courses;
DROP POLICY IF EXISTS "Users can view their own courses" ON public.courses;
CREATE POLICY "Read permitted courses"
ON public.courses FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.course_id = courses.id AND a.assigned_to = (SELECT auth.uid())
  )
  OR lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'apha9213@gmail.com'
);

DROP POLICY IF EXISTS "Admins read all quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can view own quizzes" ON public.quizzes;
CREATE POLICY "Read permitted quizzes"
ON public.quizzes FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'apha9213@gmail.com'
);

DROP POLICY IF EXISTS "Students read assigned attachment metadata" ON public.assignment_attachments;
DROP POLICY IF EXISTS "Users can view their own assignment attachments" ON public.assignment_attachments;
CREATE POLICY "Read permitted assignment attachment metadata"
ON public.assignment_attachments FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_attachments.assignment_id
      AND a.assigned_to = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins read all submission file metadata" ON public.assignment_submission_files;
DROP POLICY IF EXISTS "Users read own submission files" ON public.assignment_submission_files;
CREATE POLICY "Read permitted submission file metadata"
ON public.assignment_submission_files FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'apha9213@gmail.com'
);
