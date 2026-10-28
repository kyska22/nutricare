-- Public submission is mediated by an unguessable, nutritionist-owned invitation.
create table if not exists public.evaluation_invitations (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.nutritionists(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.evaluation_invitations enable row level security;
alter table public.evaluations add column if not exists invitation_id uuid
  references public.evaluation_invitations(id) on delete set null;
create unique index if not exists evaluations_invitation_id_unique
  on public.evaluations(invitation_id) where invitation_id is not null;
revoke all on public.evaluation_invitations from anon, authenticated;

create or replace function public.create_evaluation_invitation()
returns text language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare v_nutritionist uuid; v_token text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into v_nutritionist from public.nutritionists where user_id = auth.uid();
  if v_nutritionist is null then raise exception 'Nutritionist profile not found'; end if;
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into public.evaluation_invitations(nutritionist_id, token_hash)
  values (v_nutritionist, digest(v_token, 'sha256'));
  return v_token;
end;
$$;

create or replace function public.submit_public_evaluation(
  p_token text, p_idempotency_key text, p_payload jsonb
) returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare v_invitation public.evaluation_invitations%rowtype;
  v_patient_id uuid; v_patient_code text; v_eval_id uuid; v_form jsonb;
  v_personal jsonb; v_anthro jsonb; v_psych jsonb; v_assessment jsonb;
  v_review jsonb;
begin
  if p_token is null or length(p_token) <> 64 or p_idempotency_key is null
     or length(p_idempotency_key) < 16 or length(p_idempotency_key) > 128 then
    raise exception 'Invalid invitation or submission key';
  end if;
  select * into v_invitation from public.evaluation_invitations
   where token_hash = digest(p_token, 'sha256') and revoked_at is null and expires_at > now();
  if not found then raise exception 'Invitation is invalid or expired'; end if;

  -- A replay for this invitation returns the same evaluation without inserting rows.
  select e.id, e.patient_id, ap.patient_code into v_eval_id, v_patient_id, v_patient_code
    from public.evaluations e join public.anonymous_patients ap on ap.id=e.patient_id
   where e.nutritionist_id=v_invitation.nutritionist_id and e.idempotency_key=p_idempotency_key;
  if found then return jsonb_build_object('id', v_eval_id, 'patient_id', v_patient_id, 'patient_code', v_patient_code); end if;
  if exists (select 1 from public.evaluations where invitation_id=v_invitation.id) then
    raise exception 'Invitation has already been submitted';
  end if;

  v_form := p_payload->'formData'; v_personal := v_form->'personalInformation';
  v_anthro := v_form->'anthropometrics'; v_psych := v_form->'psychobiological';
  v_assessment := p_payload->'assessment'; v_review := p_payload->'professionalReview';
  if jsonb_typeof(v_form) <> 'object' or jsonb_typeof(v_anthro) <> 'object'
     or jsonb_typeof(v_assessment) <> 'object' then raise exception 'Invalid assessment payload'; end if;
  v_patient_code := 'NJF-' || upper(substr(encode(gen_random_bytes(12), 'hex'), 1, 16));
  insert into public.anonymous_patients(patient_code) values (v_patient_code) returning id into v_patient_id;
  insert into public.evaluations(
    patient_id, nutritionist_id, invitation_id, idempotency_key, evaluation_date, consultation_type,
    sex, age, weight_kg, height_m, waist_cm, hip_cm, daily_water_liters, bmi,
    bmi_classification, waist_hip_index, risk_level, body_fat_percentage, fat_mass_kg,
    fat_free_mass_kg, muscle_mass_kg, resting_energy_kcal, total_energy_kcal, raw_results,
    nutritionist_notes, recommendations, follow_up_plan
  ) values (
    v_patient_id, v_invitation.nutritionist_id, v_invitation.id, p_idempotency_key,
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
exception when unique_violation then
  select e.id, e.patient_id, ap.patient_code into v_eval_id, v_patient_id, v_patient_code
    from public.evaluations e join public.anonymous_patients ap on ap.id=e.patient_id
   where e.nutritionist_id=v_invitation.nutritionist_id and e.idempotency_key=p_idempotency_key;
  if found then return jsonb_build_object('id', v_eval_id, 'patient_id', v_patient_id, 'patient_code', v_patient_code); end if;
  raise;
end;
$$;

revoke all on function public.create_evaluation_invitation() from public, anon;
grant execute on function public.create_evaluation_invitation() to authenticated;
revoke all on function public.submit_public_evaluation(text,text,jsonb) from public, authenticated;
grant execute on function public.submit_public_evaluation(text,text,jsonb) to anon, authenticated;

-- Remove legacy public policies and disallow unscoped records in professional review.
drop policy if exists "demo_select_anonymous_patients" on public.anonymous_patients;
drop policy if exists "demo_insert_anonymous_patients" on public.anonymous_patients;
drop policy if exists "demo_select_evaluations" on public.evaluations;
drop policy if exists "demo_insert_evaluations" on public.evaluations;
drop policy if exists "demo_update_evaluations" on public.evaluations;
drop policy if exists "nutritionists_select_own_evaluations" on public.evaluations;
create policy "nutritionists_select_own_evaluations" on public.evaluations for select to authenticated
using (exists (select 1 from public.nutritionists n where n.id=evaluations.nutritionist_id and n.user_id=auth.uid()));
drop policy if exists "nutritionists_update_own_evaluations" on public.evaluations;
create policy "nutritionists_update_own_evaluations" on public.evaluations for update to authenticated
using (exists (select 1 from public.nutritionists n where n.id=evaluations.nutritionist_id and n.user_id=auth.uid()))
with check (exists (select 1 from public.nutritionists n where n.id=evaluations.nutritionist_id and n.user_id=auth.uid()));

drop policy if exists "authenticated_select_anonymous_patients" on public.anonymous_patients;
create policy "nutritionists_select_owned_patients" on public.anonymous_patients for select to authenticated
using (exists (select 1 from public.evaluations e join public.nutritionists n on n.id=e.nutritionist_id
  where e.patient_id=anonymous_patients.id and n.user_id=auth.uid()));
drop policy if exists "authenticated_insert_anonymous_patients" on public.anonymous_patients;
