-- Restrict submission file metadata to paths inside the authenticated student's storage folder.
drop policy if exists "Users add own submission files" on public.assignment_submission_files;
create policy "Users add own submission files"
on public.assignment_submission_files
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and storage_path like ((select auth.uid())::text || '/%')
  and exists (
    select 1
    from public.assignment_submissions s
    where s.id = assignment_submission_files.submission_id
      and s.user_id = (select auth.uid())
      and s.status <> 'submitted'
  )
);
