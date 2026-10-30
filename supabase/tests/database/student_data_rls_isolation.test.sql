-- Read-only behavioral RLS tests against a populated StudySpace database.
-- All fixture selection is read-only; role/JWT changes and the temporary table
-- are scoped to this transaction and rolled back at the end.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.plan(10);

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
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.assignments'::regclass),
  'assignments has row-level security enabled'
);
SELECT ok(
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
SELECT set_config('request.jwt.claims', json_build_object(
  'sub', (SELECT owner_a::text FROM pg_temp.rls_test_ids),
  'role', 'authenticated',
  'aal', 'aal1'
)::text, true);

SELECT extensions.is(
  (SELECT count(*)::integer FROM public.courses WHERE id = (SELECT owner_a_course_id FROM pg_temp.rls_test_ids)),
  1,
  'student A can read their own course'
);
SELECT is(
  (SELECT count(*)::integer FROM public.courses WHERE id = (SELECT owner_b_course_id FROM pg_temp.rls_test_ids)),
  0,
  'student A cannot read student B course'
);
SELECT is(
  (SELECT count(*)::integer FROM public.assignments WHERE id = (SELECT owner_a_assignment_id FROM pg_temp.rls_test_ids)),
  1,
  'student A can read their own assignment'
);

SELECT set_config('request.jwt.claim.sub', (SELECT owner_b::text FROM pg_temp.rls_test_ids), true);
SELECT set_config('request.jwt.claims', json_build_object(
  'sub', (SELECT owner_b::text FROM pg_temp.rls_test_ids),
  'role', 'authenticated',
  'aal', 'aal1'
)::text, true);

SELECT is(
  (SELECT count(*)::integer FROM public.courses WHERE id = (SELECT owner_a_course_id FROM pg_temp.rls_test_ids)),
  0,
  'student B cannot read student A course'
);
SELECT is(
  (SELECT count(*)::integer FROM public.courses WHERE id = (SELECT owner_b_course_id FROM pg_temp.rls_test_ids)),
  1,
  'student B can read their own course'
);
SELECT * FROM extensions.finish();
ROLLBACK;
