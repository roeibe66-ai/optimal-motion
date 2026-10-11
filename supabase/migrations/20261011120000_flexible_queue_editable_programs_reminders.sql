-- Weekly plan with done-on-another-day, patient-editable assigned programs,
-- per-day reminders.
--
-- 1) Weekly plan. Workouts the therapist put on weekdays
--    (patient_exercises.scheduled_days) stay on those days, but a workout
--    can be done — or marked done — on a different day and still complete
--    its planned day. workout_logs now records which program/week/day a log
--    was for, so the plan can tell (app/utils/programQueue.ts). Programs with
--    no weekdays can instead have a weekly goal ("3 times a week", any days).
alter table public.workout_logs
  add column program_id uuid references public.patient_programs(id) on delete set null,
  add column program_week integer,
  add column session_key text;

comment on column public.workout_logs.program_id is 'Assigned program this workout belonged to (null for DIY/Explore ad-hoc and older logs).';
comment on column public.workout_logs.program_week is 'Program week (patient_exercises.week) the workout was from; null for every-week programs.';
comment on column public.workout_logs.session_key is 'Planned day the workout was for: a DAYS_OF_WEEK id (even when done on another day), or ''all'' for a program with no fixed days.';

create index workout_logs_program_id_idx on public.workout_logs (program_id);

-- Weekly goal for a program with no fixed weekdays ("3 times a week", any
-- days). Null with no weekdays = every day, as before.
alter table public.patient_programs
  add column weekly_target smallint check (weekly_target between 1 and 7),
  -- 2) Patient edits. Set when the patient first edits the program; the
  -- therapist sees a badge and can restore original_rows (the program's
  -- patient_exercises rows as assigned, captured at the first edit).
  add column patient_edited_at timestamptz,
  add column original_rows jsonb;

-- The patient edits one program week at a time: every row of that week is
-- replaced by p_sessions = [{days: "1,3" | null, items: [{exercise_id,
-- block, sets, reps, reps_max, rir, is_time, rest_time_seconds, weight_kg,
-- notes}, ...]}, ...]. security definer because patient_exercises stays
-- admin-only for direct writes; ownership is checked here instead.
create function public.patient_save_program_week(p_program_id uuid, p_week integer, p_name text, p_sessions jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id bigint;
  v_program public.patient_programs%rowtype;
  v_session jsonb;
  v_days text;
begin
  select id into v_patient_id from public.patients where user_id = auth.uid();
  if v_patient_id is null then
    raise exception 'no patient profile for the current user';
  end if;

  select * into v_program from public.patient_programs where id = p_program_id and patient_id = v_patient_id for update;
  if not found then
    raise exception 'program not found';
  end if;
  if v_program.format = 'amrap' then
    raise exception 'AMRAP programs cannot be edited';
  end if;
  if exists (select 1 from public.patient_exercises where program_id = p_program_id and scheduled_date is not null) then
    raise exception 'one-time workouts cannot be edited';
  end if;
  if jsonb_typeof(p_sessions) is distinct from 'array' or jsonb_array_length(p_sessions) not between 1 and 7 then
    raise exception 'invalid sessions';
  end if;

  if v_program.original_rows is null then
    update public.patient_programs
    set original_rows = coalesce(
      (select jsonb_agg(to_jsonb(pe) - 'id' - 'created_at') from public.patient_exercises pe where pe.program_id = p_program_id),
      '[]'::jsonb
    )
    where id = p_program_id;
  end if;

  delete from public.patient_exercises where program_id = p_program_id and week is not distinct from p_week;

  for v_session in select value from jsonb_array_elements(p_sessions) loop
    v_days := nullif(v_session->>'days', '');
    if v_days is not null and v_days !~ '^[0-6](,[0-6])*$' then
      raise exception 'invalid days';
    end if;
    if jsonb_typeof(v_session->'items') is distinct from 'array' then
      raise exception 'invalid items';
    end if;

    insert into public.patient_exercises
      (patient_id, program_id, exercise_id, block, sets, reps, reps_max, rir, is_time, notes, scheduled_days, week, rest_time_seconds, weight_kg)
    select
      v_patient_id,
      p_program_id,
      (item->>'exercise_id')::uuid,
      coalesce(nullif(left(item->>'block', 3), ''), 'A'),
      least(greatest(coalesce((item->>'sets')::integer, 3), 1), 20),
      least(greatest(coalesce((item->>'reps')::integer, 10), 1), 999),
      case
        when coalesce((item->>'is_time')::boolean, false) then null
        when (item->>'reps_max')::integer > coalesce((item->>'reps')::integer, 10) then (item->>'reps_max')::integer
        else null
      end,
      (item->>'rir')::integer,
      coalesce((item->>'is_time')::boolean, false),
      coalesce(left(item->>'notes', 500), ''),
      v_days,
      p_week,
      least(greatest(coalesce((item->>'rest_time_seconds')::integer, 60), 0), 900),
      (item->>'weight_kg')::numeric
    from jsonb_array_elements(v_session->'items') as item;
  end loop;

  update public.patient_programs
  set patient_edited_at = now(),
      name = case when length(trim(coalesce(p_name, ''))) > 0 then left(trim(p_name), 80) else name end
  where id = p_program_id;
end;
$$;

revoke execute on function public.patient_save_program_week(uuid, integer, text, jsonb) from public, anon;
grant execute on function public.patient_save_program_week(uuid, integer, text, jsonb) to authenticated;

-- Therapist: put the program back exactly as assigned.
create function public.admin_restore_program_original(p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  select original_rows into v_rows from public.patient_programs where id = p_program_id;
  if v_rows is null then
    raise exception 'nothing to restore';
  end if;

  delete from public.patient_exercises where program_id = p_program_id;
  insert into public.patient_exercises
    (patient_id, program_id, exercise_id, sets, reps, notes, block, scheduled_days, is_time, week, rir,
     tempo_eccentric, tempo_pause, tempo_concentric, rest_time_seconds, scheduled_date, weight_kg, reps_max)
  select
    r.patient_id, r.program_id, r.exercise_id, r.sets, r.reps, r.notes, r.block, r.scheduled_days, r.is_time, r.week, r.rir,
    r.tempo_eccentric, r.tempo_pause, r.tempo_concentric, r.rest_time_seconds, r.scheduled_date, r.weight_kg, r.reps_max
  from jsonb_populate_recordset(null::public.patient_exercises, v_rows) as r;

  update public.patient_programs set original_rows = null, patient_edited_at = null where id = p_program_id;
end;
$$;

revoke execute on function public.admin_restore_program_original(uuid) from public, anon;
grant execute on function public.admin_restore_program_original(uuid) to authenticated;

-- 3) Per-day reminder times: {"1": "17:00", "3": "08:00"} (DAYS_OF_WEEK id
-- -> HH:MM). Replaces the single reminder_time shared by reminder_days,
-- which are carried over and then left in place, unused.
alter table public.patients
  add column reminder_schedule jsonb not null default '{}'::jsonb;

update public.patients p
set reminder_schedule = coalesce(
  (select jsonb_object_agg(d, p.reminder_time) from unnest(string_to_array(p.reminder_days, ',')) as d where d ~ '^[0-6]$'),
  '{}'::jsonb
)
where coalesce(p.reminder_time, '') <> '' and coalesce(p.reminder_days, '') <> '';
