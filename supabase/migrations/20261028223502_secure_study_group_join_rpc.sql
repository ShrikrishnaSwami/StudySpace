-- Joining by invite code is an intentional capability, but looking up groups
-- through a service-role client bypasses RLS and requires a production secret.
-- Expose a narrowly scoped RPC that derives the joining user from auth.uid().
CREATE OR REPLACE FUNCTION public.join_study_group_by_invite(p_invite_code text)
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  normalized_code text := upper(btrim(coalesce(p_invite_code, '')));
  target_group_id uuid;
  target_group_name text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF normalized_code !~ '^(?:[A-Z0-9]{8}|[A-Z0-9]{16})$' THEN
    RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = '22023';
  END IF;

  SELECT g.id, g.name
    INTO target_group_id, target_group_name
    FROM public.study_groups g
   WHERE upper(g.invite_code) = normalized_code;

  IF target_group_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.study_group_members(group_id, user_id, role)
  VALUES (target_group_id, caller_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN QUERY SELECT target_group_id, target_group_name;
END;
$function$;

REVOKE ALL ON FUNCTION public.join_study_group_by_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_study_group_by_invite(text) TO authenticated;
