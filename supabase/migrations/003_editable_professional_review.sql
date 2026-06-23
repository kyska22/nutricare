-- Enables editing the professional review from the temporary no-login admin.
alter table public.evaluations
  add column if not exists recommendations text,
  add column if not exists follow_up_plan text;

drop policy if exists "demo_update_evaluations" on public.evaluations;

create policy "demo_update_evaluations"
  on public.evaluations for update
  to anon
  using (true)
  with check (true);

-- TODO: Replace this demo update policy with authenticated nutritionist access.
