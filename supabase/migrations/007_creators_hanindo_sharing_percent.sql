-- Persist Hanindo % of ER per creator (dashboard [HND] column). 0–50, default 15.
alter table public.creators
  add column if not exists hanindo_sharing_percent numeric
  not null
  default 15
  check (hanindo_sharing_percent >= 0 and hanindo_sharing_percent <= 50);

comment on column public.creators.hanindo_sharing_percent is
  'Persentase bagian Hanindo dari expected revenue (0–50). Default 15.';
