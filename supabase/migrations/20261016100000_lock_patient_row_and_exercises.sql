-- Security fixes from the pre-launch audit (MISTAKES.md, 2026-10-16).
--
-- 1) patients: "patients_self_or_admin" was FOR ALL, so a patient could
--    DELETE their own row and INSERT a new one with role = 'admin' —
--    protect_patient_privileged_fields only runs BEFORE UPDATE. That made
--    any signed-in user an admin (every patient's health data). Rows are
--    created only by the signup trigger (security definer), and nothing in
--    the app inserts or deletes them from the client, so: patients may read
--    and update their own row; insert/delete are admin-only. (Account
--    deletion, when built, goes through a server action, not a client delete.)
drop policy if exists "patients_self_or_admin" on public.patients;

create policy "patients_select_self_or_admin" on public.patients
  for select using (user_id = auth.uid() or public.is_admin());

create policy "patients_update_self_or_admin" on public.patients
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "patients_insert_admin_only" on public.patients
  for insert with check (public.is_admin());

create policy "patients_delete_admin_only" on public.patients
  for delete using (public.is_admin());

-- 2) exercises: a leftover "Enable all for authenticated users" (FOR ALL,
--    using true) OR'ed with the admin-only write policies, so any patient
--    could edit or delete any exercise (instructions included). The admin
--    insert/update/delete and authenticated select policies stay.
drop policy if exists "Enable all for authenticated users" on public.exercises;

-- 3) rls_auto_enable is an event-trigger function; nobody should call it
--    over the REST API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
