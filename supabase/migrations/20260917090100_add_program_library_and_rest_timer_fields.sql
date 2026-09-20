-- Program Library: packages need a draft/published status so a template
-- being built can be saved without immediately being assignable.
alter table public.packages
  add column status text not null default 'draft' check (status in ('draft', 'published'));

-- Adjustable rest timers: per-exercise, defaulting to the app's existing
-- hardcoded 60s. patient_exercises.rest_time_seconds is nullable in spirit
-- (an assignment can just use the default) but stored NOT NULL with a
-- default — same convention as sets/reps/is_time on this table — rather
-- than nullable-meaning-60, so every reader gets a real number without an
-- extra `?? 60` fallback scattered through the workout-session code.
alter table public.package_exercises
  add column rest_time_seconds integer not null default 60;

alter table public.patient_exercises
  add column rest_time_seconds integer not null default 60;
