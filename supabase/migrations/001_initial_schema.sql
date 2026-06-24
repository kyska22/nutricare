-- Initial anonymous persistence schema for NutriJenhFit.
-- This phase intentionally avoids storing patient-identifying data.

create extension if not exists pgcrypto;

create table if not exists public.anonymous_patients (
  id uuid primary key default gen_random_uuid(),
  patient_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.anonymous_patients(id) on delete cascade,
  evaluation_date timestamptz not null default now(),
  consultation_type text,
  sex text,
  age integer,
  weight_kg numeric,
  height_m numeric,
  waist_cm numeric,
  hip_cm numeric,
  daily_water_liters numeric,
  bmi numeric,
  bmi_classification text,
  waist_hip_index numeric,
  risk_level text,
  body_fat_percentage numeric,
  fat_mass_kg numeric,
  fat_free_mass_kg numeric,
  muscle_mass_kg numeric,
  resting_energy_kcal numeric,
  total_energy_kcal numeric,
  idempotency_key text,
  raw_results jsonb,
  nutritionist_notes text,
  recommendations text,
  follow_up_plan text,
  created_at timestamptz not null default now()
);

create unique index if not exists evaluations_idempotency_key_unique
  on public.evaluations(idempotency_key);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.anonymous_patients(id) on delete cascade,
  total_sessions integer not null default 10 check (total_sessions >= 0),
  used_sessions integer not null default 0 check (used_sessions >= 0),
  remaining_sessions integer generated always as (greatest(total_sessions - used_sessions, 0)) stored,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.session_logs (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  evaluation_id uuid references public.evaluations(id) on delete set null,
  session_date timestamptz not null default now(),
  session_type text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.anonymous_patients enable row level security;
alter table public.evaluations enable row level security;
alter table public.packages enable row level security;
alter table public.session_logs enable row level security;

-- Demo policies for the no-login phase.
-- TODO: Replace these policies with nutritionist/patient auth ownership rules.
create policy "demo_select_anonymous_patients"
  on public.anonymous_patients for select
  to anon
  using (true);

create policy "demo_insert_anonymous_patients"
  on public.anonymous_patients for insert
  to anon
  with check (true);

create policy "demo_select_evaluations"
  on public.evaluations for select
  to anon
  using (true);

create policy "demo_insert_evaluations"
  on public.evaluations for insert
  to anon
  with check (true);

create policy "demo_update_evaluations"
  on public.evaluations for update
  to anon
  using (true)
  with check (true);

create policy "demo_select_packages"
  on public.packages for select
  to anon
  using (true);

create policy "demo_insert_packages"
  on public.packages for insert
  to anon
  with check (true);

create policy "demo_update_packages"
  on public.packages for update
  to anon
  using (true)
  with check (true);

create policy "demo_select_session_logs"
  on public.session_logs for select
  to anon
  using (true);

create policy "demo_insert_session_logs"
  on public.session_logs for insert
  to anon
  with check (true);
