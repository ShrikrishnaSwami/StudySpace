create table if not exists public.api_rate_limit_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists api_rate_limit_events_user_route_time_idx
  on public.api_rate_limit_events(user_id, route_key, created_at desc);
alter table public.api_rate_limit_events enable row level security;
revoke all on public.api_rate_limit_events from public, anon, authenticated;
grant all on public.api_rate_limit_events to service_role;
grant usage, select on sequence public.api_rate_limit_events_id_seq to service_role;

create or replace function public.consume_api_rate_limit(
  p_user_id uuid,
  p_route_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, used integer, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_used integer;
  v_reset_at timestamptz;
begin
  if p_user_id is null or p_route_key is null or length(p_route_key) < 1 or length(p_route_key) > 100
     or p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid API rate limit request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_route_key, 0));

  select count(*)::integer, min(e.created_at) + make_interval(secs => p_window_seconds)
    into v_used, v_reset_at
    from public.api_rate_limit_events e
   where e.user_id = p_user_id
     and e.route_key = p_route_key
     and e.created_at >= now() - make_interval(secs => p_window_seconds);

  if v_used >= p_limit then
    return query select false, v_used, 0, coalesce(v_reset_at, now() + make_interval(secs => p_window_seconds));
    return;
  end if;

  insert into public.api_rate_limit_events(user_id, route_key) values (p_user_id, p_route_key);
  v_used := v_used + 1;
  return query select true, v_used, greatest(0, p_limit - v_used), coalesce(v_reset_at, now() + make_interval(secs => p_window_seconds));
end;
$$;
revoke all on function public.consume_api_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(uuid, text, integer, integer) to service_role;
