-- Prevent an assigned student from editing assignment metadata or grades.
-- Assigned students may update only progress, status, and updated_at.
-- Assignment owners and the configured admin retain their existing workflows.

CREATE OR REPLACE FUNCTION public.protect_assigned_assignment_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  request_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF NEW.progress < 0 OR NEW.progress > 100 THEN
    RAISE EXCEPTION 'Assignment progress must be between 0 and 100'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status NOT IN ('pending', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Invalid assignment status'
      USING ERRCODE = '23514';
  END IF;

  IF auth.uid() IS NOT NULL
     AND OLD.assigned_to = auth.uid()
     AND OLD.user_id IS DISTINCT FROM auth.uid()
     AND request_email <> 'apha9213@gmail.com' THEN
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
      RAISE EXCEPTION 'Assigned students may only update assignment progress'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_assigned_assignment_updates ON public.assignments;
CREATE TRIGGER protect_assigned_assignment_updates
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.protect_assigned_assignment_updates();
