CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  since_24h timestamptz := now() - interval '24 hours';
  since_7d timestamptz := now() - interval '7 days';
  result jsonb;
BEGIN
  -- This function is callable only by service_role. The HTTP admin route
  -- validates the user, verified email, trusted app_metadata role, and AAL2
  -- before using the server-only key to invoke it.
  SELECT jsonb_build_object(
    'totalUsers', (SELECT count(*) FROM auth.users),
    'aiRequests24h', (
      SELECT count(*) FROM public.ai_usage_events WHERE created_at >= since_24h
    ),
    'aiFeedback7d', (
      SELECT count(*) FROM public.ai_tutor_feedback WHERE created_at >= since_7d
    ),
    'aiHelpful7d', (
      SELECT count(*) FROM public.ai_tutor_feedback WHERE created_at >= since_7d AND rating = 1
    ),
    'aiUnhelpful7d', (
      SELECT count(*) FROM public.ai_tutor_feedback WHERE created_at >= since_7d AND rating = -1
    ),
    'generatedAt', now()
  ) INTO result;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO service_role;
