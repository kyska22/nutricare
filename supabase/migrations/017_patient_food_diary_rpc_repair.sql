-- Supabase does not rerun an edited migration file. Upgrade an already-created
-- diary table in place and publish the current multi-food RPC contract.
create table if not exists public.patient_food_diary_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.anonymous_patients(id) on delete cascade,
  eaten_on date not null default current_date,
  meal_type text not null,
  food_name text,
  amount_g numeric,
  kcal numeric,
  created_at timestamptz not null default now()
);

alter table public.patient_food_diary_entries add column if not exists food_name text;
alter table public.patient_food_diary_entries add column if not exists amount_g numeric;
alter table public.patient_food_diary_entries add column if not exists meal_type text;
do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
     where conrelid = 'public.patient_food_diary_entries'::regclass
       and contype = 'c' and pg_get_constraintdef(oid) ilike '%meal_type%'
  loop
    execute format('alter table public.patient_food_diary_entries drop constraint %I', constraint_name);
  end loop;
end; $$;
update public.patient_food_diary_entries set meal_type = 'snack' where meal_type is null;
alter table public.patient_food_diary_entries alter column meal_type set not null;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'patient_food_diary_entries' and column_name = 'description') then
    execute 'update public.patient_food_diary_entries set food_name = left(coalesce(nullif(trim(food_name), ''''), nullif(trim(description), ''''), ''Registro anterior''), 200) where food_name is null or trim(food_name) = ''''';
    execute 'alter table public.patient_food_diary_entries alter column description drop not null';
  else
    update public.patient_food_diary_entries set food_name = 'Registro anterior' where food_name is null or trim(food_name) = '';
  end if;
end; $$;
alter table public.patient_food_diary_entries alter column food_name set not null;

drop index if exists public.patient_food_diary_one_meal_per_day_idx;
alter table public.patient_food_diary_entries
  add constraint patient_food_diary_entries_meal_type_check
  check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack'));
create index if not exists patient_food_diary_patient_date_idx
  on public.patient_food_diary_entries(patient_id, eaten_on desc, created_at);
alter table public.patient_food_diary_entries enable row level security;
revoke all on public.patient_food_diary_entries from public, anon, authenticated;

drop function if exists public.get_patient_food_diary(date);
create function public.get_patient_food_diary(p_eaten_on date default current_date)
returns table(id uuid, eaten_on date, meal_type text, food_name text, amount_g numeric, kcal numeric, created_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return query select d.id, d.eaten_on, d.meal_type, d.food_name, d.amount_g, d.kcal, d.created_at
    from public.patient_food_diary_entries d
    join public.patient_accounts pa on pa.patient_id = d.patient_id
   where pa.user_id = auth.uid() and d.eaten_on = p_eaten_on
   order by d.created_at;
end; $$;

create or replace function public.get_patient_food_diary_week(p_start date)
returns table(eaten_on date, total_kcal numeric)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return query select d.eaten_on, coalesce(sum(d.kcal), 0)::numeric
    from public.patient_food_diary_entries d
    join public.patient_accounts pa on pa.patient_id = d.patient_id
   where pa.user_id = auth.uid() and d.eaten_on between p_start and p_start + 6
   group by d.eaten_on order by d.eaten_on;
end; $$;

create or replace function public.add_patient_food_diary_entry(
  p_eaten_on date, p_meal_type text, p_food_name text, p_amount_g numeric, p_kcal numeric
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_patient_id uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select patient_id into v_patient_id from public.patient_accounts where user_id = auth.uid();
  if v_patient_id is null then raise exception 'Patient account not found'; end if;
  if p_meal_type not in ('breakfast', 'lunch', 'dinner', 'snack')
     or length(trim(coalesce(p_food_name,''))) not between 1 and 200
     or p_amount_g is null or p_amount_g <= 0 or p_amount_g > 10000
     or p_kcal is null or p_kcal < 0 or p_kcal > 20000 then
    raise exception 'Invalid food entry';
  end if;
  insert into public.patient_food_diary_entries(patient_id, eaten_on, meal_type, food_name, amount_g, kcal)
  values (v_patient_id, coalesce(p_eaten_on, current_date), p_meal_type, trim(p_food_name), p_amount_g, p_kcal)
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.delete_patient_food_diary_entry(p_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_deleted integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.patient_food_diary_entries d using public.patient_accounts pa
   where d.id = p_id and d.patient_id = pa.patient_id and pa.user_id = auth.uid();
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end; $$;

revoke all on function public.get_patient_food_diary(date) from public, anon;
revoke all on function public.get_patient_food_diary_week(date) from public, anon;
revoke all on function public.add_patient_food_diary_entry(date,text,text,numeric,numeric) from public, anon;
revoke all on function public.delete_patient_food_diary_entry(uuid) from public, anon;
grant execute on function public.get_patient_food_diary(date) to authenticated;
grant execute on function public.get_patient_food_diary_week(date) to authenticated;
grant execute on function public.add_patient_food_diary_entry(date,text,text,numeric,numeric) to authenticated;
grant execute on function public.delete_patient_food_diary_entry(uuid) to authenticated;

notify pgrst, 'reload schema';
