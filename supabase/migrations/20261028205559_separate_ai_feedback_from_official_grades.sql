-- Keep formative AI feedback separate from authoritative instructor grading.
alter table public.assignment_submissions
  add column if not exists ai_grade numeric,
  add column if not exists ai_feedback text,
  add column if not exists ai_graded_at timestamptz;

alter table public.assignment_submissions
  drop constraint if exists assignment_submissions_ai_grade_range;
alter table public.assignment_submissions
  add constraint assignment_submissions_ai_grade_range
  check (ai_grade is null or (ai_grade >= 0 and ai_grade <= 1000));

create or replace function public.protect_assignment_submission_grades()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  request_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  request_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if request_role = 'service_role' or request_email = 'apha9213@gmail.com' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft'
       or new.grade is not null
       or new.feedback is not null
       or new.graded_at is not null
       or new.graded_by is not null
       or new.ai_grade is not null
       or new.ai_feedback is not null
       or new.ai_graded_at is not null then
      raise exception 'Students may only create ungraded draft submissions'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.grade is distinct from old.grade
     or new.feedback is distinct from old.feedback
     or new.graded_at is distinct from old.graded_at
     or new.graded_by is distinct from old.graded_by then
    raise exception 'Official grades can only be changed by StudySpace grading services or an administrator'
      using errcode = '42501';
  end if;

  if new.ai_grade is distinct from old.ai_grade
     or new.ai_feedback is distinct from old.ai_feedback
     or new.ai_graded_at is distinct from old.ai_graded_at then
    raise exception 'AI feedback can only be changed by the StudySpace grading service'
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
