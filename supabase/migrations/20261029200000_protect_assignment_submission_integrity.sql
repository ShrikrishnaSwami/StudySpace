-- Protect submitted work and grades from direct client-side tampering.
create or replace function public.protect_assignment_submission_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text := coalesce(auth.role(), '');
  caller_aal text := coalesce((auth.jwt() ->> 'aal'), 'aal1');
  caller_app_role text := coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '');
  can_grade boolean := false;
begin
  if new.id is distinct from old.id
     or new.assignment_id is distinct from old.assignment_id
     or new.user_id is distinct from old.user_id
     or new.attempt_number is distinct from old.attempt_number
     or new.created_at is distinct from old.created_at then
    raise exception 'Submission identity fields are immutable' using errcode = '42501';
  end if;

  can_grade := caller_role = 'service_role'
    or (caller_role = 'authenticated' and caller_aal = 'aal2' and caller_app_role = 'admin')
    or exists (
      select 1
      from public.assignments a
      where a.id = old.assignment_id
        and a.user_id = auth.uid()
        and a.user_id <> old.user_id
    );

  if (
    new.grade is distinct from old.grade
    or new.feedback is distinct from old.feedback
    or new.graded_at is distinct from old.graded_at
    or new.ai_grade is distinct from old.ai_grade
    or new.ai_feedback is distinct from old.ai_feedback
    or new.ai_graded_at is distinct from old.ai_graded_at
  ) and not can_grade then
    raise exception 'Only the assignment instructor, verified administrator, or trusted server may change grades' using errcode = '42501';
  end if;

  if old.status = 'submitted' and new.status <> 'submitted' and not can_grade then
    raise exception 'A submitted assignment cannot be returned to draft by the submitter' using errcode = '42501';
  end if;

  if old.status = 'submitted'
     and new.submission_note is distinct from old.submission_note
     and not can_grade then
    raise exception 'Submitted work is locked; contact the assignment instructor to request a correction' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_assignment_submission_integrity() from public, anon, authenticated;
drop trigger if exists protect_assignment_submission_integrity on public.assignment_submissions;
create trigger protect_assignment_submission_integrity
before update on public.assignment_submissions
for each row execute function public.protect_assignment_submission_integrity();
