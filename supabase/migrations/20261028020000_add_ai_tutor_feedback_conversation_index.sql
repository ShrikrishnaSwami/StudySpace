-- Keep feedback lookups and conversation joins efficient as tutor feedback grows.
create index if not exists ai_tutor_feedback_conversation_id_idx
  on public.ai_tutor_feedback (conversation_id);
