-- Urutan baris creator di PerformanceTable (drag-and-drop; shared workspace).
alter table public.creators
  add column if not exists dashboard_sort_index integer not null default 0;

create index if not exists idx_creators_user_dashboard_sort
  on public.creators (user_id, dashboard_sort_index);

comment on column public.creators.dashboard_sort_index is
  'Urutan tampilan di dashboard performa (0 = pertama setelah sort sekunder nama).';

notify pgrst, 'reload schema';
