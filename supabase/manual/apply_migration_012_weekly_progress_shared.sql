-- Weekly progress → workspace bersama (salin ke Supabase SQL Editor jika belum pakai CLI migrate).
-- Jalankan SETELAH 011_weekly_progress.sql. Baris terakhir memicu reload schema PostgREST.

begin;

alter table public.weekly_progress
  drop constraint if exists weekly_progress_user_id_fkey;

with ranked as (
  select ctid,
    row_number() over (
      partition by month_key
      order by updated_at desc, user_id
    ) as rn
  from public.weekly_progress
)
delete from public.weekly_progress w
where w.ctid in (select ctid from ranked where rn > 1);

update public.weekly_progress
set user_id = '00000000-0000-0000-0000-000000000001'::uuid;

drop policy if exists "weekly_progress_all_own" on public.weekly_progress;

create policy "weekly_progress_shared_auth"
  on public.weekly_progress for all to authenticated
  using (true) with check (true);

commit;

notify pgrst, 'reload schema';
