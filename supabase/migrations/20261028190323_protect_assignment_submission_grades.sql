-- Prevent student-controlled grade changes and lock submitted work.
create or replace function public.protect_assignment_submission_grades()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  request_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  request_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  -- Trusted server-side grading and the configured admin may manage grading fields.
  if request_role = 'service_role' or request_email = 'apha9213@gmail.com' then
    return new;
  end if;

  if new.grade is distinct from old.grade
     or new.feedback is distinct from old.feedback
     or new.graded_at is distinct from old.graded_at
     or new.graded_by is distinct from old.graded_by then
    raise exception 'Grades and grading feedback can only be changed by StudySpace grading services or an administrator'
      using errcode = '42501';
  end if;

  if new.user_id is distinct from old.user_id
     or new.assignment_id is distinct from old.assignment_id
     or new.attempt_number is distinct from old.attempt_number then
    raise exception 'Submission ownership and assignment linkage cannot be changed'
      using errcode = '42501';
  end if;

  if old.status = 'submitted'
     and (new.status is distinct from old.status
       or new.submission_note is distinct from old.submission_note
       or new.submitted_at is distinct from old.submitted_at) then
    raise exception 'Submitted work is locked'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_assignment_submission_grades() from public, anon, authenticated;

drop trigger if exists protect_assignment_submission_grades on public.assignment_submissions;
create trigger protect_assignment_submission_grades
before update on public.assignment_submissions
for each row execute function public.protect_assignment_submission_grades();
