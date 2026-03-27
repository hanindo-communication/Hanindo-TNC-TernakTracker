-- =============================================================================
-- TNC Ternak — migrasi INCREMENTAL: 005 → 009 (nama file tetap *_008 untuk kompatibilitas)
-- =============================================================================
-- Pakai ini jika database sudah pernah menjalankan 001 + 002 + 003 + 004
-- (atau apply_all versi lama tanpa 005–009). Idempotent: aman dijalankan ulang.
-- =============================================================================

-- ----- 005_creator_targets_table_segment.sql -----
alter table public.creator_targets
  add column if not exists table_segment text;

update public.creator_targets
set table_segment = 'all'
where table_segment is null;

alter table public.creator_targets drop constraint if exists creator_targets_table_segment_check;

alter table public.creator_targets
  add constraint creator_targets_table_segment_check
  check (table_segment in ('all', 'tnc', 'folo'));

alter table public.creator_targets
  alter column table_segment set default 'all';

alter table public.creator_targets
  alter column table_segment set not null;

comment on column public.creator_targets.table_segment is
  'Segmen meja dari form Submit Targets: all | tnc | folo.';

-- ----- 006_creator_targets_unique_table_segment.sql -----
alter table public.creator_targets
  drop constraint if exists creator_targets_leaf_unique;

alter table public.creator_targets
  add constraint creator_targets_leaf_unique unique (
    user_id,
    creator_id,
    project_id,
    campaign_objective_id,
    tiktok_account_id,
    month,
    table_segment
  );

comment on constraint creator_targets_leaf_unique on public.creator_targets is
  'Unik per segmen meja (all | tnc | folo) agar submit target beda meja tidak saling timpa.';

-- ----- 007_creators_hanindo_sharing_percent.sql -----
alter table public.creators
  add column if not exists hanindo_sharing_percent numeric
  not null
  default 15
  check (hanindo_sharing_percent >= 0 and hanindo_sharing_percent <= 50);

comment on column public.creators.hanindo_sharing_percent is
  'Persentase bagian Hanindo dari expected revenue (0–50). Default 15.';

-- ----- 008_submitted_video_urls.sql -----
alter table public.creator_targets
  add column if not exists submitted_video_urls jsonb not null default '[]'::jsonb;

comment on column public.creator_targets.submitted_video_urls is
  'Array URL TikTok per video, disinkron dengan hitungan submitted dan actual revenue.';

-- ----- 009_workspace_activity_log.sql -----
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
