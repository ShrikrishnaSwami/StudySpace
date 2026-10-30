drop policy if exists "Members can view group membership" on public.study_group_members;
create policy "Users can view their own group membership" on public.study_group_members for select to authenticated using(user_id=(select auth.uid()));
