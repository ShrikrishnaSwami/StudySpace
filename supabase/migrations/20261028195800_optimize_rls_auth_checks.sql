-- Improve row-level security policy performance by evaluating auth.uid() once per statement.
-- This preserves existing predicates and only wraps bare auth.uid() calls in scalar SELECTs.
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
        (qual ~* 'auth\.uid\(\)' AND qual !~* 'select\s+auth\.uid\(\)')
        OR
        (with_check ~* 'auth\.uid\(\)' AND with_check !~* 'select\s+auth\.uid\(\)')
      )
  LOOP
    optimized_using := NULL;
    optimized_check := NULL;

    IF policy_row.qual ~* 'auth\.uid\(\)'
       AND policy_row.qual !~* 'select\s+auth\.uid\(\)' THEN
      optimized_using := regexp_replace(
        policy_row.qual,
        'auth\.uid\(\)',
        '(select auth.uid())',
        'gi'
      );
    END IF;

    IF policy_row.with_check ~* 'auth\.uid\(\)'
       AND policy_row.with_check !~* 'select\s+auth\.uid\(\)' THEN
      optimized_check := regexp_replace(
        policy_row.with_check,
        'auth\.uid\(\)',
        '(select auth.uid())',
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
