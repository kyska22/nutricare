-- Creates the NutriJenhFit settings center for each authenticated nutritionist.

create table if not exists public.nutritionist_settings (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid unique not null references public.nutritionists(id) on delete cascade,
  clinic_name text,
  professional_name text,
  professional_registration text,
  email text,
  phone text,
  whatsapp text,
  country text,
  city text,
  logo_url text,
  first_consultation_price text,
  followup_price text,
  first_consultation_duration text,
  followup_duration text,
  currency text,
  first_consultation_cal_link text,
  followup_cal_link text,
  email_signature text,
  report_footer text,
  patient_final_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nutritionist_settings enable row level security;

create index if not exists nutritionist_settings_nutritionist_id_idx
  on public.nutritionist_settings(nutritionist_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_nutritionist_settings_updated_at
  on public.nutritionist_settings;

create trigger set_nutritionist_settings_updated_at
  before update on public.nutritionist_settings
  for each row
  execute function public.set_updated_at();

drop policy if exists "nutritionists_select_own_settings" on public.nutritionist_settings;
create policy "nutritionists_select_own_settings"
  on public.nutritionist_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.nutritionists n
      where n.id = nutritionist_settings.nutritionist_id
        and n.user_id = auth.uid()
    )
  );

drop policy if exists "nutritionists_insert_own_settings" on public.nutritionist_settings;
create policy "nutritionists_insert_own_settings"
  on public.nutritionist_settings for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.nutritionists n
      where n.id = nutritionist_settings.nutritionist_id
        and n.user_id = auth.uid()
    )
  );

drop policy if exists "nutritionists_update_own_settings" on public.nutritionist_settings;
create policy "nutritionists_update_own_settings"
  on public.nutritionist_settings for update
  to authenticated
  using (
    exists (
      select 1
      from public.nutritionists n
      where n.id = nutritionist_settings.nutritionist_id
        and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.nutritionists n
      where n.id = nutritionist_settings.nutritionist_id
        and n.user_id = auth.uid()
    )
  );

-- Public agenda data is intentionally readable so /agenda can show prices,
-- durations and Cal.com links without requiring patient login.
drop policy if exists "public_select_nutritionist_settings" on public.nutritionist_settings;
create policy "public_select_nutritionist_settings"
  on public.nutritionist_settings for select
  to anon
  using (true);
