-- Part of the auth migration (see AUTH-MIGRATION-SPEC.md): replaces the
-- custom plaintext-password auth with real Supabase Auth. patients.password
-- is dropped in favor of a real auth.users identity, linked 1:1 via
-- user_id, plus a role column so admin becomes a real authenticated role
-- flag instead of a hardcoded "admin"/"admin" string check.
--
-- Ground rule #1 (confirmed with Roei): patients — and anything referencing
-- it — is all test/demo data, safe to wipe. No backfill needed. CASCADE is
-- required because workout_logs, patient_exercises, and
-- patient_saved_workouts all FK to patients.id.
truncate table public.patients cascade;

alter table public.patients
  drop column password,
  add column user_id uuid not null unique references auth.users(id) on delete cascade,
  add column role text not null default 'patient' check (role in ('patient', 'admin'));
