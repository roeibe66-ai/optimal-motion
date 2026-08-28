-- DIY-builder "save workout" feature (MyWorkouts screen).
--
-- No RLS policy here: the app has no server-side auth boundary (public anon
-- key, no Supabase Auth session), so a policy keyed on patient_id alone would
-- not be real protection without auth.uid() behind it. Left at the same
-- (lack of) protection level as the rest of the schema on purpose — see the
-- "Known gap" note in CLAUDE.md. Do not add a policy to just this table
-- without doing the real Supabase Auth + RLS pass across all patient-data
-- tables first.
--
-- patient_id is bigint, not uuid: patients.id is a bigint PK in the live
-- schema (the TS `Patient.id: string` type doesn't reveal the real column
-- type — checked information_schema before getting this right).
--
-- The Supabase migration tool enables RLS by default on tables it creates,
-- which with zero policies means total lockout (not the open-by-default
-- posture of the rest of this schema) — explicitly disabled below to match.
create table if not exists patient_saved_workouts (
  id uuid primary key default gen_random_uuid(),
  patient_id bigint not null references patients(id) on delete cascade,
  name text not null,
  scheduled_day text,           -- DAYS_OF_WEEK id, nullable
  exercise_ids text[] not null, -- ordered list of exercises.id, in pick order
  created_at timestamptz not null default now()
);

create index if not exists patient_saved_workouts_patient_id_idx on patient_saved_workouts(patient_id);

alter table patient_saved_workouts disable row level security;
