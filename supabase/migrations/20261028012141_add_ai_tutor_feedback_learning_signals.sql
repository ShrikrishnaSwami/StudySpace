-- Persist explicit quality signals for AI tutor responses. Feedback is used for evaluation,
-- not automatic model-weight training.
CREATE TABLE IF NOT EXISTS public.ai_tutor_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.ai_tutor_conversations(id) ON DELETE CASCADE,
  message_key text NOT NULL,
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  reason text NOT NULL DEFAULT 'general'
    CHECK (reason IN ('general','incorrect','unclear','not_relevant','helpful','well_explained')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_key)
);
CREATE INDEX IF NOT EXISTS ai_tutor_feedback_user_created_idx
  ON public.ai_tutor_feedback (user_id, created_at DESC);
ALTER TABLE public.ai_tutor_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own AI tutor feedback" ON public.ai_tutor_feedback;
CREATE POLICY "Users can read their own AI tutor feedback" ON public.ai_tutor_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can add their own AI tutor feedback" ON public.ai_tutor_feedback;
CREATE POLICY "Users can add their own AI tutor feedback" ON public.ai_tutor_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.ai_tutor_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update their own AI tutor feedback" ON public.ai_tutor_feedback;
CREATE POLICY "Users can update their own AI tutor feedback" ON public.ai_tutor_feedback FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.ai_tutor_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
