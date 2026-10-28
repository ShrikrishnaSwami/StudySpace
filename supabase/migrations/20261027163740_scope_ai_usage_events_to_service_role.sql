drop policy if exists "Server manages AI usage events" on public.ai_usage_events;
create policy "Server manages AI usage events" on public.ai_usage_events
  for all to service_role using (true) with check (true);
grant usage, select on sequence public.ai_usage_events_id_seq to service_role;
