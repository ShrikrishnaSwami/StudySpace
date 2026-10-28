-- Feedback is private student data. Scope these policies to authenticated
-- Supabase users (including anonymous-auth sessions), not the PUBLIC role.
DROP POLICY IF EXISTS "Users can add their own AI tutor feedback" ON public.ai_tutor_feedback;
DROP POLICY IF EXISTS "Users can read their own AI tutor feedback" ON public.ai_tutor_feedback;
DROP POLICY IF EXISTS "Users can update their own AI tutor feedback" ON public.ai_tutor_feedback;

CREATE POLICY "Users can add their own AI tutor feedback"
ON public.ai_tutor_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1
    FROM public.ai_tutor_conversations c
    WHERE c.id = ai_tutor_feedback.conversation_id
      AND c.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can read their own AI tutor feedback"
ON public.ai_tutor_feedback
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own AI tutor feedback"
ON public.ai_tutor_feedback
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1
    FROM public.ai_tutor_conversations c
    WHERE c.id = ai_tutor_feedback.conversation_id
      AND c.user_id = (SELECT auth.uid())
  )
);
