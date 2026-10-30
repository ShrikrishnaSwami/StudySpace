alter table public.courses
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists class_start_time time without time zone,
  add column if not exists class_end_time time without time zone,
  add column if not exists class_days smallint[] not null default '{}'::smallint[],
  add column if not exists timezone text not null default 'UTC';

alter table public.courses
  drop constraint if exists courses_date_range_check,
  add constraint courses_date_range_check
    check (start_date is null or end_date is null or end_date >= start_date),
  drop constraint if exists courses_class_time_check,
  add constraint courses_class_time_check
    check (class_start_time is null or class_end_time is null or class_end_time > class_start_time),
  drop constraint if exists courses_class_days_check,
  add constraint courses_class_days_check
    check (class_days <@ array[0,1,2,3,4,5,6]::smallint[]);

create table if not exists public.course_class_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  occurrence_date date not null,
  created_at timestamptz not null default now(),
  constraint course_class_exceptions_course_date_key unique (course_id, occurrence_date)
);

alter table public.course_class_exceptions enable row level security;
revoke all on public.course_class_exceptions from anon;
grant select, insert, delete on public.course_class_exceptions to authenticated;

drop policy if exists "Students manage their own course class exceptions" on public.course_class_exceptions;
create policy "Students manage their own course class exceptions"
on public.course_class_exceptions
for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.courses c
    where c.id = course_id and c.user_id = (select auth.uid())
  )
);

create index if not exists course_class_exceptions_course_date_idx
  on public.course_class_exceptions(course_id, occurrence_date);

create or replace function public.sync_course_class_calendar()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  occurrence date;
  class_start timestamptz;
  class_end timestamptz;
  local_tz text;
begin
  delete from public.calendar_events
  where course_id = new.id and source = 'course' and event_type = 'class';

  if new.start_date is null
     or new.end_date is null
     or new.class_start_time is null
     or new.class_end_time is null
     or cardinality(new.class_days) = 0
     or new.archived = true then
    return new;
  end if;

  local_tz := coalesce(nullif(new.timezone, ''), 'UTC');

  for occurrence in
    select d::date
    from generate_series(new.start_date::timestamp, least(new.end_date, new.start_date + 730)::timestamp, interval '1 day') as d
    where extract(dow from d)::smallint = any(new.class_days)
  loop
    if not exists (
      select 1 from public.course_class_exceptions e
      where e.course_id = new.id and e.occurrence_date = occurrence
    ) then
      class_start := make_timestamptz(
        extract(year from occurrence)::integer,
        extract(month from occurrence)::integer,
        extract(day from occurrence)::integer,
        extract(hour from new.class_start_time)::integer,
        extract(minute from new.class_start_time)::integer,
        extract(second from new.class_start_time),
        local_tz
      );
      class_end := make_timestamptz(
        extract(year from occurrence)::integer,
        extract(month from occurrence)::integer,
        extract(day from occurrence)::integer,
        extract(hour from new.class_end_time)::integer,
        extract(minute from new.class_end_time)::integer,
        extract(second from new.class_end_time),
        local_tz
      );

      insert into public.calendar_events (
        user_id, title, subtitle, description, start_at, end_at,
        event_type, enabled, multitask, source, course_id, location, notes
      ) values (
        new.user_id,
        concat_ws(' · ', nullif(new.code, ''), new.name),
        'Scheduled class',
        coalesce(new.description, ''),
        class_start,
        class_end,
        'class',
        true,
        false,
        'course',
        new.id,
        coalesce(new.room, ''),
        'Automatically added from this course schedule.'
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists courses_sync_class_calendar on public.courses;
create trigger courses_sync_class_calendar
after insert or update of
  code, name, description, room, start_date, end_date,
  class_start_time, class_end_time, class_days, timezone, archived
on public.courses
for each row execute function public.sync_course_class_calendar();

create or replace function public.skip_course_class_occurrence(
  p_course_id uuid,
  p_occurrence_date date
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.courses
    where id = p_course_id and user_id = current_user_id
  ) then
    raise exception 'Course not found';
  end if;

  insert into public.course_class_exceptions(user_id, course_id, occurrence_date)
  values (current_user_id, p_course_id, p_occurrence_date)
  on conflict (course_id, occurrence_date) do nothing;

  delete from public.calendar_events
  where user_id = current_user_id
    and course_id = p_course_id
    and source = 'course'
    and event_type = 'class'
    and (start_at at time zone coalesce((select timezone from public.courses where id=p_course_id),'UTC'))::date = p_occurrence_date;
end;
$$;

revoke all on function public.skip_course_class_occurrence(uuid,date) from public, anon;
grant execute on function public.skip_course_class_occurrence(uuid,date) to authenticated;
