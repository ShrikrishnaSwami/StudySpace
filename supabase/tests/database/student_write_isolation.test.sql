begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.assignment_submissions', 'UPDATE'),
  'authenticated users do not have table-wide submission UPDATE'
);
select extensions.ok(
  has_column_privilege('authenticated', 'public.assignment_submissions', 'status', 'UPDATE')
  and has_column_privilege('authenticated', 'public.assignment_submissions', 'submission_note', 'UPDATE')
  and has_column_privilege('authenticated', 'public.assignment_submissions', 'submitted_at', 'UPDATE')
  and has_column_privilege('authenticated', 'public.assignment_submissions', 'updated_at', 'UPDATE'),
  'students can update only their submission workflow fields'
);
select extensions.ok(
  not has_column_privilege('authenticated', 'public.assignment_submissions', 'grade', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.assignment_submissions', 'feedback', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.assignment_submissions', 'graded_by', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.assignment_submissions', 'ai_grade', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.assignment_submissions', 'ai_feedback', 'UPDATE'),
  'students cannot directly write official grades or AI grading results'
);
select extensions.ok(
  has_column_privilege('service_role', 'public.assignment_submissions', 'ai_grade', 'UPDATE')
  and has_column_privilege('service_role', 'public.assignment_submissions', 'ai_feedback', 'UPDATE'),
  'trusted server grading retains its write permissions'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.ai_tutor_messages', 'UPDATE'),
  'AI tutor messages are append-only for students'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.assignment_attachments', 'UPDATE'),
  'assignment attachment metadata cannot be modified in place by students'
);
select extensions.ok(
  coalesce((
    select with_check like '%ai_tutor_conversations%'
       and with_check like '%user_id%'
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_tutor_messages'
      and policyname = 'Users can create own AI messages'
  ), false),
  'AI tutor message inserts must reference the same student conversation'
);
select extensions.ok(
  coalesce((
    select with_check like '%assignments%'
       and with_check like '%assigned_to%'
       and with_check like '%user_id%'
    from pg_policies
    where schemaname = 'public'
      and tablename = 'assignment_attachments'
      and policyname = 'Users can create their own assignment attachments'
  ), false),
  'assignment attachment inserts require ownership or assignment access'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.assignment_submissions', 'UPDATE')
  and not has_table_privilege('anon', 'public.ai_tutor_messages', 'UPDATE')
  and not has_table_privilege('anon', 'public.assignment_attachments', 'UPDATE'),
  'anonymous clients cannot update protected student records'
);
select extensions.ok(
  not has_column_privilege('authenticated', 'public.assignment_submissions', 'user_id', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.assignment_submissions', 'assignment_id', 'UPDATE'),
  'students cannot change submission ownership or assignment linkage'
);

select * from extensions.finish();
rollback;
