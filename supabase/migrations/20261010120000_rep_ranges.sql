-- Rep ranges ("8-12"): `reps` stays the lower bound — everything that already
-- reads it (player target, quick log seed, history) keeps working unchanged —
-- and the new nullable `reps_max` is the upper bound. null = a single target.
-- Workouts carry it inside workouts.items (jsonb) as `reps_max`; this copies
-- it through when a patient adds a published workout from Explore.

alter table public.patient_exercises
  add column reps_max integer,
  add constraint patient_exercises_reps_max_check check (reps_max is null or reps_max > reps);

create or replace function public.add_published_workout_to_my_programs(p_workout_id uuid, p_day text, p_date date default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id bigint;
  v_workout public.workouts%rowtype;
  v_program_id uuid;
  v_day text := p_day;
begin
  if p_date is not null then
    -- One day of slack for time zones (the server runs in UTC).
    if p_date < current_date - 1 then
      raise exception 'date is in the past';
    end if;
    v_day := extract(dow from p_date)::int::text;
  end if;
  if v_day is null or v_day !~ '^[0-6](,[0-6])*$' then
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
    (patient_id, program_id, exercise_id, block, sets, reps, reps_max, rir, is_time, notes, scheduled_days, scheduled_date, week, rest_time_seconds, weight_kg)
  select
    v_patient_id,
    v_program_id,
    (item->>'exercise_id')::uuid,
    case when v_workout.format = 'amrap' then 'A' else coalesce(nullif(item->>'block', ''), chr(65 + ((ord - 1)::int % 26))) end,
    case when v_workout.format = 'amrap' then 1 else coalesce((item->>'sets')::integer, 3) end,
    coalesce((item->>'reps')::integer, 10),
    -- Dropped (not an error) if it doesn't exceed reps, so a malformed item
    -- can't make the whole add fail on the check constraint.
    case when (item->>'reps_max')::integer > coalesce((item->>'reps')::integer, 10) then (item->>'reps_max')::integer end,
    (item->>'rir')::integer,
    coalesce((item->>'is_time')::boolean, false),
    '',
    v_day,
    p_date,
    null,
    coalesce((item->>'rest_time_seconds')::integer, 60),
    nullif(item->>'weight_kg', '')::numeric
  from jsonb_array_elements(v_workout.items) with ordinality as t(item, ord)
  where item ? 'exercise_id';

  return v_program_id;
end;
$$;
