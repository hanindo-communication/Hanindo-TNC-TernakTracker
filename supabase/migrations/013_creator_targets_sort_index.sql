-- Urutan tampilan campaign per creator / bulan (drag-and-drop di PerformanceTable).

begin;

alter table public.creator_targets
  add column if not exists sort_index integer not null default 0;

create index if not exists idx_creator_targets_creator_month_sort
  on public.creator_targets (creator_id, month, sort_index);

commit;

notify pgrst, 'reload schema';
