-- The final cache schema was consolidated into 20261028000001_ai_tutor_learning_signals_and_source_cache.sql.
-- Keep this historical migration idempotent so clean installs and the live migration ledger agree.
ALTER TABLE public.studyspace_ai_embeddings
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz NOT NULL DEFAULT now();

UPDATE public.studyspace_ai_embeddings
SET last_used_at = coalesce(updated_at, created_at, now())
WHERE last_used_at IS NULL;

CREATE INDEX IF NOT EXISTS studyspace_ai_embeddings_user_last_used_idx
  ON public.studyspace_ai_embeddings (user_id, last_used_at);
