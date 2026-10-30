CREATE OR REPLACE VIEW public.ai_context_courses
WITH (security_invoker = true) AS
SELECT id, user_id, left(code, 80) AS code, left(name, 200) AS name,
       left(professor, 160) AS professor, left(room, 100) AS room,
       left(schedule, 300) AS schedule, progress, left(description, 1000) AS description,
       target_grade, credits, left(semester, 100) AS semester, archived
FROM public.courses;

REVOKE ALL ON public.ai_context_courses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ai_context_courses TO authenticated;
