alter table public.calendar_events
  drop constraint if exists calendar_events_course_id_fkey;

alter table public.calendar_events
  add constraint calendar_events_course_id_fkey
  foreign key (course_id) references public.courses(id) on delete cascade;
