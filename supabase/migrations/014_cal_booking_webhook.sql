alter table public.patient_appointments
  add column if not exists external_booking_uid text;

create unique index if not exists patient_appointments_external_booking_uid_idx
  on public.patient_appointments(external_booking_uid)
  where external_booking_uid is not null;

create or replace function public.sync_cal_patient_appointment(
  p_trigger_event text,
  p_booking_uid text,
  p_rescheduled_from_uid text,
  p_patient_email text,
  p_nutritionist_email text,
  p_scheduled_at timestamptz,
  p_appointment_link text
) returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_patient_id uuid;
  v_nutritionist_id uuid;
begin
  if p_trigger_event not in ('BOOKING_CREATED', 'BOOKING_RESCHEDULED', 'BOOKING_CANCELLED')
     or p_booking_uid is null or length(p_booking_uid) > 255 then
    raise exception 'Invalid Cal.com booking event';
  end if;

  if p_trigger_event = 'BOOKING_CANCELLED' then
    update public.patient_appointments
       set status = 'cancelled'
     where external_booking_uid = p_booking_uid;
    return 'cancelled';
  end if;

  if p_patient_email is null or p_nutritionist_email is null or p_scheduled_at is null then
    raise exception 'Booking is missing required details';
  end if;
  if p_rescheduled_from_uid is not null then
    update public.patient_appointments
       set status = 'cancelled'
     where external_booking_uid = p_rescheduled_from_uid;
  end if;

  select pa.patient_id into v_patient_id
    from public.patient_accounts pa
    join auth.users u on u.id = pa.user_id
   where lower(u.email) = lower(trim(p_patient_email))
     and u.email_confirmed_at is not null;
  if v_patient_id is null then return 'patient_not_linked'; end if;

  select n.id into v_nutritionist_id
    from public.nutritionists n
   where lower(n.email) = lower(trim(p_nutritionist_email));
  if v_nutritionist_id is null then return 'nutritionist_not_found'; end if;

  insert into public.patient_appointments(
    patient_id, nutritionist_id, scheduled_at, appointment_link, status, external_booking_uid
  ) values (
    v_patient_id,
    v_nutritionist_id,
    p_scheduled_at,
    case when p_appointment_link like 'https://%' then p_appointment_link else null end,
    'scheduled',
    p_booking_uid
  )
  on conflict (external_booking_uid) where external_booking_uid is not null
  do update set
    patient_id = excluded.patient_id,
    nutritionist_id = excluded.nutritionist_id,
    scheduled_at = excluded.scheduled_at,
    appointment_link = excluded.appointment_link,
    status = 'scheduled';

  return 'scheduled';
end;
$$;

revoke all on function public.sync_cal_patient_appointment(text, text, text, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.sync_cal_patient_appointment(text, text, text, text, text, timestamptz, text) to service_role;
