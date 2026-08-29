-- Step 6 of AUTH-MIGRATION-SPEC.md: real RLS across every patient-data
-- table (patients, patient_exercises, workout_logs, patient_saved_workouts
-- — confirmed no others: exercises/packages/package_exercises are shared
-- admin content, not patient-scoped, and exercise_logs is unused/orphaned).

-- Trigger: creates the patients row automatically on signup, running as
-- SECURITY DEFINER so it bypasses RLS (the client request has no auth.uid()
-- yet at this point — email confirmation is required before a session
-- exists). Replaces the client-side insert that used to run in
-- handleRegister right after signUp(), which could never satisfy a
-- user_id = auth.uid() check since there's no session at that point.
create or replace function public.handle_new_patient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.patients (user_id, full_name, email, patient_type, premium_tracks)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'מטופל חדש'),
    new.email,
    coalesce(new.raw_user_meta_data->>'patient_type', 'fitness'),
    ''
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_patient();

-- Admin check, security definer so it can read patients from inside a
-- policy on patients itself without recursing into RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.patients
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Guards role/premium_tracks/patient_type against self-promotion or
-- self-granting via a direct client UPDATE, regardless of what the
-- statement requested — row-ownership alone isn't enough for
-- privilege/paid-feature columns. patient_type matters here too:
-- PlanTab's premium lock only applies when patient_type === 'fitness',
-- so self-flipping to 'clinical' would bypass the paywall.
create or replace function public.protect_patient_privileged_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.premium_tracks := old.premium_tracks;
    new.patient_type := old.patient_type;
  end if;
  return new;
end;
$$;

create trigger protect_patient_privileged_fields_trigger
  before update on public.patients
  for each row execute function public.protect_patient_privileged_fields();

alter table public.patients enable row level security;
alter table public.patient_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.patient_saved_workouts enable row level security;

create policy "patients_self_or_admin" on public.patients
  for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- patient_exercises: sets/reps/rir/block/week/scheduled_days/exercise_id are
-- admin-assigned protocol parameters. Patients only ever INSERT new rows
-- (DIY-builder promotions, useWorkoutSession.ts) — no UPDATE/DELETE path
-- exists on the patient side anywhere in the app, so those stay admin-only
-- rather than being exposed via row ownership alone.
create policy "patient_exercises_select_self_or_admin" on public.patient_exercises
  for select
  using (public.is_admin() or patient_id in (select id from public.patients where user_id = auth.uid()));
create policy "patient_exercises_insert_self_or_admin" on public.patient_exercises
  for insert
  with check (public.is_admin() or patient_id in (select id from public.patients where user_id = auth.uid()));
create policy "patient_exercises_update_admin_only" on public.patient_exercises
  for update
  using (public.is_admin())
  with check (public.is_admin());
create policy "patient_exercises_delete_admin_only" on public.patient_exercises
  for delete
  using (public.is_admin());

-- workout_logs: no admin-set fields (entirely patient self-reported at
-- session end), but no UPDATE/DELETE path exists anywhere either — allowing
-- self-edit would let a patient rewrite the history that feeds the
-- practitioner's clinical dashboard (getAIInsight).
create policy "workout_logs_select_self_or_admin" on public.workout_logs
  for select
  using (public.is_admin() or patient_id in (select id from public.patients where user_id = auth.uid()));
create policy "workout_logs_insert_self_or_admin" on public.workout_logs
  for insert
  with check (public.is_admin() or patient_id in (select id from public.patients where user_id = auth.uid()));
create policy "workout_logs_update_admin_only" on public.workout_logs
  for update
  using (public.is_admin())
  with check (public.is_admin());
create policy "workout_logs_delete_admin_only" on public.workout_logs
  for delete
  using (public.is_admin());

-- patient_saved_workouts: fully patient-owned DIY content, admin never
-- touches this table — no protected fields, so a single FOR ALL policy
-- is correct as-is.
create policy "patient_saved_workouts_self_or_admin" on public.patient_saved_workouts
  for all
  using (public.is_admin() or patient_id in (select id from public.patients where user_id = auth.uid()))
  with check (public.is_admin() or patient_id in (select id from public.patients where user_id = auth.uid()));
