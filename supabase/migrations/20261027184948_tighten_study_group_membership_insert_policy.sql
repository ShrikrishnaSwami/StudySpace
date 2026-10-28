drop policy if exists "Users add own membership without recursive RLS" on public.study_group_members;
create policy "Group owners add initial membership without recursion"
on public.study_group_members
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and private.study_group_is_owned_by_current_user(group_id)
);
revoke all on function private.study_group_exists(uuid) from public, anon, authenticated;
