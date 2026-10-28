-- Compatibility for the last successfully built web deployment, whose quota
-- helper sends p_limit. Ignore that caller-supplied value and delegate to the
-- one-argument wrapper, which enforces the trusted per-feature ceiling.
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
  FROM public.consume_ai_quota_for_user(p_feature);
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_ai_quota_for_user(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota_for_user(text, integer) TO authenticated;
