create table if not exists public.patient_food_diary_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.anonymous_patients(id) on delete cascade,
  eaten_on date not null default current_date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text not null check (length(trim(food_name)) between 1 and 200),
  amount_g numeric not null check (amount_g > 0 and amount_g <= 10000),
  kcal numeric not null check (kcal >= 0 and kcal <= 20000),
  created_at timestamptz not null default now()
);
create index if not exists patient_food_diary_patient_date_idx
  on public.patient_food_diary_entries(patient_id, eaten_on desc, created_at);
alter table public.patient_food_diary_entries enable row level security;
revoke all on public.patient_food_diary_entries from public, anon, authenticated;

create or replace function public.get_patient_food_diary(p_eaten_on date default current_date)
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
  return query select d.eaten_on, sum(d.kcal)::numeric
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
