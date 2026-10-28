-- Allow a signed-in user to consume only their own AI quota without requiring
-- the web server to hold a service-role key. The SECURITY DEFINER wrappers derive
-- the user id from the verified JWT; clients cannot choose another user id.
CREATE OR REPLACE FUNCTION public.consume_ai_quota_for_user(
  p_feature text,
  p_limit integer
)
RETURNS TABLE (
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.consume_ai_quota(auth.uid(), p_feature, p_limit);
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_ai_quota_for_user(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota_for_user(text, integer) TO authenticated;

-- Read-only usage summary bound to the caller's JWT. This keeps usage pages
-- functional without exposing the private ai_usage_events table to users.
CREATE OR REPLACE FUNCTION public.get_my_ai_usage()
RETURNS TABLE (
  feature text,
  limit_count integer,
  used integer,
  remaining integer
)
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

REVOKE ALL ON FUNCTION public.get_my_ai_usage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_ai_usage() TO authenticated;

-- User-scoped rolling-window API rate limit. The caller identity is always
-- derived from auth.uid(); p_user_id is deliberately not accepted from clients.
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.consume_api_rate_limit(auth.uid(), p_route_key, p_limit, p_window_seconds);
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_my_api_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_my_api_rate_limit(text, integer, integer) TO authenticated;
