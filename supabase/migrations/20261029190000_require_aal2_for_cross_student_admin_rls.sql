-- Require a verified second factor before the admin JWT can use broad cross-student RLS branches.
-- AAL1 admins may still open /admin to enrol MFA, but cannot read/write cross-user records.
drop policy if exists "Read permitted assignment submissions" on public.assignment_submissions;
create policy "Read permitted assignment submissions"
on public.assignment_submissions for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    (select auth.jwt()) ->> 'aal' = 'aal2'
    and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  )
);

drop policy if exists "Update permitted assignment submissions" on public.assignment_submissions;
create policy "Update permitted assignment submissions"
on public.assignment_submissions for update to authenticated
using (
  user_id = (select auth.uid())
  or (
    (select auth.jwt()) ->> 'aal' = 'aal2'
    and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  )
)
with check (
  user_id = (select auth.uid())
  or (
    (select auth.jwt()) ->> 'aal' = 'aal2'
    and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  )
);

drop policy if exists "Read permitted submission file metadata" on public.assignment_submission_files;
create policy "Read permitted submission file metadata"
on public.assignment_submission_files for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    (select auth.jwt()) ->> 'aal' = 'aal2'
    and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  )
);

drop policy if exists "Read permitted assignments" on public.assignments;
create policy "Read permitted assignments"
on public.assignments for select to authenticated
using (
  user_id = (select auth.uid())
  or assigned_to = (select auth.uid())
  or (
    (select auth.jwt()) ->> 'aal' = 'aal2'
    and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  )
);

drop policy if exists "Create permitted assignments" on public.assignments;
create policy "Create permitted assignments"
on public.assignments for insert to authenticated
with check (
  user_id = (select auth.uid())
  or (
    (select auth.jwt()) ->> 'aal' = 'aal2'
    and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
    and assigned_by = (select auth.uid())
  )
);

-- Assigned students must not edit the teacher-owned assignment row or reassign it.
drop policy if exists "Update permitted assignments" on public.assignments;
create policy "Update permitted assignments"
on public.assignments for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Read permitted courses" on public.courses;
create policy "Read permitted courses"
on public.courses for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    (select auth.jwt()) ->> 'aal' = 'aal2'
    and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  )
  or exists (
    select 1 from public.assignments a
    where a.course_id = courses.id
      and a.assigned_to = (select auth.uid())
  )
);

drop policy if exists "Read permitted quizzes" on public.quizzes;
create policy "Read permitted quizzes"
on public.quizzes for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    (select auth.jwt()) ->> 'aal' = 'aal2'
    and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  )
);
