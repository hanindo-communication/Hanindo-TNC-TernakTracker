-- Link baris target performa ke bucket Weekly progress (Week 1–4 / indeks 0–3).
alter table public.creator_targets
  add column if not exists progress_week smallint;

alter table public.creator_targets
  drop constraint if exists creator_targets_progress_week_range;

alter table public.creator_targets
  add constraint creator_targets_progress_week_range
  check (progress_week is null or (progress_week >= 0 and progress_week < 4));

comment on column public.creator_targets.progress_week is
  'Minggu laporan 0–3 (UI Week 1–4) untuk sinkron ke modal Weekly progress. Null = pakai heuristik tanggal saat submit video.';

notify pgrst, 'reload schema';
