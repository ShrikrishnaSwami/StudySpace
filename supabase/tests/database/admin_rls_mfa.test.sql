begin;
select plan(7);

select ok(coalesce((select qual like '%aal2%' from pg_policies where schemaname='public' and tablename='assignment_submissions' and policyname='Read permitted assignment submissions'), false), 'cross-student submission reads require AAL2');
select ok(coalesce((select qual like '%aal2%' and with_check like '%aal2%' from pg_policies where schemaname='public' and tablename='assignment_submissions' and policyname='Update permitted assignment submissions'), false), 'cross-student submission updates require AAL2');
select ok(coalesce((select qual like '%aal2%' from pg_policies where schemaname='public' and tablename='assignment_submission_files' and policyname='Read permitted submission file metadata'), false), 'cross-student submission file metadata requires AAL2');
select ok(coalesce((select qual like '%aal2%' from pg_policies where schemaname='public' and tablename='assignments' and policyname='Read permitted assignments'), false), 'cross-student assignment reads require AAL2');
select ok(coalesce((select with_check like '%aal2%' from pg_policies where schemaname='public' and tablename='assignments' and policyname='Create permitted assignments'), false), 'administrator assignment creation requires AAL2');
select ok(coalesce((select qual not like '%assigned_to%' and with_check not like '%assigned_to%' from pg_policies where schemaname='public' and tablename='assignments' and policyname='Update permitted assignments'), false), 'assigned students cannot modify teacher-owned assignment rows');
select ok(coalesce((select qual like '%aal2%' from pg_policies where schemaname='public' and tablename='quizzes' and policyname='Read permitted quizzes'), false), 'cross-student quiz reads require AAL2');

select * from finish();
rollback;