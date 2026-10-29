-- Stores only operational backup status, never student records or secret values.
create table if not exists public.system_backup_status (
  id boolean primary key default true check (id = true),
  status text not null default 'not_configured'
    check (status in ('not_configured', 'running', 'success', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  run_id text,
  run_url text,
  manifest jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.system_backup_status enable row level security;
revoke all on table public.system_backup_status from anon, authenticated;
grant select, insert, update on table public.system_backup_status to service_role;

comment on table public.system_backup_status is
  'Operational status for encrypted off-site backups; accessible only to trusted server-side service role.';
