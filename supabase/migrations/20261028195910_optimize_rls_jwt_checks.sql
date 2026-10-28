-- Evaluate the JWT claim once per statement in admin policies.
-- The predicates and configured admin email remain unchanged.
DO $$
DECLARE
  policy_row record;
  optimized_using text;
  optimized_check text;
  statement text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual ~* 'auth\.jwt\(\)' AND qual !~* 'select\s+auth\.jwt\(\)')
        OR
        (with_check ~* 'auth\.jwt\(\)' AND with_check !~* 'select\s+auth\.jwt\(\)')
      )
  LOOP
    optimized_using := NULL;
    optimized_check := NULL;

    IF policy_row.qual ~* 'auth\.jwt\(\)'
       AND policy_row.qual !~* 'select\s+auth\.jwt\(\)' THEN
      optimized_using := regexp_replace(
        policy_row.qual,
        'auth\.jwt\(\)',
        '(select auth.jwt())',
        'gi'
      );
    END IF;

    IF policy_row.with_check ~* 'auth\.jwt\(\)'
       AND policy_row.with_check !~* 'select\s+auth\.jwt\(\)' THEN
      optimized_check := regexp_replace(
        policy_row.with_check,
        'auth\.jwt\(\)',
        '(select auth.jwt())',
        'gi'
      );
    END IF;

    statement := format(
      'ALTER POLICY %I ON %I.%I%s%s',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename,
      CASE
        WHEN optimized_using IS NOT NULL
        THEN format(' USING (%s)', optimized_using)
        ELSE ''
      END,
      CASE
        WHEN optimized_check IS NOT NULL
        THEN format(' WITH CHECK (%s)', optimized_check)
        ELSE ''
      END
    );

    EXECUTE statement;
  END LOOP;
END
$$;
