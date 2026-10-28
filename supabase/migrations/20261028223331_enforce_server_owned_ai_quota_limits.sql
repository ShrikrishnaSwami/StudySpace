-- Never accept a client-supplied daily quota. The feature determines its own
-- ceiling inside the database, so calling the RPC directly cannot raise limits.
DROP FUNCTION IF EXISTS public.consume_ai_quota_for_user(text, integer);

CREATE FUNCTION public.consume_ai_quota_for_user(p_feature text)
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
    WHEN 'syllabus' THEN 10
    WHEN 'recommendations' THEN 20
    ELSE NULL
  END;

  IF trusted_limit IS NULL THEN
    RAISE EXCEPTION 'Invalid AI feature' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.consume_ai_quota(caller_id, p_feature, trusted_limit);
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_ai_quota_for_user(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota_for_user(text) TO authenticated;
