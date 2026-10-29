create or replace function public.protect_assignment_submission_grades()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  request_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  is_admin boolean := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
  is_instructor boolean := false;
begin
  if request_role = 'service_role' then
    if tg_op = 'INSERT' then
      if new.status <> 'draft'
         or new.grade is not null
         or new.feedback is not null
         or new.graded_at is not null
         or new.graded_by is not null
         or new.ai_grade is not null
         or new.ai_feedback is not null
         or new.ai_graded_at is not null then
        raise exception 'Server-side services may only create ungraded draft submissions'
          using errcode = '42501';
      end if;
      return new;
    end if;

    if new.id is distinct from old.id
       or new.user_id is distinct from old.user_id
       or new.assignment_id is distinct from old.assignment_id
       or new.attempt_number is distinct from old.attempt_number
       or new.status is distinct from old.status
       or new.submission_note is distinct from old.submission_note
       or new.submitted_at is distinct from old.submitted_at
       or new.grade is distinct from old.grade
       or new.feedback is distinct from old.feedback
       or new.graded_at is distinct from old.graded_at
       or new.graded_by is distinct from old.graded_by
       or new.created_at is distinct from old.created_at then
      raise exception 'Server-side services cannot change submission ownership, student work, status, or official grades'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if is_admin then
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

  select exists (
    select 1
    from public.assignments a
    where a.id = old.assignment_id
      and a.user_id = auth.uid()
      and a.user_id <> old.user_id
  ) into is_instructor;

  if is_instructor then
    if new.id is distinct from old.id
       or new.user_id is distinct from old.user_id
       or new.assignment_id is distinct from old.assignment_id
       or new.attempt_number is distinct from old.attempt_number
       or new.status is distinct from old.status
       or new.submission_note is distinct from old.submission_note
       or new.submitted_at is distinct from old.submitted_at
       or new.created_at is distinct from old.created_at then
      raise exception 'Instructors may grade submissions but cannot alter submitted work or its ownership'
        using errcode = '42501';
    end if;
    if new.ai_grade is distinct from old.ai_grade
       or new.ai_feedback is distinct from old.ai_feedback
       or new.ai_graded_at is distinct from old.ai_graded_at then
      raise exception 'Only the trusted AI grading service may change provisional AI feedback'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.grade is distinct from old.grade
     or new.feedback is distinct from old.feedback
     or new.graded_at is distinct from old.graded_at
     or new.graded_by is distinct from old.graded_by then
    raise exception 'Official grades can only be changed by the assignment instructor or a verified administrator'
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

  if new.status = 'submitted' and old.status is distinct from 'submitted' then
    if new.submitted_at is null then
      raise exception 'A submission timestamp is required'
        using errcode = '23514';
    end if;
    if not exists (
      select 1
      from public.assignment_submission_files f
      where f.submission_id = old.id
        and f.user_id = old.user_id
    ) then
      raise exception 'At least one submission file is required before submitting'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;
