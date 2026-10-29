-- Let a nutritionist adjust a patient's remaining sessions for appointments
-- arranged outside the public booking flow.
create or replace function public.get_patient_session_package(p_patient_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_nutritionist_id uuid;
  v_patient_id uuid;
  v_package jsonb;
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

  select to_jsonb(p) into v_package
    from public.packages p
   where p.patient_id = v_patient_id and p.status = 'active'
   order by p.created_at desc
   limit 1;
  return v_package;
end;
$$;

create or replace function public.set_patient_remaining_sessions(
  p_patient_code text,
  p_remaining_sessions integer
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
  v_package public.packages%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_remaining_sessions is null or p_remaining_sessions < 0 or p_remaining_sessions > 500 then
    raise exception 'Remaining sessions must be between 0 and 500';
  end if;

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

  perform pg_advisory_xact_lock(hashtextextended(v_patient_id::text, 0));
  select * into v_package
    from public.packages p
   where p.patient_id = v_patient_id and p.status = 'active'
   order by p.created_at desc
   limit 1
   for update;

  if v_package.id is null then
    insert into public.packages(patient_id, total_sessions, used_sessions, status)
    values (v_patient_id, p_remaining_sessions, 0, 'active')
    returning * into v_package;
  else
    update public.packages
       set total_sessions = v_package.used_sessions + p_remaining_sessions
     where id = v_package.id
     returning * into v_package;
  end if;

  return to_jsonb(v_package);
end;
$$;

revoke all on function public.get_patient_session_package(text) from public, anon;
grant execute on function public.get_patient_session_package(text) to authenticated;
revoke all on function public.set_patient_remaining_sessions(text, integer) from public, anon;
grant execute on function public.set_patient_remaining_sessions(text, integer) to authenticated;
