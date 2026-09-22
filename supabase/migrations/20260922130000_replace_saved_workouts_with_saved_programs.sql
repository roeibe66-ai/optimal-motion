-- Upgrades the DIY builder's "save workout" concept from a single flat
-- workout to a multi-day Weekly Program. Replaces patient_saved_workouts
-- (single exercise_ids array + single scheduled_day) with
-- patient_saved_programs (a jsonb array of {day_number, exercise_ids} —
-- ordinal builder days, not tied to a calendar weekday, per product
-- decision). Existing rows are carried over as 1-day programs before the
-- old table is dropped.
create table patient_saved_programs (
  id uuid primary key default gen_random_uuid(),
  patient_id bigint not null references patients(id) on delete cascade,
  name text not null,
  days jsonb not null default '[]'::jsonb, -- [{day_number: number, exercise_ids: string[]}, ...]
  created_at timestamptz not null default now()
);

alter table patient_saved_programs enable row level security;

create policy patient_saved_programs_self_or_admin on patient_saved_programs
  for all
  using (is_admin() or patient_id in (select id from patients where user_id = auth.uid()))
  with check (is_admin() or patient_id in (select id from patients where user_id = auth.uid()));

insert into patient_saved_programs (patient_id, name, days, created_at)
select
  patient_id,
  name,
  jsonb_build_array(jsonb_build_object('day_number', 1, 'exercise_ids', to_jsonb(exercise_ids))),
  created_at
from patient_saved_workouts;

drop table patient_saved_workouts;
