create extension if not exists vector with schema extensions;

create table if not exists public.studyspace_ai_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_hash text not null,
  model text not null,
  source_label text not null default '',
  embedding extensions.vector(768) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studyspace_ai_embeddings_user_hash_model_key unique (user_id, content_hash, model)
);

create index if not exists studyspace_ai_embeddings_user_model_idx
  on public.studyspace_ai_embeddings (user_id, model);

alter table public.studyspace_ai_embeddings enable row level security;

grant select, insert, update, delete on public.studyspace_ai_embeddings to authenticated;

drop policy if exists "Users can read their own StudySpace embeddings" on public.studyspace_ai_embeddings;
create policy "Users can read their own StudySpace embeddings"
  on public.studyspace_ai_embeddings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own StudySpace embeddings" on public.studyspace_ai_embeddings;
create policy "Users can insert their own StudySpace embeddings"
  on public.studyspace_ai_embeddings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own StudySpace embeddings" on public.studyspace_ai_embeddings;
create policy "Users can update their own StudySpace embeddings"
  on public.studyspace_ai_embeddings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own StudySpace embeddings" on public.studyspace_ai_embeddings;
create policy "Users can delete their own StudySpace embeddings"
  on public.studyspace_ai_embeddings for delete
  to authenticated
  using ((select auth.uid()) = user_id);
