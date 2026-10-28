create schema if not exists private;

create or replace function private.study_group_is_owned_by_current_user(target_group_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.study_groups g
    where g.id = target_group_id and g.owner_id = (select auth.uid())
  );
$$;

create or replace function private.study_group_exists(target_group_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.study_groups g where g.id = target_group_id);
$$;

revoke all on function private.study_group_is_owned_by_current_user(uuid) from public, anon;
revoke all on function private.study_group_exists(uuid) from public, anon;
grant execute on function private.study_group_is_owned_by_current_user(uuid) to authenticated;
grant execute on function private.study_group_exists(uuid) to authenticated;

drop policy if exists "Group owners add initial membership" on public.study_group_members;
create policy "Users add own membership without recursive RLS"
on public.study_group_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    (role = 'owner' and private.study_group_is_owned_by_current_user(group_id))
    or (role = 'member' and private.study_group_exists(group_id))
  )
);
