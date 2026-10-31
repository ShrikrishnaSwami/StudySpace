REVOKE SELECT ON TABLE
  public.ai_context_assignments,
  public.ai_context_calendar_events,
  public.ai_context_course_notes,
  public.ai_context_course_resources,
  public.ai_context_courses,
  public.ai_context_homework,
  public.ai_context_quiz_attempts,
  public.ai_context_quizzes
FROM anon, PUBLIC;
