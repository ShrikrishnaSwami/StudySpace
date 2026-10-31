-- Keep direct student writes limited to the submission workflow.
-- AI feedback, official grades, tutor messages, and attachment metadata are server-owned.
REVOKE UPDATE ON TABLE public.assignment_submissions FROM anon, authenticated, PUBLIC;
REVOKE UPDATE (id, assignment_id, user_id, attempt_number, status, submission_note, submitted_at, created_at, updated_at, grade, feedback, graded_at, graded_by, ai_grade, ai_feedback, ai_graded_at)
  ON TABLE public.assignment_submissions FROM anon, authenticated, PUBLIC;
GRANT UPDATE (status, submission_note, submitted_at, updated_at)
  ON TABLE public.assignment_submissions TO authenticated;

REVOKE UPDATE ON TABLE public.ai_tutor_messages FROM anon, authenticated, PUBLIC;
REVOKE UPDATE (id, conversation_id, user_id, role, content, created_at)
  ON TABLE public.ai_tutor_messages FROM anon, authenticated, PUBLIC;

REVOKE UPDATE ON TABLE public.assignment_attachments FROM anon, authenticated, PUBLIC;
REVOKE UPDATE (id, assignment_id, user_id, file_name, storage_path, file_type, file_size, created_at, attachment_kind)
  ON TABLE public.assignment_attachments FROM anon, authenticated, PUBLIC;
