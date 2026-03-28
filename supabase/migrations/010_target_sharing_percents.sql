-- Persentase dari expected revenue per baris (target_videos × base_pay): nominal = ER × pct / 100
alter table public.creator_targets
  add column if not exists incentive_percent numeric not null default 0,
  add column if not exists tnc_sharing_percent numeric not null default 0,
  add column if not exists hnd_sharing_percent numeric not null default 0;

alter table public.creator_targets
  drop constraint if exists creator_targets_sharing_percent_range;
alter table public.creator_targets
  add constraint creator_targets_sharing_percent_range
    check (
      incentive_percent >= 0 and incentive_percent <= 100
      and tnc_sharing_percent >= 0 and tnc_sharing_percent <= 100
      and hnd_sharing_percent >= 0 and hnd_sharing_percent <= 100
    );

comment on column public.creator_targets.incentive_percent is
  '% dari expected revenue baris untuk insentif creator; 0 = pakai incentive_per_video lama.';
comment on column public.creator_targets.tnc_sharing_percent is
  '% dari expected revenue baris untuk TNC sharing (jika ketiga % ≥ 1).';
comment on column public.creator_targets.hnd_sharing_percent is
  '% dari expected revenue baris untuk HND sharing (jika ketiga % ≥ 1).';
