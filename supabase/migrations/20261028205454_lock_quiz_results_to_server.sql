-- Quiz scores and answer rows are authoritative academic records. Only the trusted
-- StudySpace server may create, change, or delete them; authenticated clients can read
-- their own results but cannot forge scores through the Supabase Data API.

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('quiz_attempts', 'quiz_answers')
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  loop
    execute format('drop policy if exists %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end;
$$;

create or replace function public.prevent_client_quiz_result_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  request_role text := coalesce(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );
begin
  if request_role = 'service_role' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  raise exception 'Quiz results can only be written by the StudySpace server'
    using errcode = '42501';
end;
$$;

revoke all on function public.prevent_client_quiz_result_mutation() from public, anon, authenticated;

drop trigger if exists prevent_client_quiz_attempt_mutation on public.quiz_attempts;
create trigger prevent_client_quiz_attempt_mutation
before insert or update or delete on public.quiz_attempts
for each row execute function public.prevent_client_quiz_result_mutation();

drop trigger if exists prevent_client_quiz_answer_mutation on public.quiz_answers;
create trigger prevent_client_quiz_answer_mutation
before insert or update or delete on public.quiz_answers
for each row execute function public.prevent_client_quiz_result_mutation();
