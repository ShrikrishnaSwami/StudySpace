-- Read-only behavioral RLS tests against a populated StudySpace database.
-- All fixture selection is read-only; role/JWT changes and the temporary table
-- are scoped to this transaction and rolled back at the end.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.plan(19);

CREATE TEMP TABLE rls_test_ids ON COMMIT DROP AS
WITH assignment_owner AS (
  SELECT user_id
  FROM public.assignments
  GROUP BY user_id
  ORDER BY user_id
  LIMIT 1
),
owner_courses AS (
  SELECT c.user_id, (array_agg(c.id ORDER BY c.id))[1] AS course_id
  FROM public.courses c
  GROUP BY c.user_id
),
owner_a AS (
  SELECT oc.user_id, oc.course_id
  FROM owner_courses oc
  JOIN assignment_owner ao ON ao.user_id = oc.user_id
  LIMIT 1
),
owner_b AS (
  SELECT oc.user_id, oc.course_id
  FROM owner_courses oc
  CROSS JOIN owner_a a
  WHERE oc.user_id <> a.user_id
  ORDER BY oc.user_id
  LIMIT 1
),
owned_assignment AS (
  SELECT a.id
  FROM public.assignments a
  JOIN owner_a oa ON oa.user_id = a.user_id
  ORDER BY a.id
  LIMIT 1
)
SELECT
  oa.user_id AS owner_a,
  oa.course_id AS owner_a_course_id,
  ob.user_id AS owner_b,
  ob.course_id AS owner_b_course_id,
  ass.id AS owner_a_assignment_id
FROM owner_a oa
CROSS JOIN owner_b ob
CROSS JOIN owned_assignment ass;

GRANT SELECT ON rls_test_ids TO authenticated;

SELECT extensions.ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.courses'::regclass),
  'courses has row-level security enabled'
);
SELECT extensions.ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.assignments'::regclass),
  'assignments has row-level security enabled'
);
SELECT extensions.ok(
  (SELECT reloptions @> ARRAY['security_invoker=true'] FROM pg_class WHERE oid = 'public.ai_context_courses'::regclass),
  'bounded AI course context view executes with invoker permissions and RLS'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'v'
     AND c.relname LIKE 'ai_context_%'
     AND c.reloptions @> ARRAY['security_invoker=true']),
  8,
  'all eight bounded AI context views use security invoker'
);
SELECT extensions.ok(
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname LIKE 'ai_context_%'
      AND c.relkind = 'v' AND has_table_privilege('anon', c.oid, 'select')
  ),
  'anonymous users cannot select any bounded AI context view'
);
SELECT extensions.ok(
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname LIKE 'ai_context_%'
      AND c.relkind = 'v' AND NOT has_table_privilege('authenticated', c.oid, 'select')
  ),
  'authenticated students can select the bounded AI context views'
);
SELECT extensions.ok(
  EXISTS (SELECT 1 FROM pg_temp.rls_test_ids),
  'the live database contains two student owners and an owned assignment for isolation tests'
);

SELECT extensions.ok(
  (SELECT pg_get_constraintdef(oid) LIKE '%notes%' AND pg_get_constraintdef(oid) LIKE '%grading%'
   FROM pg_constraint WHERE conrelid = 'public.ai_usage_events'::regclass AND conname = 'ai_usage_events_feature_check'),
  'AI usage events permit separate note extraction and assignment grading categories'
);
SELECT extensions.ok(
  position('notes' in pg_get_functiondef('public.get_my_ai_usage()'::regprocedure)) > 0
  AND position('grading' in pg_get_functiondef('public.get_my_ai_usage()'::regprocedure)) > 0,
  'AI usage reporting exposes separate note extraction and grading quotas'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT owner_a::text FROM pg_temp.rls_test_ids), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', json_build_object(
  'sub', (SELECT owner_a::text FROM pg_temp.rls_test_ids),
  'role', 'authenticated',
  'aal', 'aal1'
)::text, true);

SELECT extensions.ok(
  (SELECT allowed AND limit_count = 15 FROM public.consume_ai_quota_for_user('notes')),
  'note extraction has its own 15-request quota'
);
SELECT extensions.ok(
  (SELECT allowed AND limit_count = 10 FROM public.consume_ai_quota_for_user('grading')),
  'assignment grading has its own 10-request quota'
);
SELECT extensions.ok(
  (SELECT allowed FROM public.consume_my_api_rate_limit('ai-notes', 3, 600)),
  'note extraction burst limiter is allowlisted'
);
SELECT extensions.ok(
  (SELECT allowed FROM public.consume_my_api_rate_limit('ai-note-extraction', 5, 600)),
  'multipart note upload limiter is allowlisted before parsing'
);
SELECT extensions.ok(
  (SELECT allowed FROM public.consume_my_api_rate_limit('ai-grading', 2, 600)),
  'assignment grading burst limiter is allowlisted'
);

SELECT extensions.is(
  (SELECT count(*)::integer FROM public.ai_context_courses WHERE id = (SELECT owner_a_course_id FROM pg_temp.rls_test_ids)),
  1,
  'student A can read their own course'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.ai_context_courses WHERE id = (SELECT owner_b_course_id FROM pg_temp.rls_test_ids)),
  0,
  'student A cannot read student B course'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.ai_context_assignments WHERE id = (SELECT owner_a_assignment_id FROM pg_temp.rls_test_ids)),
  1,
  'student A can read their own assignment'
);

SELECT set_config('request.jwt.claim.sub', (SELECT owner_b::text FROM pg_temp.rls_test_ids), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', json_build_object(
  'sub', (SELECT owner_b::text FROM pg_temp.rls_test_ids),
  'role', 'authenticated',
  'aal', 'aal1'
)::text, true);

SELECT extensions.is(
  (SELECT count(*)::integer FROM public.ai_context_courses WHERE id = (SELECT owner_a_course_id FROM pg_temp.rls_test_ids)),
  0,
  'student B cannot read student A course'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.ai_context_courses WHERE id = (SELECT owner_b_course_id FROM pg_temp.rls_test_ids)),
  1,
  'student B can read their own course'
);
SELECT * FROM extensions.finish();
ROLLBACK;
