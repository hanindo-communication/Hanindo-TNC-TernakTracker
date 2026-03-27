-- Jalankan di Supabase SQL Editor jika migrasi 009 belum diterapkan.
-- Tabel log aktivitas workspace (riwayat siapa mengubah apa).

create table if not exists public.workspace_activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_email text,
  action text not null,
  entity_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_workspace_activity_log_created_at
  on public.workspace_activity_log (created_at desc);

alter table public.workspace_activity_log enable row level security;

drop policy if exists "workspace_activity_log_select_auth" on public.workspace_activity_log;
drop policy if exists "workspace_activity_log_insert_auth" on public.workspace_activity_log;

create policy "workspace_activity_log_select_auth"
  on public.workspace_activity_log for select to authenticated using (true);

create policy "workspace_activity_log_insert_auth"
  on public.workspace_activity_log for insert to authenticated with check (true);

notify pgrst, 'reload schema';
