create table if not exists public.patient_appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.anonymous_patients(id) on delete cascade,
  nutritionist_id uuid not null references public.nutritionists(id) on delete cascade,
  scheduled_at timestamptz not null,
  appointment_link text,
  notes text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint patient_appointments_secure_link
    check (appointment_link is null or appointment_link ~ '^https://')
);

create index if not exists patient_appointments_patient_schedule_idx
  on public.patient_appointments(patient_id, scheduled_at)
  where status = 'scheduled';

alter table public.patient_appointments enable row level security;
revoke all on public.patient_appointments from public, anon, authenticated;

create or replace function public.get_nutritionist_patient_overview(p_patient_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_nutritionist_id uuid;
  v_patient_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select id into v_nutritionist_id from public.nutritionists where user_id = v_user_id;
  if v_nutritionist_id is null then raise exception 'Nutritionist access required'; end if;

  select ap.id into v_patient_id
    from public.anonymous_patients ap
   where ap.patient_code = p_patient_code
     and exists (
       select 1 from public.evaluations e
       where e.patient_id = ap.id and e.nutritionist_id = v_nutritionist_id
     );
  if v_patient_id is null then raise exception 'Patient is not assigned to this nutritionist'; end if;

  select jsonb_build_object(
    'patient', jsonb_build_object(
      'id', ap.id,
      'patient_code', ap.patient_code,
      'created_at', ap.created_at
    ),
    'evaluations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'evaluation_date', e.evaluation_date,
        'consultation_type', e.consultation_type,
        'age', e.age,
        'sex', e.sex,
        'weight_kg', e.weight_kg,
        'height_m', e.height_m,
        'waist_cm', e.waist_cm,
        'hip_cm', e.hip_cm,
        'bmi', e.bmi,
        'bmi_classification', e.bmi_classification,
        'risk_level', e.risk_level,
        'total_energy_kcal', e.total_energy_kcal,
        'raw_results', e.raw_results
      ) order by e.evaluation_date desc)
      from public.evaluations e
      where e.patient_id = v_patient_id and e.nutritionist_id = v_nutritionist_id
    ), '[]'::jsonb),
    'packages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'total_sessions', p.total_sessions,
        'used_sessions', p.used_sessions,
        'remaining_sessions', p.remaining_sessions,
        'status', p.status
      ) order by p.created_at desc)
      from public.packages p where p.patient_id = v_patient_id
    ), '[]'::jsonb),
    'session_logs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sl.id,
        'session_date', sl.session_date,
        'session_type', sl.session_type,
        'notes', sl.notes
      ) order by sl.session_date desc)
      from public.session_logs sl
      join public.packages p on p.id = sl.package_id
      where p.patient_id = v_patient_id
    ), '[]'::jsonb),
    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'scheduled_at', a.scheduled_at,
        'appointment_link', a.appointment_link,
        'notes', a.notes,
        'status', a.status
      ) order by a.scheduled_at desc)
      from public.patient_appointments a
      where a.patient_id = v_patient_id and a.nutritionist_id = v_nutritionist_id
    ), '[]'::jsonb)
  ) into v_result
  from public.anonymous_patients ap
  where ap.id = v_patient_id;

  return v_result;
end;
$$;

create or replace function public.schedule_patient_appointment(
  p_patient_code text,
  p_scheduled_at timestamptz,
  p_appointment_link text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_nutritionist_id uuid;
  v_patient_id uuid;
  v_appointment public.patient_appointments%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select id into v_nutritionist_id from public.nutritionists where user_id = v_user_id;
  if v_nutritionist_id is null then raise exception 'Nutritionist access required'; end if;
  if p_scheduled_at is null or p_scheduled_at <= now() then
    raise exception 'Appointment must be scheduled in the future';
  end if;
  if p_appointment_link is not null and p_appointment_link !~ '^https://' then
    raise exception 'Appointment link must use HTTPS';
  end if;
  if length(coalesce(p_notes, '')) > 2000 then raise exception 'Appointment notes are too long'; end if;

  select ap.id into v_patient_id
    from public.anonymous_patients ap
   where ap.patient_code = p_patient_code
     and exists (
       select 1 from public.evaluations e
       where e.patient_id = ap.id and e.nutritionist_id = v_nutritionist_id
     );
  if v_patient_id is null then raise exception 'Patient is not assigned to this nutritionist'; end if;

  insert into public.patient_appointments(
    patient_id, nutritionist_id, scheduled_at, appointment_link, notes
  ) values (
    v_patient_id,
    v_nutritionist_id,
    p_scheduled_at,
    nullif(trim(p_appointment_link), ''),
    nullif(trim(p_notes), '')
  ) returning * into v_appointment;

  return to_jsonb(v_appointment);
end;
$$;

create or replace function public.get_patient_upcoming_appointments()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_patient_id uuid;
  v_appointments jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select patient_id into v_patient_id from public.patient_accounts where user_id = v_user_id;
  if v_patient_id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'scheduled_at', a.scheduled_at,
    'appointment_link', a.appointment_link,
    'notes', a.notes,
    'nutritionist_name', n.full_name
  ) order by a.scheduled_at asc), '[]'::jsonb)
    into v_appointments
    from public.patient_appointments a
    join public.nutritionists n on n.id = a.nutritionist_id
   where a.patient_id = v_patient_id
     and a.status = 'scheduled'
     and a.scheduled_at >= now();
  return v_appointments;
end;
$$;

revoke all on function public.get_nutritionist_patient_overview(text) from public, anon;
grant execute on function public.get_nutritionist_patient_overview(text) to authenticated;
revoke all on function public.schedule_patient_appointment(text, timestamptz, text, text) from public, anon;
grant execute on function public.schedule_patient_appointment(text, timestamptz, text, text) to authenticated;
revoke all on function public.get_patient_upcoming_appointments() from public, anon;
grant execute on function public.get_patient_upcoming_appointments() to authenticated;
