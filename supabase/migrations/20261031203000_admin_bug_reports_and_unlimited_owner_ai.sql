-- Private in-app beta bug reports. Admin access requires the trusted
-- app_metadata role and an AAL2 session. No report is sent to GitHub.

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_email text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'bug',
  severity text NOT NULL DEFAULT 'normal',
  title text NOT NULL,
  description text NOT NULL,
  page_url text NOT NULL DEFAULT '',
  browser_info text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  admin_response text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- The E2E project may already contain the minimal table from the initial
-- migration rehearsal; these additions make the migration safe to reapply.
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS reporter_email text NOT NULL DEFAULT '';
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'bug';
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'normal';
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS page_url text NOT NULL DEFAULT '';
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS browser_info text NOT NULL DEFAULT '';
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS admin_response text NOT NULL DEFAULT '';
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
GRANT INSERT, SELECT, UPDATE ON TABLE public.bug_reports TO authenticated;

DROP POLICY IF EXISTS "Students submit their own bug reports" ON public.bug_reports;
CREATE POLICY "Students submit their own bug reports"
ON public.bug_reports FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Students read their own bug reports" ON public.bug_reports;
CREATE POLICY "Students read their own bug reports"
ON public.bug_reports FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

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

CREATE INDEX IF NOT EXISTS bug_reports_status_created_at_idx
  ON public.bug_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS bug_reports_user_created_at_idx
  ON public.bug_reports(user_id, created_at DESC);
