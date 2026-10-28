create index if not exists ai_usage_events_user_feature_created_idx
  on public.ai_usage_events(user_id, feature, created_at desc);

create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_feature text,
  p_limit integer
)
returns table (
  allowed boolean,
  used integer,
  remaining integer,
  limit_count integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_used integer;
  v_reset_at timestamptz;
begin
  if p_user_id is null
     or p_limit < 1
     or p_limit > 1000
     or p_feature not in ('tutor','quiz','flashcards','homework','syllabus','recommendations') then
    raise exception 'Invalid AI quota request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_feature, 0));

  select count(*)::integer, min(e.created_at) + interval '24 hours'
    into v_used, v_reset_at
    from public.ai_usage_events e
   where e.user_id = p_user_id
     and e.feature = p_feature
     and e.created_at >= now() - interval '24 hours';

  if v_used >= p_limit then
    return query select false, v_used, 0, p_limit, coalesce(v_reset_at, now() + interval '24 hours');
    return;
  end if;

  insert into public.ai_usage_events(user_id, feature) values (p_user_id, p_feature);
  v_used := v_used + 1;

  return query select true, v_used, greatest(0, p_limit - v_used), p_limit,
    coalesce(v_reset_at, now() + interval '24 hours');
end;
$$;

revoke all on function public.consume_ai_quota(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text, integer) to service_role;
