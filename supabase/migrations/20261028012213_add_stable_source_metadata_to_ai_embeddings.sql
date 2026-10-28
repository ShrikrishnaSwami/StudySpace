-- The source metadata columns were consolidated into
-- 20261028000001_ai_tutor_learning_signals_and_source_cache.sql.
-- IF NOT EXISTS keeps this historical migration safe on clean installs.
ALTER TABLE public.studyspace_ai_embeddings
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS source_type text;

CREATE INDEX IF NOT EXISTS studyspace_ai_embeddings_source_idx
  ON public.studyspace_ai_embeddings (user_id, source_type, source_id, model)
  WHERE source_id IS NOT NULL AND source_type IS NOT NULL;
