CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  caller_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  caller_aal text := coalesce(auth.jwt() ->> 'aal', 'aal1');
  since_24h timestamptz := now() - interval '24 hours';
  since_7d timestamptz := now() - interval '7 days';
  result jsonb;
BEGIN
  IF caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Administrator access required'
      USING ERRCODE = '42501';
  END IF;

  IF caller_aal <> 'aal2' THEN
    RAISE EXCEPTION 'Administrator multi-factor authentication required'
      USING ERRCODE = '42501';
  END IF;

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
