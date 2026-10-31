-- Owner AI quota exemption and private in-app beta bug reports.
-- The administrator bypasses personal quotas and burst throttles, but still
-- consumes shared AI capacity so the app-wide provider budget remains bounded.

CREATE OR REPLACE FUNCTION public.consume_admin_ai_quota(p_feature text)
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
SET search_path = ''
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  v_global_used integer;
  v_global_reset_at timestamptz;
  v_total_used integer;
  v_total_reset_at timestamptz;
  v_global_limit integer;
  v_total_limit integer := 1500;
BEGIN
  IF caller_id IS NULL
     OR coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
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
    ELSE NULL
  END;

  IF v_global_limit IS NULL THEN
    RAISE EXCEPTION 'Invalid AI feature' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('global:all-ai', 0));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('global:' || p_feature, 0));

  SELECT count(*)::integer, min(e.created_at) + interval '24 hours'
    INTO v_total_used, v_total_reset_at
    FROM public.ai_usage_events e
   WHERE e.created_at >= now() - interval '24 hours';

  IF v_total_used >= v_total_limit THEN
    RETURN QUERY SELECT false, v_total_used, 0, v_total_limit,
      coalesce(v_total_reset_at, now() + interval '24 hours'), 'global'::text;
    RETURN;
  END IF;

  SELECT count(*)::integer, min(e.created_at) + interval '24 hours'
    INTO v_global_used, v_global_reset_at
    FROM public.ai_usage_events e
   WHERE e.feature = p_feature
     AND e.created_at >= now() - interval '24 hours';

  IF v_global_used >= v_global_limit THEN
    RETURN QUERY SELECT false, v_global_used, 0, v_global_limit,
      coalesce(v_global_reset_at, now() + interval '24 hours'), 'global'::text;
    RETURN;
  END IF;

  INSERT INTO public.ai_usage_events(user_id, feature) VALUES (caller_id, p_feature);
  v_global_used := v_global_used + 1;

  RETURN QUERY SELECT true, v_global_used, greatest(0, v_global_limit - v_global_used),
    v_global_limit, coalesce(v_global_reset_at, now() + interval '24 hours'), 'admin'::text;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_admin_ai_quota(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_admin_ai_quota(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_email text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'bug'
    CHECK (category IN ('bug', 'ui', 'performance', 'accessibility', 'other')),
  severity text NOT NULL DEFAULT 'normal'
    CHECK (severity IN ('low', 'normal', 'high', 'critical')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 4 AND 140),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 8000),
  page_url text NOT NULL DEFAULT '',
  browser_info text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'resolved')),
  admin_response text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bug_reports FROM PUBLIC, anon, authenticated;
GRANT INSERT, SELECT, UPDATE ON TABLE public.bug_reports TO authenticated;

DROP POLICY IF EXISTS "Students submit their own bug reports" ON public.bug_reports;
CREATE POLICY "Students submit their own bug reports"
ON public.bug_reports FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins read bug reports with MFA" ON public.bug_reports;
CREATE POLICY "Admins read bug reports with MFA"
ON public.bug_reports FOR SELECT TO authenticated
USING (
  coalesce((SELECT auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  AND coalesce((SELECT auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
);

DROP POLICY IF EXISTS "Admins update bug reports with MFA" ON public.bug_reports;
CREATE POLICY "Admins update bug reports with MFA"
ON public.bug_reports FOR UPDATE TO authenticated
USING (
  coalesce((SELECT auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  AND coalesce((SELECT auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
)
WITH CHECK (
  coalesce((SELECT auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  AND coalesce((SELECT auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
);

CREATE OR REPLACE FUNCTION public.set_bug_report_reporter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Invalid report owner' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(u.email, '')
    INTO NEW.reporter_email
    FROM auth.users u
   WHERE u.id = auth.uid();

  NEW.status := 'new';
  NEW.admin_response := '';
  NEW.resolved_at := NULL;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_bug_report_reporter() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_bug_report_reporter_before_insert ON public.bug_reports;
CREATE TRIGGER set_bug_report_reporter_before_insert
BEFORE INSERT ON public.bug_reports
FOR EACH ROW EXECUTE FUNCTION public.set_bug_report_reporter();

CREATE OR REPLACE FUNCTION public.touch_bug_report_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'resolved' AND OLD.status <> 'resolved' THEN
    NEW.resolved_at := now();
  ELSIF NEW.status <> 'resolved' THEN
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.touch_bug_report_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS touch_bug_report_updated_at_before_update ON public.bug_reports;
CREATE TRIGGER touch_bug_report_updated_at_before_update
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW EXECUTE FUNCTION public.touch_bug_report_updated_at();

CREATE INDEX IF NOT EXISTS bug_reports_status_created_at_idx
  ON public.bug_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS bug_reports_user_created_at_idx
  ON public.bug_reports(user_id, created_at DESC);
