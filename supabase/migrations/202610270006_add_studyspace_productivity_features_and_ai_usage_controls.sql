alter table public.flashcards
  add column if not exists due_at timestamptz not null default now(),
  add column if not exists interval_days integer not null default 0,
  add column if not exists ease_factor numeric(4,2) not null default 2.50,
  add column if not exists repetitions integer not null default 0,
  add column if not exists last_reviewed_at timestamptz;

create table if not exists public.syllabus_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  source_name text,
  extracted_text text,
  extracted_events jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','reviewed','imported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.syllabus_imports enable row level security;
drop policy if exists "Users manage own syllabus imports" on public.syllabus_imports;
create policy "Users manage own syllabus imports" on public.syllabus_imports
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create index if not exists syllabus_imports_user_created_idx on public.syllabus_imports(user_id, created_at desc);

create table if not exists public.ai_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('tutor','quiz','flashcards','homework','syllabus','recommendations')),
  created_at timestamptz not null default now(),
  request_id text
);
alter table public.ai_usage_events enable row level security;
revoke all on public.ai_usage_events from anon, authenticated;
grant all on public.ai_usage_events to service_role;
create index if not exists ai_usage_events_user_feature_created_idx on public.ai_usage_events(user_id, feature, created_at desc);
create index if not exists ai_usage_events_created_idx on public.ai_usage_events(created_at);

create table if not exists public.study_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  assignment_id uuid references public.assignments(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned','completed','skipped')),
  source text not null default 'smart_planner' check (source in ('smart_planner','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_plan_items_time_order check (ends_at > starts_at)
);
alter table public.study_plan_items enable row level security;
drop policy if exists "Users manage own study plan items" on public.study_plan_items;
create policy "Users manage own study plan items" on public.study_plan_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create index if not exists study_plan_items_user_starts_idx on public.study_plan_items(user_id, starts_at);
create index if not exists study_plan_items_assignment_idx on public.study_plan_items(assignment_id);

create table if not exists public.studyspace_feature_flags (
  key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.studyspace_feature_flags enable row level security;
revoke all on public.studyspace_feature_flags from anon, authenticated;
grant all on public.studyspace_feature_flags to service_role;
