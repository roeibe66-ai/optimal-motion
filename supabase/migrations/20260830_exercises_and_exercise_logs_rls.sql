-- exercises: RLS was disabled entirely (fully open to the anon key) despite
-- being the real, actively-used exercise library. Unlike packages/
-- package_exercises, this one IS patient-facing for reads (DIY builder,
-- exercise info screens, PlanTab muscle diagram all select from it via
-- usePatientData.ts) — only writes are admin-only (LegacyAdminApp.tsx).
alter table public.exercises enable row level security;

create policy "exercises_select_authenticated" on public.exercises
  for select
  to authenticated
  using (true);

create policy "exercises_admin_write" on public.exercises
  for insert
  to authenticated
  with check (public.is_admin());

create policy "exercises_admin_update" on public.exercises
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "exercises_admin_delete" on public.exercises
  for delete
  to authenticated
  using (public.is_admin());

-- exercise_logs: also fully open, but confirmed orphaned (0 rows, no FK
-- constraints, patient_id type doesn't even match the rest of the schema,
-- and grep shows no call site anywhere in the app). Default-deny is enough
-- until it's dropped as its own Tier 1 cleanup item.
alter table public.exercise_logs enable row level security;
