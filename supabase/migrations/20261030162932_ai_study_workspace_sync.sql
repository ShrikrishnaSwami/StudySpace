create table if not exists public.ai_study_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nodes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint ai_study_workspaces_nodes_array_check check (jsonb_typeof(nodes) = 'array')
);

alter table public.ai_study_workspaces enable row level security;
revoke all on public.ai_study_workspaces from anon;
grant select, insert, update, delete on public.ai_study_workspaces to authenticated;

drop policy if exists "Students manage their own AI study workspace" on public.ai_study_workspaces;
create policy "Students manage their own AI study workspace"
on public.ai_study_workspaces
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
