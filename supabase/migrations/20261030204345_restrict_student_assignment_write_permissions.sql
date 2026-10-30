-- Limit direct student writes to fields they legitimately own.
-- AI grading and authoritative grade fields remain server-managed.

REVOKE UPDATE ON TABLE public.assignment_submissions FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status, submission_note, submitted_at, updated_at)
  ON TABLE public.assignment_submissions TO authenticated;

-- These tables are append/delete-only from the student client.
REVOKE UPDATE ON TABLE public.ai_tutor_messages FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON TABLE public.assignment_attachments FROM PUBLIC, anon, authenticated;

-- A message must belong to a conversation owned by the same authenticated user.
DROP POLICY IF EXISTS "Users can create own AI messages" ON public.ai_tutor_messages;
CREATE POLICY "Users can create own AI messages"
  ON public.ai_tutor_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.ai_tutor_conversations c
      WHERE c.id = ai_tutor_messages.conversation_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- Attachment metadata must belong to an assignment the student owns or is assigned to.
DROP POLICY IF EXISTS "Users can create their own assignment attachments" ON public.assignment_attachments;
CREATE POLICY "Users can create their own assignment attachments"
  ON public.assignment_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = assignment_attachments.assignment_id
        AND (
          a.user_id = (SELECT auth.uid())
          OR a.assigned_to = (SELECT auth.uid())
        )
    )
  );
