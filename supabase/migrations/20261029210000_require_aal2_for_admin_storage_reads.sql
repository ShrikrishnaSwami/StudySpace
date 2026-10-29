drop policy if exists "Admins download submitted files" on storage.objects;
create policy "Admins download submitted files"
on storage.objects for select to authenticated
using (
  bucket_id = 'assignment-submissions'
  and coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
);