create table if not exists public.grade_items (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 title text not null,
 category text not null default 'assignment' check (category in ('assignment','quiz','exam','lab','project','participation','other')),
 earned_points numeric not null default 0 check (earned_points >= 0),
 possible_points numeric not null check (possible_points > 0),
 weight numeric check (weight is null or (weight >= 0 and weight <= 100)),
 assessment_date date,
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint grade_items_earned_not_over_possible check (earned_points <= possible_points)
);
create index if not exists grade_items_user_course_idx on public.grade_items(user_id,course_id,assessment_date desc);
alter table public.grade_items enable row level security;
revoke all on public.grade_items from anon;
grant select,insert,update,delete on public.grade_items to authenticated;
create policy "Students read their own grade items" on public.grade_items for select to authenticated using ((select auth.uid())=user_id);
create policy "Students add grade items to their own courses" on public.grade_items for insert to authenticated with check ((select auth.uid())=user_id and exists(select 1 from public.courses c where c.id=course_id and c.user_id=(select auth.uid())));
create policy "Students update their own grade items" on public.grade_items for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id and exists(select 1 from public.courses c where c.id=course_id and c.user_id=(select auth.uid())));
create policy "Students delete their own grade items" on public.grade_items for delete to authenticated using ((select auth.uid())=user_id);
