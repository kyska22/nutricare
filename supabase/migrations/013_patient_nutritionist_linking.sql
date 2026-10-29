-- Keep explicit patient/nutritionist ownership and allow a patient to claim
-- invitation-based anonymous history when they create or access an account.
create table if not exists public.patient_nutritionists (
  patient_id uuid not null references public.anonymous_patients(id) on delete cascade,
  nutritionist_id uuid not null references public.nutritionists(id) on delete cascade,
  association_source text not null default 'manual'
    check (association_source in ('manual', 'invitation')),
  created_at timestamptz not null default now(),
  primary key (patient_id, nutritionist_id)
);

alter table public.patient_nutritionists enable row level security;
revoke all on public.patient_nutritionists from public, anon, authenticated;

create or replace function public.associate_patient_with_current_nutritionist(p_patient_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_nutritionist_id uuid;
  v_patient_id uuid;
  v_linked_evaluations integer := 0;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select id into v_nutritionist_id from public.nutritionists where user_id = v_user_id;
  if v_nutritionist_id is null then raise exception 'Nutritionist access required'; end if;

  select ap.id into v_patient_id
    from public.anonymous_patients ap
   where ap.patient_code = upper(trim(p_patient_code));
  if v_patient_id is null then raise exception 'Patient not found'; end if;

  if not exists (
    select 1 from public.evaluations e
    where e.patient_id = v_patient_id
      and (e.nutritionist_id is null or e.nutritionist_id = v_nutritionist_id)
      and (e.invitation_id is null or exists (
        select 1 from public.evaluation_invitations i
        where i.id = e.invitation_id and i.nutritionist_id = v_nutritionist_id
      ))
  ) then
    raise exception 'Patient has no unassigned evaluation for this nutritionist';
  end if;

  insert into public.patient_nutritionists(patient_id, nutritionist_id, association_source)
  values (v_patient_id, v_nutritionist_id, 'manual')
  on conflict (patient_id, nutritionist_id) do nothing;

  update public.evaluations
     set nutritionist_id = v_nutritionist_id
   where patient_id = v_patient_id
     and nutritionist_id is null
     and (invitation_id is null or exists (
       select 1 from public.evaluation_invitations i
       where i.id = evaluations.invitation_id and i.nutritionist_id = v_nutritionist_id
     ));
  get diagnostics v_linked_evaluations = row_count;

  return jsonb_build_object(
    'patient_code', upper(trim(p_patient_code)),
    'linked_evaluations', v_linked_evaluations
  );
end;
$$;

create or replace function public.link_patient_evaluation(p_evaluation_id uuid, p_token text)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_source_patient_id uuid;
  v_target_patient_id uuid;
  v_invitation_id uuid;
  v_nutritionist_id uuid;
  v_patient_code text;
  v_related_patient_ids uuid[];
  v_user_email text;
  v_user_email_verified boolean := false;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_token is null or length(p_token) <> 64 then raise exception 'Invalid invitation'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select e.patient_id, e.invitation_id, i.nutritionist_id
    into v_source_patient_id, v_invitation_id, v_nutritionist_id
    from public.evaluations e
    join public.evaluation_invitations i on i.id = e.invitation_id
   where e.id = p_evaluation_id
     and i.token_hash = digest(p_token, 'sha256');
  if v_source_patient_id is null then
    raise exception 'Evaluation does not belong to this invitation';
  end if;

  select patient_id into v_target_patient_id
    from public.patient_accounts where user_id = v_user_id;

  select email, email_confirmed_at is not null
    into v_user_email, v_user_email_verified
    from auth.users where id = v_user_id;
  if exists (
    select 1 from public.patient_accounts
    where patient_id = v_source_patient_id and user_id <> v_user_id
  ) then
    raise exception 'Anonymous patient history is already linked to another account';
  end if;

  if v_target_patient_id is null then
    insert into public.patient_accounts(user_id, patient_id)
    values (v_user_id, v_source_patient_id);
    v_target_patient_id := v_source_patient_id;
  elsif v_target_patient_id <> v_source_patient_id then
    select array_agg(distinct patient_id) into v_related_patient_ids
    from (
      select v_source_patient_id as patient_id
      union all
      select e.patient_id
      from public.evaluations e
      where v_user_email_verified
        and v_user_email is not null
        and length(trim(v_user_email)) > 0
        and e.nutritionist_id = v_nutritionist_id
        and e.patient_id <> v_target_patient_id
        and lower(coalesce(
          nullif(e.raw_results #>> '{clinicalData,personalInformation,email}', ''),
          nullif(e.raw_results #>> '{formData,personalInformation,email}', ''),
          nullif(e.raw_results #>> '{personalInformation,email}', '')
        )) = lower(v_user_email)
    ) related;

    update public.evaluations
       set patient_id = v_target_patient_id
     where patient_id = any(coalesce(v_related_patient_ids, array[]::uuid[]));
    update public.packages
       set patient_id = v_target_patient_id
     where patient_id = any(coalesce(v_related_patient_ids, array[]::uuid[]));
    update public.patient_appointments
       set patient_id = v_target_patient_id
     where patient_id = any(coalesce(v_related_patient_ids, array[]::uuid[]));

    delete from public.anonymous_patients ap
     where ap.id = any(coalesce(v_related_patient_ids, array[]::uuid[]))
       and not exists (select 1 from public.evaluations e where e.patient_id = ap.id)
       and not exists (select 1 from public.packages p where p.patient_id = ap.id)
       and not exists (select 1 from public.patient_appointments a where a.patient_id = ap.id)
       and not exists (select 1 from public.patient_accounts pa where pa.patient_id = ap.id);
  end if;

  insert into public.patient_nutritionists(patient_id, nutritionist_id, association_source)
  values (v_target_patient_id, v_nutritionist_id, 'invitation')
  on conflict (patient_id, nutritionist_id) do update
    set association_source = 'invitation';

  select patient_code into v_patient_code
    from public.anonymous_patients where id = v_target_patient_id;
  return v_patient_code;
end;
$$;

create or replace function public.claim_patient_history_from_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_evaluation_id uuid;
  v_patient_code text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_token is null or length(p_token) <> 64 then raise exception 'Invalid invitation'; end if;

  select e.id into v_evaluation_id
    from public.evaluations e
    join public.evaluation_invitations i on i.id = e.invitation_id
   where i.token_hash = digest(p_token, 'sha256')
   order by e.evaluation_date desc
   limit 1;

  if v_evaluation_id is null then
    return jsonb_build_object('linked', false);
  end if;

  v_patient_code := public.link_patient_evaluation(v_evaluation_id, p_token);
  return jsonb_build_object('linked', true, 'patient_code', v_patient_code);
end;
$$;

revoke all on function public.associate_patient_with_current_nutritionist(text) from public, anon;
grant execute on function public.associate_patient_with_current_nutritionist(text) to authenticated;
revoke all on function public.link_patient_evaluation(uuid, text) from public, anon;
grant execute on function public.link_patient_evaluation(uuid, text) to authenticated;
revoke all on function public.claim_patient_history_from_invitation(text) from public, anon;
grant execute on function public.claim_patient_history_from_invitation(text) to authenticated;
