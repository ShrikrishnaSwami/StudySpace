-- The user-facing rate-limit RPC must not let callers invent route keys or
-- choose arbitrarily large limits. Only trusted app route keys are accepted;
-- the database owns each route's actual limit and rolling window.
CREATE OR REPLACE FUNCTION public.consume_my_api_rate_limit(
  p_route_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (
  allowed boolean,
  used integer,
  remaining integer,
  reset_at timestamptz
)
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
  SELECT *
  FROM public.consume_api_rate_limit(caller_id, p_route_key, trusted_limit, trusted_window);
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_my_api_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_my_api_rate_limit(text, integer, integer) TO authenticated;
