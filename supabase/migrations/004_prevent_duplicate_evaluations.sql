-- 003 is already used by the editable professional review migration.
alter table public.evaluations
  add column if not exists idempotency_key text;

create unique index if not exists evaluations_idempotency_key_unique
  on public.evaluations(idempotency_key);
