-- Keep the semantic embedding cache maintainable and linkable to source records.
alter table public.studyspace_ai_embeddings
  add column if not exists last_used_at timestamptz not null default now(),
  add column if not exists source_id text,
  add column if not exists source_type text;

update public.studyspace_ai_embeddings
set last_used_at = coalesce(updated_at, created_at, now())
where last_used_at is null;

create index if not exists studyspace_ai_embeddings_user_last_used_idx
  on public.studyspace_ai_embeddings (user_id, last_used_at);

create index if not exists studyspace_ai_embeddings_source_idx
  on public.studyspace_ai_embeddings (user_id, source_type, source_id, model)
  where source_id is not null and source_type is not null;

-- Human quality signals for future evaluation. These ratings do not train model weights.
create table if not exists public.ai_tutor_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ai_tutor_conversations(id) on delete cascade,
  message_key text not null,
  rating smallint not null check (rating in (-1, 1)),
  reason text not null default 'general'
    check (reason in ('general','incorrect','unclear','not_relevant','helpful','well_explained')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, message_key)
);

create index if not exists ai_tutor_feedback_user_created_idx
  on public.ai_tutor_feedback (user_id, created_at desc);

alter table public.ai_tutor_feedback enable row level security;

drop policy if exists "Users can read their own AI tutor feedback" on public.ai_tutor_feedback;
create policy "Users can read their own AI tutor feedback"
  on public.ai_tutor_feedback for select
  using (auth.uid() = user_id);

drop policy if exists "Users can add their own AI tutor feedback" on public.ai_tutor_feedback;
create policy "Users can add their own AI tutor feedback"
  on public.ai_tutor_feedback for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ai_tutor_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own AI tutor feedback" on public.ai_tutor_feedback;
create policy "Users can update their own AI tutor feedback"
  on public.ai_tutor_feedback for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ai_tutor_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
