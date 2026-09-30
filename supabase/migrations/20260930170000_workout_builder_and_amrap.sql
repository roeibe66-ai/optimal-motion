-- Admin "workout builder": single workouts (not multi-week programs) that the
-- admin authors and publishes to the patient Explore tab — either a regular
-- sets/reps workout or a time-capped AMRAP.
--
-- Reuses the existing `workouts` table (emptied of its placeholder seed rows
-- in 20260930150000) and `workout_likes`.

-- 1) Workout definition.
alter table public.workouts
  add column description text,
  add column format text not null default 'standard' check (format in ('standard', 'amrap')),
  add column time_cap_seconds integer check (time_cap_seconds is null or time_cap_seconds > 0),
  add column status text not null default 'draft' check (status in ('draft', 'published')),
  -- Ordered exercise list with per-exercise parameters, e.g.
  --   standard: {"exercise_id": "...", "block": "A", "sets": 3, "reps": 10, "is_time": false, "rir": 2, "rest_time_seconds": 60}
  --   amrap:    {"exercise_id": "...", "reps": 10, "is_time": false}   (per round)
  -- exercise_ids is kept in sync with it for older readers.
  add column items jsonb not null default '[]'::jsonb,
  add column updated_at timestamptz not null default now();

alter table public.workouts
  add constraint workouts_amrap_needs_time_cap check (format <> 'amrap' or time_cap_seconds is not null);

-- Patients only see published workouts (they saw every row before, which was
-- fine while the table only held seed data).
drop policy workouts_select_authenticated on public.workouts;
create policy workouts_select_published_or_admin on public.workouts
  for select
  to authenticated
  using (status = 'published' or public.is_admin());

-- 2) Timed-workout results on the patient's log (AMRAP: rounds + extra reps
--    into the unfinished round). Null for regular workouts.
alter table public.workout_logs
  add column result_rounds integer check (result_rounds is null or result_rounds >= 0),
  add column result_extra_reps integer check (result_extra_reps is null or result_extra_reps >= 0);

-- 3) A patient program can now come from a workout, and carry its format so
--    an AMRAP added to a day in the plan still runs in the AMRAP player.
alter table public.patient_programs
  add column source_workout_id uuid references public.workouts(id) on delete set null,
  add column format text not null default 'standard' check (format in ('standard', 'amrap')),
  add column time_cap_seconds integer;

-- patient_exercises.week null now means "every week" (a workout the patient
-- pinned to a weekday recurs each week of their plan). No existing rows had
-- a null week when this was introduced.
comment on column public.patient_exercises.week is 'Plan week (1-based). NULL = every week.';

-- 4) "Add to a day in my plan": copies a published, free workout into the
--    calling patient's programs, pinned to one weekday (0-6, DAYS_OF_WEEK ids)
--    in every week. SECURITY DEFINER for the same reason as
--    add_published_package_to_my_programs: the published/free check must
--    run server-side.
create function public.add_published_workout_to_my_programs(p_workout_id uuid, p_day text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id bigint;
  v_workout public.workouts%rowtype;
  v_program_id uuid;
begin
  if p_day is null or p_day !~ '^[0-6]$' then
    raise exception 'invalid day';
  end if;

  select id into v_patient_id from public.patients where user_id = auth.uid();
  if v_patient_id is null then
    raise exception 'no patient profile for the current user';
  end if;

  select * into v_workout from public.workouts where id = p_workout_id and status = 'published';
  if not found then
    raise exception 'workout is not available';
  end if;
  if not v_workout.is_free then
    raise exception 'premium workout';
  end if;

  insert into public.patient_programs (patient_id, name, source_workout_id, is_self_added, format, time_cap_seconds)
  values (v_patient_id, v_workout.title, p_workout_id, true, v_workout.format, v_workout.time_cap_seconds)
  returning id into v_program_id;

  insert into public.patient_exercises
    (patient_id, program_id, exercise_id, block, sets, reps, rir, is_time, notes, scheduled_days, week, rest_time_seconds)
  select
    v_patient_id,
    v_program_id,
    (item->>'exercise_id')::uuid,
    -- AMRAP: every exercise is one station of the same round.
    case when v_workout.format = 'amrap' then 'A' else coalesce(nullif(item->>'block', ''), chr(65 + ((ord - 1)::int % 26))) end,
    case when v_workout.format = 'amrap' then 1 else coalesce((item->>'sets')::integer, 3) end,
    coalesce((item->>'reps')::integer, 10),
    (item->>'rir')::integer,
    coalesce((item->>'is_time')::boolean, false),
    '',
    p_day,
    null,
    coalesce((item->>'rest_time_seconds')::integer, 60)
  from jsonb_array_elements(v_workout.items) with ordinality as t(item, ord)
  where item ? 'exercise_id';

  return v_program_id;
end;
$$;

revoke execute on function public.add_published_workout_to_my_programs(uuid, text) from public, anon;
grant execute on function public.add_published_workout_to_my_programs(uuid, text) to authenticated;
