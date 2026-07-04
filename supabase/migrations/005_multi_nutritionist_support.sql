-- Adds basic multi-nutritionist ownership using Supabase Auth.

create table if not exists public.nutritionists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  full_name text,
  email text,
  professional_registration text,
  created_at timestamptz not null default now()
);

alter table public.nutritionists enable row level security;

alter table public.evaluations
  add column if not exists nutritionist_id uuid references public.nutritionists(id) on delete set null;

create index if not exists evaluations_nutritionist_id_idx
  on public.evaluations(nutritionist_id);

create index if not exists nutritionists_user_id_idx
  on public.nutritionists(user_id);

drop policy if exists "nutritionists_select_own" on public.nutritionists;
create policy "nutritionists_select_own"
  on public.nutritionists for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "nutritionists_insert_own" on public.nutritionists;
create policy "nutritionists_insert_own"
  on public.nutritionists for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "nutritionists_update_own" on public.nutritionists;
create policy "nutritionists_update_own"
  on public.nutritionists for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "authenticated_select_anonymous_patients" on public.anonymous_patients;
create policy "authenticated_select_anonymous_patients"
  on public.anonymous_patients for select
  to authenticated
  using (true);

drop policy if exists "authenticated_insert_anonymous_patients" on public.anonymous_patients;
create policy "authenticated_insert_anonymous_patients"
  on public.anonymous_patients for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated_select_packages" on public.packages;
create policy "authenticated_select_packages"
  on public.packages for select
  to authenticated
  using (true);

drop policy if exists "authenticated_insert_packages" on public.packages;
create policy "authenticated_insert_packages"
  on public.packages for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated_update_packages" on public.packages;
create policy "authenticated_update_packages"
  on public.packages for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_select_session_logs" on public.session_logs;
create policy "authenticated_select_session_logs"
  on public.session_logs for select
  to authenticated
  using (true);

drop policy if exists "authenticated_insert_session_logs" on public.session_logs;
create policy "authenticated_insert_session_logs"
  on public.session_logs for insert
  to authenticated
  with check (true);

drop policy if exists "demo_select_evaluations" on public.evaluations;
drop policy if exists "demo_insert_evaluations" on public.evaluations;
drop policy if exists "demo_update_evaluations" on public.evaluations;

drop policy if exists "nutritionists_select_own_evaluations" on public.evaluations;
create policy "nutritionists_select_own_evaluations"
  on public.evaluations for select
  to authenticated
  using (
    nutritionist_id is null
    or exists (
      select 1
      from public.nutritionists n
      where n.id = evaluations.nutritionist_id
        and n.user_id = auth.uid()
    )
  );

drop policy if exists "nutritionists_insert_own_evaluations" on public.evaluations;
create policy "nutritionists_insert_own_evaluations"
  on public.evaluations for insert
  to authenticated
  with check (
    nutritionist_id is not null
    and exists (
      select 1
      from public.nutritionists n
      where n.id = evaluations.nutritionist_id
        and n.user_id = auth.uid()
    )
  );

drop policy if exists "nutritionists_update_own_evaluations" on public.evaluations;
create policy "nutritionists_update_own_evaluations"
  on public.evaluations for update
  to authenticated
  using (
    nutritionist_id is null
    or exists (
      select 1
      from public.nutritionists n
      where n.id = evaluations.nutritionist_id
        and n.user_id = auth.uid()
    )
  )
  with check (
    nutritionist_id is not null
    and exists (
      select 1
      from public.nutritionists n
      where n.id = evaluations.nutritionist_id
        and n.user_id = auth.uid()
    )
  );
