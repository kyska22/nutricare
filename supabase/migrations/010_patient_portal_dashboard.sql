-- Secure patient dashboard data behind the authenticated patient's own account.
create or replace function public.get_patient_portal_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_patient_id uuid;
  v_result jsonb;
  v_account_type text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select patient_id into v_patient_id
    from public.patient_accounts
   where user_id = v_user_id;

  if v_patient_id is null then
    select raw_user_meta_data->>'account_type' into v_account_type
      from auth.users where id = v_user_id;
    if v_account_type <> 'patient' or exists (
      select 1 from public.nutritionists where user_id = v_user_id
    ) then
      raise exception 'Patient profile not found';
    end if;
    insert into public.anonymous_patients(patient_code)
      values ('NJF-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 16)))
      returning id into v_patient_id;
    insert into public.patient_accounts(user_id, patient_id)
      values (v_user_id, v_patient_id);
  end if;

  -- Patient accounts include a standard ten-session package unless a package
  -- has already been assigned by the nutritionist.
  perform pg_advisory_xact_lock(hashtextextended(v_patient_id::text, 0));
  if not exists (select 1 from public.packages where patient_id = v_patient_id) then
    insert into public.packages(patient_id, total_sessions, used_sessions, status)
    values (v_patient_id, 10, 0, 'active');
  end if;

  select jsonb_build_object(
    'patient_code', ap.patient_code,
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
    'evaluations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'evaluation_date', e.evaluation_date,
        'weight_kg', e.weight_kg,
        'age', e.age,
        'sex', e.sex,
        'bmi', e.bmi,
        'bmi_classification', e.bmi_classification,
        'waist_cm', e.waist_cm,
        'risk_level', e.risk_level,
        'total_energy_kcal', e.total_energy_kcal,
        'daily_water_liters', e.daily_water_liters,
        'recommendations', e.recommendations,
        'follow_up_plan', e.follow_up_plan,
        'professional_review', coalesce(e.raw_results #> '{professionalReview}', '{}'::jsonb)
      ) order by e.evaluation_date asc)
      from public.evaluations e where e.patient_id = v_patient_id
    ), '[]'::jsonb)
  ) into v_result
  from public.anonymous_patients ap
  where ap.id = v_patient_id;

  return v_result;
end;
$$;

revoke all on function public.get_patient_portal_dashboard() from public, anon;
grant execute on function public.get_patient_portal_dashboard() to authenticated;
