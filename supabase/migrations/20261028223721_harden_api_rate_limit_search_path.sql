-- The privileged rate-limit function references public tables explicitly and
-- uses an empty search_path to prevent object shadowing in SECURITY DEFINER code.
CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_user_id uuid,
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
  v_used integer;
  v_reset_at timestamptz;
BEGIN
  IF p_user_id IS NULL
     OR p_route_key IS NULL
     OR pg_catalog.length(p_route_key) < 1
     OR pg_catalog.length(p_route_key) > 100
     OR p_limit < 1
     OR p_limit > 10000
     OR p_window_seconds < 1
     OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid API rate limit request';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text || ':' || p_route_key, 0)
  );

  SELECT pg_catalog.count(*)::integer,
         pg_catalog.min(e.created_at) + pg_catalog.make_interval(secs => p_window_seconds)
    INTO v_used, v_reset_at
    FROM public.api_rate_limit_events e
   WHERE e.user_id = p_user_id
     AND e.route_key = p_route_key
     AND e.created_at >= pg_catalog.now() - pg_catalog.make_interval(secs => p_window_seconds);

  IF v_used >= p_limit THEN
    RETURN QUERY SELECT false, v_used, 0,
      pg_catalog.coalesce(v_reset_at, pg_catalog.now() + pg_catalog.make_interval(secs => p_window_seconds));
    RETURN;
  END IF;

  INSERT INTO public.api_rate_limit_events(user_id, route_key)
  VALUES (p_user_id, p_route_key);

  v_used := v_used + 1;
  RETURN QUERY SELECT true, v_used, pg_catalog.greatest(0, p_limit - v_used),
    pg_catalog.coalesce(v_reset_at, pg_catalog.now() + pg_catalog.make_interval(secs => p_window_seconds));
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(uuid, text, integer, integer) TO service_role;
