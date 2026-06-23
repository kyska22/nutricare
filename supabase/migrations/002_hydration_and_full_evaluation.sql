-- Adds liters-based hydration for projects that already applied 001.
alter table public.evaluations
  add column if not exists daily_water_liters numeric;

comment on column public.evaluations.daily_water_liters is
  'Patient-reported daily water consumption in liters.';

-- Existing hydration_habit data is preserved when that legacy column exists.
-- New application writes use daily_water_liters exclusively.
