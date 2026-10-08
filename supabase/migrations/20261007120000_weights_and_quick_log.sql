-- Optional weights + quick workout logging.
--
-- 1) An optional prescribed weight (kg) per exercise. NULL = no weight, and the
--    patient UI shows nothing for it. Admin-built single workouts carry the same
--    value inside workouts.items as "weight_kg" (jsonb, no column needed).
alter table public.patient_exercises
  add column weight_kg numeric(6,2) check (weight_kg is null or weight_kg >= 0);

alter table public.package_exercises
  add column weight_kg numeric(6,2) check (weight_kg is null or weight_kg >= 0);

-- 2) A workout the patient logged afterwards from the plan screen ("quick log":
--    reps/weights typed in per exercise) instead of running it in the player.
--    Weight the patient actually used lives per set in performance_data
--    (SessionPerformanceEntry.weight_kg), alongside reps/rir.
alter table public.workout_logs
  add column is_quick_log boolean not null default false;

-- 3) Copy weight_kg when a patient adds a published template/workout to their
--    own programs. Bodies otherwise unchanged from their latest definitions.
create or replace function public.add_published_package_to_my_programs(p_package_id bigint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id bigint;
  v_package public.packages%rowtype;
  v_program_id uuid;
begin
  select id into v_patient_id from public.patients where user_id = auth.uid();
  if v_patient_id is null then
    raise exception 'no patient profile for the current user';
  end if;

  select * into v_package from public.packages where id = p_package_id and status = 'published';
  if not found then
    raise exception 'program is not available';
  end if;
  if not v_package.is_free then
    raise exception 'premium program';
  end if;

  select id into v_program_id
  from public.patient_programs
  where patient_id = v_patient_id and source_package_id = p_package_id
  limit 1;
  if v_program_id is not null then
    return v_program_id;
  end if;

  insert into public.patient_programs (patient_id, name, source_package_id, is_self_added)
  values (v_patient_id, coalesce(nullif(trim(v_package.title), ''), 'תוכנית'), p_package_id, true)
  returning id into v_program_id;

  insert into public.patient_exercises
    (patient_id, program_id, exercise_id, block, sets, reps, rir, is_time, notes, scheduled_days, week, rest_time_seconds,
     tempo_eccentric, tempo_pause, tempo_concentric, weight_kg)
  select
    v_patient_id, v_program_id, pe.exercise_id, coalesce(pe.block, 'A'),
    case when pe.sets ~ '^\d+$' then pe.sets::integer end,
    case when pe.reps ~ '^\d+$' then pe.reps::integer end,
    pe.rir, coalesce(pe.is_time, false), '', pe.scheduled_days, coalesce(pe.week, 1), pe.rest_time_seconds,
    pe.tempo_eccentric, pe.tempo_pause, pe.tempo_concentric, pe.weight_kg
  from public.package_exercises pe
  where pe.package_id = p_package_id;

  return v_program_id;
end;
$$;

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
    (patient_id, program_id, exercise_id, block, sets, reps, rir, is_time, notes, scheduled_days, scheduled_date, week, rest_time_seconds, weight_kg)
  select
    v_patient_id,
    v_program_id,
    (item->>'exercise_id')::uuid,
    case when v_workout.format = 'amrap' then 'A' else coalesce(nullif(item->>'block', ''), chr(65 + ((ord - 1)::int % 26))) end,
    case when v_workout.format = 'amrap' then 1 else coalesce((item->>'sets')::integer, 3) end,
    coalesce((item->>'reps')::integer, 10),
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
