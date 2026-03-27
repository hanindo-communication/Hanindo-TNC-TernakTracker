-- Riwayat aksi workspace bersama (siapa mengubah apa). Dipanggil dari aplikasi setelah operasi berhasil.

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

create policy "workspace_activity_log_select_auth"
  on public.workspace_activity_log for select to authenticated using (true);

create policy "workspace_activity_log_insert_auth"
  on public.workspace_activity_log for insert to authenticated with check (true);
