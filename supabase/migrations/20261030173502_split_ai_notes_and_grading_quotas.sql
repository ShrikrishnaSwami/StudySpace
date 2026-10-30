-- Separate note extraction and assignment grading from general homework analysis.
-- This keeps rolling limits and reporting aligned with the actual AI operation.

ALTER TABLE public.ai_usage_events
  DROP CONSTRAINT IF EXISTS ai_usage_events_feature_check;

ALTER TABLE public.ai_usage_events
  ADD CONSTRAINT ai_usage_events_feature_check
  CHECK (feature IN ('tutor', 'quiz', 'flashcards', 'homework', 'notes', 'grading', 'syllabus', 'recommendations'));

CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_user_id uuid,
  p_feature text,
  p_limit integer
)
RETURNS TABLE(
  allowed boolean,
  used integer,
  remaining integer,
  limit_count integer,
  reset_at timestamptz,
  scope text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_used integer;
  v_user_reset_at timestamptz;
  v_global_used integer;
  v_global_reset_at timestamptz;
  v_total_used integer;
  v_total_reset_at timestamptz;
  v_global_limit integer;
  v_total_limit integer := 1500;
BEGIN
  IF p_user_id IS NULL
     OR p_feature IS NULL
     OR p_limit < 1
     OR p_limit > 1000
     OR p_feature NOT IN ('tutor','quiz','flashcards','homework','notes','grading','syllabus','recommendations') THEN
    RAISE EXCEPTION 'Invalid AI quota request';
  END IF;

  v_global_limit := CASE p_feature
    WHEN 'tutor' THEN 1000
    WHEN 'quiz' THEN 300
    WHEN 'flashcards' THEN 500
    WHEN 'homework' THEN 300
    WHEN 'notes' THEN 200
    WHEN 'grading' THEN 150
    WHEN 'syllabus' THEN 150
    WHEN 'recommendations' THEN 300
  END;

  -- A consistent global -> feature -> user lock order prevents quota races and deadlocks.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('global:all-ai', 0));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('global:' || p_feature, 0));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text || ':' || p_feature, 0));

  SELECT count(*)::integer, min(e.created_at) + interval '24 hours'
    INTO v_user_used, v_user_reset_at
    FROM public.ai_usage_events e
   WHERE e.user_id = p_user_id
     AND e.feature = p_feature
     AND e.created_at >= now() - interval '24 hours';

  IF v_user_used >= p_limit THEN
    RETURN QUERY SELECT false, v_user_used, 0, p_limit,
      coalesce(v_user_reset_at, now() + interval '24 hours'), 'user'::text;
    RETURN;
  END IF;

  SELECT count(*)::integer, min(e.created_at) + interval '24 hours'
    INTO v_total_used, v_total_reset_at
    FROM public.ai_usage_events e
   WHERE e.created_at >= now() - interval '24 hours';

  IF v_total_used >= v_total_limit THEN
    RETURN QUERY SELECT false, v_user_used, 0, p_limit,
      coalesce(v_total_reset_at, now() + interval '24 hours'), 'global'::text;
    RETURN;
  END IF;

  SELECT count(*)::integer, min(e.created_at) + interval '24 hours'
    INTO v_global_used, v_global_reset_at
    FROM public.ai_usage_events e
   WHERE e.feature = p_feature
     AND e.created_at >= now() - interval '24 hours';

  IF v_global_used >= v_global_limit THEN
    RETURN QUERY SELECT false, v_user_used, 0, p_limit,
      coalesce(v_global_reset_at, now() + interval '24 hours'), 'global'::text;
    RETURN;
  END IF;

  INSERT INTO public.ai_usage_events(user_id, feature) VALUES (p_user_id, p_feature);
  v_user_used := v_user_used + 1;

  RETURN QUERY SELECT true, v_user_used, greatest(0, p_limit - v_user_used), p_limit,
    coalesce(v_user_reset_at, now() + interval '24 hours'), 'user'::text;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_ai_quota_for_user(p_feature text)
RETURNS TABLE(allowed boolean, used integer, remaining integer, limit_count integer, reset_at timestamptz, scope text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  trusted_limit integer;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  trusted_limit := CASE p_feature
    WHEN 'tutor' THEN 40
    WHEN 'quiz' THEN 15
    WHEN 'flashcards' THEN 15
    WHEN 'homework' THEN 20
    WHEN 'notes' THEN 15
    WHEN 'grading' THEN 10
    WHEN 'syllabus' THEN 10
    WHEN 'recommendations' THEN 20
    ELSE NULL
  END;

  IF trusted_limit IS NULL THEN
    RAISE EXCEPTION 'Invalid AI feature' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT * FROM public.consume_ai_quota(caller_id, p_feature, trusted_limit);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_ai_usage()
RETURNS TABLE(feature text, limit_count integer, used integer, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH limits(feature, limit_count) AS (
    VALUES
      ('tutor'::text, 40),
      ('quiz'::text, 15),
      ('flashcards'::text, 15),
      ('homework'::text, 20),
      ('notes'::text, 15),
      ('grading'::text, 10),
      ('syllabus'::text, 10),
      ('recommendations'::text, 20)
  ),
  counts AS (
    SELECT e.feature, count(*)::integer AS used
    FROM public.ai_usage_events e
    WHERE e.user_id = caller_id
      AND e.created_at >= now() - interval '24 hours'
    GROUP BY e.feature
  )
  SELECT l.feature, l.limit_count, coalesce(c.used, 0),
    greatest(0, l.limit_count - coalesce(c.used, 0))
  FROM limits l
  LEFT JOIN counts c ON c.feature = l.feature
  ORDER BY l.feature;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_my_api_rate_limit(
  p_route_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE(allowed boolean, used integer, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  trusted_limit integer;
  trusted_window integer;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  CASE p_route_key
    WHEN 'ai-tutor' THEN trusted_limit := 8; trusted_window := 600;
    WHEN 'ai-quiz' THEN trusted_limit := 4; trusted_window := 600;
    WHEN 'ai-flashcards' THEN trusted_limit := 4; trusted_window := 600;
    WHEN 'ai-homework' THEN trusted_limit := 4; trusted_window := 600;
    WHEN 'ai-notes' THEN trusted_limit := 3; trusted_window := 600;
    WHEN 'ai-grading' THEN trusted_limit := 2; trusted_window := 600;
    WHEN 'ai-syllabus' THEN trusted_limit := 3; trusted_window := 600;
    WHEN 'ai-recommendations' THEN trusted_limit := 3; trusted_window := 600;
    WHEN 'usage-read' THEN trusted_limit := 120; trusted_window := 3600;
    WHEN 'data-export' THEN trusted_limit := 3; trusted_window := 3600;
    WHEN 'quiz-read' THEN trusted_limit := 180; trusted_window := 600;
    WHEN 'quiz-submit' THEN trusted_limit := 30; trusted_window := 3600;
    WHEN 'study-group-join' THEN trusted_limit := 10; trusted_window := 600;
    WHEN 'account-delete' THEN trusted_limit := 3; trusted_window := 3600;
    WHEN 'assignment-ai-grade' THEN trusted_limit := 5; trusted_window := 600;
    ELSE
      RAISE EXCEPTION 'Invalid rate limit route' USING ERRCODE = '22023';
  END CASE;

  -- Supplied numeric arguments are deliberately ignored. The server-side
  -- allowlist above is the only source of limits and windows.
  RETURN QUERY
  SELECT * FROM public.consume_api_rate_limit(caller_id, p_route_key, trusted_limit, trusted_window);
END;
$function$;
