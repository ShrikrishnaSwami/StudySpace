-- Guest sessions remain available for personal study, but shared study groups
-- require a registered account. This prevents disposable anonymous sessions from
-- joining an invite and reading collaborative student content.
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

  IF coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' THEN
    RAISE EXCEPTION 'Create an account to join study groups' USING ERRCODE = '42501';
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

DROP POLICY IF EXISTS "Students create their own study groups" ON public.study_groups;
CREATE POLICY "Students create their own study groups"
ON public.study_groups FOR INSERT TO authenticated
WITH CHECK (
  owner_id = (SELECT auth.uid())
  AND coalesce((SELECT auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
);

DROP POLICY IF EXISTS "Members can view study groups" ON public.study_groups;
CREATE POLICY "Members can view study groups"
ON public.study_groups FOR SELECT TO authenticated
USING (
  coalesce((SELECT auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  AND (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = study_groups.id AND m.user_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Owners update their study groups" ON public.study_groups;
CREATE POLICY "Owners update their study groups"
ON public.study_groups FOR UPDATE TO authenticated
USING (
  coalesce((SELECT auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  AND owner_id = (SELECT auth.uid())
)
WITH CHECK (
  coalesce((SELECT auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  AND owner_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Group owners add initial membership without recursion" ON public.study_group_members;
CREATE POLICY "Group owners add initial membership without recursion"
ON public.study_group_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND role = 'owner'
  AND coalesce((SELECT auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  AND private.study_group_is_owned_by_current_user(group_id)
);

DROP POLICY IF EXISTS "Group members create posts" ON public.study_group_posts;
CREATE POLICY "Group members create posts"
ON public.study_group_posts FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND coalesce((SELECT auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  AND EXISTS (
    SELECT 1 FROM public.study_group_members m
    WHERE m.group_id = study_group_posts.group_id AND m.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Group members read posts" ON public.study_group_posts;
CREATE POLICY "Group members read posts"
ON public.study_group_posts FOR SELECT TO authenticated
USING (
  coalesce((SELECT auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  AND EXISTS (
    SELECT 1 FROM public.study_group_members m
    WHERE m.group_id = study_group_posts.group_id AND m.user_id = (SELECT auth.uid())
  )
);
