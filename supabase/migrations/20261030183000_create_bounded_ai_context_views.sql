-- Bounded, security-invoker views keep large student text fields from
-- being transferred wholesale into every AI request. Underlying RLS policies
-- still run as the calling authenticated user.
CREATE OR REPLACE VIEW public.ai_context_course_notes
WITH (security_invoker = true) AS
SELECT id, user_id, course_id, left(title, 200) AS title,
       left(content, 2200) AS content, left(unit_name, 120) AS unit_name,
       left(category, 80) AS category, created_at
FROM public.course_notes;

CREATE OR REPLACE VIEW public.ai_context_course_resources
WITH (security_invoker = true) AS
SELECT id, user_id, course_id, left(title, 200) AS title,
       left(description, 1000) AS description, left(url, 500) AS url,
       left(unit_name, 120) AS unit_name, left(category, 80) AS category,
       created_at
FROM public.course_resources;

CREATE OR REPLACE VIEW public.ai_context_assignments
WITH (security_invoker = true) AS
SELECT id, user_id, course_id, left(title, 200) AS title,
       left(description, 1600) AS description, due_date, priority, status,
       progress, points, max_points
FROM public.assignments;

CREATE OR REPLACE VIEW public.ai_context_quizzes
WITH (security_invoker = true) AS
SELECT id, user_id, course_id, left(title, 200) AS title, difficulty, created_at
FROM public.quizzes;

CREATE OR REPLACE VIEW public.ai_context_quiz_attempts
WITH (security_invoker = true) AS
SELECT id, user_id, quiz_id, score, correct_count, total_questions,
       completed_at, created_at
FROM public.quiz_attempts;

CREATE OR REPLACE VIEW public.ai_context_homework
WITH (security_invoker = true) AS
SELECT id, user_id, course_id, assignment_id, left(title, 200) AS title,
       left(description, 1200) AS description, left(file_name, 200) AS file_name,
       file_type, status, left(ai_summary, 900) AS ai_summary,
       left(ai_solution, 900) AS ai_solution,
       left(ai_explanation, 900) AS ai_explanation,
       left(ai_hints::text, 1200) AS ai_hints, created_at, updated_at
FROM public.homework;

CREATE OR REPLACE VIEW public.ai_context_calendar_events
WITH (security_invoker = true) AS
SELECT id, user_id, left(title, 200) AS title, left(subtitle, 300) AS subtitle,
       left(description, 700) AS description, start_at, end_at, event_type,
       left(location, 200) AS location, course_id, left(notes, 500) AS notes,
       multitask, enabled, created_at
FROM public.calendar_events;

REVOKE ALL ON public.ai_context_course_notes,
  public.ai_context_course_resources,
  public.ai_context_assignments,
  public.ai_context_quizzes,
  public.ai_context_quiz_attempts,
  public.ai_context_homework,
  public.ai_context_calendar_events
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.ai_context_course_notes,
  public.ai_context_course_resources,
  public.ai_context_assignments,
  public.ai_context_quizzes,
  public.ai_context_quiz_attempts,
  public.ai_context_homework,
  public.ai_context_calendar_events
TO authenticated;
