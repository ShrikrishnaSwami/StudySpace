-- Add a total AI-call ceiling across features, so an attacker cannot evade
-- per-feature caps by distributing requests across every AI endpoint.

create index if not exists ai_usage_events_created_at_idx
  on public.ai_usage_events (created_at);

create or replace function public.consume_ai_quota(p_user_id uuid, p_feature text, p_limit integer)
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
  v_total_used integer;
  v_total_reset_at timestamptz;
  v_global_limit integer;
  v_total_limit integer := 1500;
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

  -- A consistent global -> feature -> user lock order prevents quota races and deadlocks.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('global:all-ai', 0));
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
    into v_total_used, v_total_reset_at
    from public.ai_usage_events e
   where e.created_at >= now() - interval '24 hours';

  if v_total_used >= v_total_limit then
    return query select false, v_user_used, 0, p_limit,
      coalesce(v_total_reset_at, now() + interval '24 hours'), 'global'::text;
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
