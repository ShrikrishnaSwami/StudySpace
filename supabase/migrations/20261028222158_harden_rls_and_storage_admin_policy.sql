-- StudySpace RLS hardening.
-- Keep authenticated and anonymous-auth users working through the authenticated role,
-- while removing direct unauthenticated SQL/API table grants.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- Use the trusted Supabase app_metadata role for administrator file access.
-- Never authorize an administrator using a user-editable email/profile value.
DROP POLICY IF EXISTS "Admins download submitted files" ON storage.objects;
CREATE POLICY "Admins download submitted files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-submissions'
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);

-- Keep private service-only event tables restricted to the server role.
REVOKE ALL PRIVILEGES ON TABLE public.ai_usage_events FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.api_rate_limit_events FROM anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.ai_usage_events TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.api_rate_limit_events TO service_role;
