alter table public.study_plan_items add column if not exists calendar_event_id uuid references public.calendar_events(id) on delete set null;
create index if not exists study_plan_items_calendar_event_idx on public.study_plan_items(calendar_event_id);
