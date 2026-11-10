create table if not exists public.patient_followup_profiles (
  patient_id uuid primary key references public.anonymous_patients(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.patient_followup_profiles enable row level security;
revoke all on public.patient_followup_profiles from public, anon, authenticated;

create or replace function public.save_patient_followup_profile(p_profile jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_patient_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_profile) <> 'object' then raise exception 'Invalid profile'; end if;
  select patient_id into v_patient_id from public.patient_accounts where user_id = auth.uid();
  if v_patient_id is null then raise exception 'Patient account not found'; end if;
  insert into public.patient_followup_profiles(patient_id, profile, updated_at)
  values (v_patient_id, jsonb_build_object(
    'firstName', left(coalesce(p_profile->>'firstName',''), 120),
    'lastName', left(coalesce(p_profile->>'lastName',''), 120),
    'email', left(coalesce(p_profile->>'email',''), 254),
    'phone', left(coalesce(p_profile->>'phone',''), 60),
    'country', left(coalesce(p_profile->>'country',''), 100),
    'occupation', left(coalesce(p_profile->>'occupation',''), 120),
    'birthDate', p_profile->'birthDate',
    'sex', coalesce(p_profile->'sex','null'::jsonb),
    'consultationModality', coalesce(p_profile->'consultationModality','"online"'::jsonb)
  ), now())
  on conflict (patient_id) do update set profile = excluded.profile, updated_at = now();
  return true;
end; $$;

create or replace function public.get_patient_followup_profile()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_patient_id uuid; v_profile jsonb; v_evaluation public.evaluations%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select patient_id into v_patient_id from public.patient_accounts where user_id = auth.uid();
  if v_patient_id is null then return jsonb_build_object('has_previous_evaluation', false); end if;
  select * into v_evaluation from public.evaluations where patient_id = v_patient_id order by evaluation_date desc limit 1;
  if not found then return jsonb_build_object('has_previous_evaluation', false); end if;
  select profile into v_profile from public.patient_followup_profiles where patient_id = v_patient_id;
  return jsonb_build_object(
    'has_previous_evaluation', true,
    'has_personal_profile', coalesce(length(trim(v_profile->>'firstName')) > 0, false),
    'profile', coalesce(v_profile, '{}'::jsonb) || jsonb_build_object('email', (select email from auth.users where id = auth.uid())),
    'age', v_evaluation.age,
    'sex', v_evaluation.sex,
    'consultation_type', v_evaluation.consultation_type
  );
end; $$;

revoke all on function public.save_patient_followup_profile(jsonb) from public, anon;
revoke all on function public.get_patient_followup_profile() from public, anon;
grant execute on function public.save_patient_followup_profile(jsonb) to authenticated;
grant execute on function public.get_patient_followup_profile() to authenticated;
