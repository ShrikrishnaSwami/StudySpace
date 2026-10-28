-- Add a shared rolling-24-hour AI budget per feature. Per-user limits alone can
-- be bypassed by creating many accounts; these caps bound total provider exposure
-- during beta even when the service is under coordinated abuse.

create index if not exists ai_usage_events_feature_created_at_idx
  on public.ai_usage_events (feature, created_at);

drop function if exists public.consume_ai_quota(uuid, text, integer);

create function public.consume_ai_quota(p_user_id uuid, p_feature text, p_limit integer)
returns table(
  allowed boolean,
  used integer,
  remaining integer,
  limit_count integer,
  reset_at timestamptz,
  scope text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_used integer;
  v_user_reset_at timestamptz;
  v_global_used integer;
  v_global_reset_at timestamptz;
  v_global_limit integer;
begin
  if p_user_id is null
     or p_feature is null
     or p_limit < 1
     or p_limit > 1000
     or p_feature not in ('tutor','quiz','flashcards','homework','syllabus','recommendations') then
    raise exception 'Invalid AI quota request';
  end if;

  v_global_limit := case p_feature
    when 'tutor' then 1000
    when 'quiz' then 300
    when 'flashcards' then 500
    when 'homework' then 300
    when 'syllabus' then 150
    when 'recommendations' then 300
  end;

  -- Consistent lock order avoids deadlocks across requests.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('global:' || p_feature, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text || ':' || p_feature, 0));

  select count(*)::integer, min(e.created_at) + interval '24 hours'
    into v_user_used, v_user_reset_at
    from public.ai_usage_events e
   where e.user_id = p_user_id
     and e.feature = p_feature
     and e.created_at >= now() - interval '24 hours';

  if v_user_used >= p_limit then
    return query select false, v_user_used, 0, p_limit,
      coalesce(v_user_reset_at, now() + interval '24 hours'), 'user'::text;
    return;
  end if;

  select count(*)::integer, min(e.created_at) + interval '24 hours'
    into v_global_used, v_global_reset_at
    from public.ai_usage_events e
   where e.feature = p_feature
     and e.created_at >= now() - interval '24 hours';

  if v_global_used >= v_global_limit then
    return query select false, v_user_used, 0, p_limit,
      coalesce(v_global_reset_at, now() + interval '24 hours'), 'global'::text;
    return;
  end if;

  insert into public.ai_usage_events(user_id, feature) values (p_user_id, p_feature);
  v_user_used := v_user_used + 1;

  return query select true, v_user_used, greatest(0, p_limit - v_user_used), p_limit,
    coalesce(v_user_reset_at, now() + interval '24 hours'), 'user'::text;
end;
$function$;

revoke all on function public.consume_ai_quota(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text, integer) to service_role;
