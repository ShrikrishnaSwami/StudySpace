drop policy if exists "Server manages API rate limit events" on public.api_rate_limit_events;
create policy "Server manages API rate limit events" on public.api_rate_limit_events
  for all to service_role using (true) with check (true);
