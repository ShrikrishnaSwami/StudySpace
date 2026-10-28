-- Replace email-based authorization with a trusted, server-managed app_metadata role.
-- A user cannot grant themselves this claim through user_metadata.
-- The administrator role is provisioned in Supabase Auth outside this migration.

DROP POLICY IF EXISTS "Read permitted submission file metadata" ON public.assignment_submission_files;
CREATE POLICY "Read permitted submission file metadata"
ON public.assignment_submission_files FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Read permitted assignment submissions" ON public.assignment_submissions;
CREATE POLICY "Read permitted assignment submissions"
ON public.assignment_submissions FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Update permitted assignment submissions" ON public.assignment_submissions;
CREATE POLICY "Update permitted assignment submissions"
ON public.assignment_submissions FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()) OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK (user_id = (SELECT auth.uid()) OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Create permitted assignments" ON public.assignments;
CREATE POLICY "Create permitted assignments"
ON public.assignments FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' AND assigned_by = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Read permitted assignments" ON public.assignments;
CREATE POLICY "Read permitted assignments"
ON public.assignments FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR assigned_to = (SELECT auth.uid())
  OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

DROP POLICY IF EXISTS "Read permitted courses" ON public.courses;
CREATE POLICY "Read permitted courses"
ON public.courses FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR EXISTS (SELECT 1 FROM public.assignments a WHERE a.course_id = courses.id AND a.assigned_to = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Read permitted quizzes" ON public.quizzes;
CREATE POLICY "Read permitted quizzes"
ON public.quizzes FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE OR REPLACE FUNCTION public.protect_assigned_assignment_updates()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
BEGIN
  IF NEW.progress < 0 OR NEW.progress > 100 THEN
    RAISE EXCEPTION 'Assignment progress must be between 0 and 100' USING ERRCODE = '23514';
  END IF;
  IF NEW.status NOT IN ('pending', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Invalid assignment status' USING ERRCODE = '23514';
  END IF;
  IF auth.uid() IS NOT NULL
     AND OLD.assigned_to = auth.uid()
     AND OLD.user_id IS DISTINCT FROM auth.uid()
     AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.course_id IS DISTINCT FROM OLD.course_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.priority IS DISTINCT FROM OLD.priority
       OR NEW.points IS DISTINCT FROM OLD.points
       OR NEW.max_points IS DISTINCT FROM OLD.max_points
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by THEN
      RAISE EXCEPTION 'Assigned students may only update assignment progress' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_assignment_submission_grades()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
DECLARE
  request_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  is_admin boolean := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
BEGIN
  IF request_role = 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status <> 'draft' OR NEW.grade IS NOT NULL OR NEW.feedback IS NOT NULL
         OR NEW.graded_at IS NOT NULL OR NEW.graded_by IS NOT NULL
         OR NEW.ai_grade IS NOT NULL OR NEW.ai_feedback IS NOT NULL OR NEW.ai_graded_at IS NOT NULL THEN
        RAISE EXCEPTION 'Server-side services may only create ungraded draft submissions' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id OR NEW.attempt_number IS DISTINCT FROM OLD.attempt_number
       OR NEW.status IS DISTINCT FROM OLD.status OR NEW.submission_note IS DISTINCT FROM OLD.submission_note
       OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at OR NEW.grade IS DISTINCT FROM OLD.grade
       OR NEW.feedback IS DISTINCT FROM OLD.feedback OR NEW.graded_at IS DISTINCT FROM OLD.graded_at
       OR NEW.graded_by IS DISTINCT FROM OLD.graded_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Server-side services cannot change submission ownership, student work, status, or official grades' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF is_admin THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' OR NEW.grade IS NOT NULL OR NEW.feedback IS NOT NULL
       OR NEW.graded_at IS NOT NULL OR NEW.graded_by IS NOT NULL
       OR NEW.ai_grade IS NOT NULL OR NEW.ai_feedback IS NOT NULL OR NEW.ai_graded_at IS NOT NULL THEN
      RAISE EXCEPTION 'Students may only create ungraded draft submissions' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.grade IS DISTINCT FROM OLD.grade OR NEW.feedback IS DISTINCT FROM OLD.feedback
     OR NEW.graded_at IS DISTINCT FROM OLD.graded_at OR NEW.graded_by IS DISTINCT FROM OLD.graded_by THEN
    RAISE EXCEPTION 'Official grades can only be changed by an administrator' USING ERRCODE = '42501';
  END IF;
  IF NEW.ai_grade IS DISTINCT FROM OLD.ai_grade OR NEW.ai_feedback IS DISTINCT FROM OLD.ai_feedback
     OR NEW.ai_graded_at IS DISTINCT FROM OLD.ai_graded_at THEN
    RAISE EXCEPTION 'AI feedback can only be changed by the StudySpace grading service' USING ERRCODE = '42501';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id
     OR NEW.attempt_number IS DISTINCT FROM OLD.attempt_number THEN
    RAISE EXCEPTION 'Submission ownership and assignment linkage cannot be changed' USING ERRCODE = '42501';
  END IF;
  IF OLD.status = 'submitted' AND (NEW.status IS DISTINCT FROM OLD.status
     OR NEW.submission_note IS DISTINCT FROM OLD.submission_note OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at) THEN
    RAISE EXCEPTION 'Submitted work is locked' USING ERRCODE = '42501';
  END IF;
  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' THEN
    IF NEW.submitted_at IS NULL THEN
      RAISE EXCEPTION 'A submission timestamp is required' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.assignment_submission_files f WHERE f.submission_id = OLD.id AND f.user_id = OLD.user_id) THEN
      RAISE EXCEPTION 'At least one submission file is required before submitting' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
