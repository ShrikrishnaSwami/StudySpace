-- Link embedding cache entries to stable source records for safe per-source invalidation.
ALTER TABLE public.studyspace_ai_embeddings
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS source_type text;
CREATE INDEX IF NOT EXISTS studyspace_ai_embeddings_source_idx
  ON public.studyspace_ai_embeddings (user_id, source_type, source_id, model)
  WHERE source_id IS NOT NULL AND source_type IS NOT NULL;
