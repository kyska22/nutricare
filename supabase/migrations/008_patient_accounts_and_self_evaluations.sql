-- Give each authenticated patient a private, pseudonymous clinical profile.
-- The profile is created lazily when the patient first saves an evaluation.
create table if not exists public.patient_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  patient_id uuid not null unique references public.anonymous_patients(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.patient_accounts enable row level security;
revoke all on public.patient_accounts from anon, authenticated;

create or replace function public.create_patient_account_for_auth_user()
returns trigger
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_patient_id uuid;
  v_patient_code text;
begin
  if new.raw_user_meta_data->>'account_type' = 'patient' then
    v_patient_code := 'NJF-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 16));
    insert into public.anonymous_patients(patient_code) values (v_patient_code) returning id into v_patient_id;
    insert into public.patient_accounts(user_id, patient_id) values (new.id, v_patient_id);
  end if;
  return new;
end;
$$;

drop trigger if exists create_patient_account_after_signup on auth.users;
create trigger create_patient_account_after_signup
  after insert on auth.users
  for each row execute function public.create_patient_account_for_auth_user();
revoke all on function public.create_patient_account_for_auth_user() from public, anon, authenticated;

create or replace function public.link_patient_evaluation(p_evaluation_id uuid, p_token text)
returns text
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_patient_id uuid;
  v_existing_id uuid;
  v_code text;
  v_invitation_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_token is null or length(p_token) <> 64 then raise exception 'Invalid invitation'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select patient_id, invitation_id into v_patient_id, v_invitation_id
    from public.evaluations where id = p_evaluation_id;
  if v_patient_id is null then raise exception 'Evaluation not found'; end if;
  if not exists (select 1 from public.evaluation_invitations
    where id = v_invitation_id and token_hash = digest(p_token, 'sha256')) then
    raise exception 'Evaluation does not belong to this invitation';
  end if;
  select patient_id into v_existing_id from public.patient_accounts where user_id = v_user_id;
  if v_existing_id is null then
    insert into public.patient_accounts(user_id, patient_id) values (v_user_id, v_patient_id);
  elsif v_existing_id <> v_patient_id then
    -- An account keeps one stable profile. Attach this invited report to it.
    update public.evaluations set patient_id = v_existing_id where id = p_evaluation_id;
    delete from public.anonymous_patients ap
      where ap.id = v_patient_id
        and not exists (select 1 from public.evaluations e where e.patient_id = ap.id);
    v_patient_id := v_existing_id;
  end if;
  select patient_code into v_code from public.anonymous_patients where id = v_patient_id;
  return v_code;
end;
$$;

create or replace function public.submit_patient_evaluation(
  p_idempotency_key text,
  p_payload jsonb
) returns jsonb
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_patient_id uuid;
  v_patient_code text;
  v_eval_id uuid;
  v_form jsonb;
  v_personal jsonb;
  v_anthro jsonb;
  v_psych jsonb;
  v_assessment jsonb;
  v_review jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 16 or length(p_idempotency_key) > 128 then
    raise exception 'Invalid submission key';
  end if;
  v_form := p_payload->'formData';
  v_personal := v_form->'personalInformation';
  v_anthro := v_form->'anthropometrics';
  v_psych := v_form->'psychobiological';
  v_assessment := p_payload->'assessment';
  -- A self-submitted report must not store patient-entered text as a
  -- nutritionist's professional review.
  v_review := '{}'::jsonb;
  if jsonb_typeof(v_form) <> 'object' or jsonb_typeof(v_anthro) <> 'object'
     or jsonb_typeof(v_assessment) <> 'object' then
    raise exception 'Invalid assessment payload';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select pa.patient_id, ap.patient_code into v_patient_id, v_patient_code
    from public.patient_accounts pa join public.anonymous_patients ap on ap.id = pa.patient_id
   where pa.user_id = v_user_id;
  if v_patient_id is null then
    v_patient_code := 'NJF-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 16));
    insert into public.anonymous_patients(patient_code) values (v_patient_code) returning id into v_patient_id;
    insert into public.patient_accounts(user_id, patient_id) values (v_user_id, v_patient_id);
  end if;

  select e.id into v_eval_id from public.evaluations e
   where e.patient_id = v_patient_id and e.idempotency_key = p_idempotency_key;
  if v_eval_id is not null then
    return jsonb_build_object('id', v_eval_id, 'patient_id', v_patient_id, 'patient_code', v_patient_code);
  end if;

  insert into public.evaluations(
    patient_id, nutritionist_id, idempotency_key, evaluation_date, consultation_type,
    sex, age, weight_kg, height_m, waist_cm, hip_cm, daily_water_liters, bmi,
    bmi_classification, waist_hip_index, risk_level, body_fat_percentage, fat_mass_kg,
    fat_free_mass_kg, muscle_mass_kg, resting_energy_kcal, total_energy_kcal, raw_results,
    nutritionist_notes, recommendations, follow_up_plan
  ) values (
    v_patient_id, null, p_idempotency_key,
    coalesce((p_payload->>'evaluationDate')::timestamptz, now()),
    v_personal->>'consultationType', v_anthro->>'sex', nullif(v_anthro->>'age','')::integer,
    nullif(v_anthro->>'weightKg','')::numeric, nullif(v_anthro->>'heightMeters','')::numeric,
    nullif(v_anthro->>'abdominalCircumferenceCm','')::numeric,
    nullif(v_anthro->>'hipCircumferenceCm','')::numeric,
    nullif(v_psych->>'dailyWaterLiters','')::numeric,
    nullif(v_assessment#>>'{bmi,value}','')::numeric, v_assessment#>>'{bmi,classification}',
    nullif(v_assessment#>>'{waistHipRatio,value}','')::numeric,
    v_assessment#>>'{waistHeightRatio,classification}',
    nullif(v_assessment#>>'{bodyFat,percentage}','')::numeric,
    nullif(v_assessment#>>'{bodyComposition,fatMassKg}','')::numeric,
    nullif(v_assessment#>>'{bodyComposition,fatFreeMassKg}','')::numeric,
    nullif(v_assessment#>>'{bodyComposition,muscleMassKg}','')::numeric,
    nullif(v_assessment#>>'{restingEnergyExpenditure,valueKcal}','')::numeric,
    nullif(v_assessment#>>'{totalEnergyExpenditure,valueKcal}','')::numeric,
    jsonb_build_object(
      'schemaVersion','2.1',
      'clinicalData', jsonb_build_object(
        'personalInformation', jsonb_build_object(
          'consultationType',v_personal->'consultationType',
          'sex',coalesce(v_personal->'sex',v_anthro->'sex'),
          'consultationReasons',coalesce(v_personal->'consultationReasons','[]'::jsonb),
          'otherConsultationReason',v_personal->'otherConsultationReason'),
        'personalHistory',v_form->'personalHistory', 'familyHistory',v_form->'familyHistory',
        'psychobiological',v_form->'psychobiological', 'gastrointestinal',v_form->'gastrointestinal',
        'dietaryHabits',v_form->'dietaryHabits', 'recall24Hours',v_form->'recall24Hours',
        'anthropometrics',v_form->'anthropometrics'),
      'assessment',v_assessment,
      'automaticObservations',coalesce(p_payload->'automaticObservations','[]'::jsonb),
      'professionalReview',coalesce(v_review,'{}'::jsonb)),
    nullif(v_review->>'nutritionistObservations',''),
    nullif(v_review->>'recommendations',''), nullif(v_review->>'followUpPlan','')
  ) returning id into v_eval_id;
  return jsonb_build_object('id', v_eval_id, 'patient_id', v_patient_id, 'patient_code', v_patient_code);
end;
$$;

revoke all on function public.link_patient_evaluation(uuid,text) from public, anon;
grant execute on function public.link_patient_evaluation(uuid,text) to authenticated;
revoke all on function public.submit_patient_evaluation(text,jsonb) from public, anon;
grant execute on function public.submit_patient_evaluation(text,jsonb) to authenticated;
