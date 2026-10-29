-- Allow a nutritionist to delete only evaluations assigned to their profile.
grant delete on public.evaluations to authenticated;

drop policy if exists "nutritionists_delete_own_evaluations" on public.evaluations;
create policy "nutritionists_delete_own_evaluations"
  on public.evaluations for delete to authenticated
  using (
    exists (
      select 1
      from public.nutritionists n
      where n.id = evaluations.nutritionist_id
        and n.user_id = auth.uid()
    )
  );
