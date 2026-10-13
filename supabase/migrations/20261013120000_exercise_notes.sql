-- Per-exercise notes (approved 2026-10-13).
--
-- Two separate notes on an assigned exercise row, so the patient can never
-- change what the therapist wrote:
--   patient_exercises.notes          — the therapist's note (existing column,
--                                      until now only editable in the admin
--                                      patient view and never shown to patients)
--   patient_exercises.patient_notes  — the patient's own note (new)
-- Templates get the therapist note too (package_exercises.notes, new), copied
-- along when a template becomes a patient's program.
--
-- The side of a one-sided exercise ("ימין בלבד", "שני הצדדים") is not a
-- column of its own — the note editors offer it as a quick prefix.

alter table public.package_exercises add column if not exists notes text not null default '';
alter table public.patient_exercises add column if not exists patient_notes text;

-- A patient can INSERT their own rows (the DIY builder's "save to my plan"),
-- and patient_exercises has no column-level RLS — so a direct insert from the
-- client could set a "therapist" note. Blank it unless an admin is writing.
-- current_user is 'authenticated' only for a direct API call; inside a
-- SECURITY DEFINER function (patient_save_program_week, which deliberately
-- carries the therapist's notes over) it's the function owner instead.
create or replace function public.patient_exercises_guard_therapist_notes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    new.notes := '';
  end if;
  return new;
end;
$$;

drop trigger if exists patient_exercises_guard_therapist_notes on public.patient_exercises;
create trigger patient_exercises_guard_therapist_notes
  before insert on public.patient_exercises
  for each row execute function public.patient_exercises_guard_therapist_notes();

-- Template → patient program: carry the template's notes.
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
    pe.rir, coalesce(pe.is_time, false), coalesce(pe.notes, ''), pe.scheduled_days, coalesce(pe.week, 1), pe.rest_time_seconds,
    pe.tempo_eccentric, pe.tempo_pause, pe.tempo_concentric, pe.weight_kg
  from public.package_exercises pe
  where pe.package_id = p_package_id;

  return v_program_id;
end;
$$;

-- Patient edits their program: the rows are deleted and re-inserted, so the
-- therapist's notes are carried over from the existing rows (by exercise)
-- instead of being taken from the client; the patient only writes
-- patient_notes. An exercise the patient added themselves has no therapist note.
create or replace function public.patient_save_program_week(p_program_id uuid, p_week integer, p_name text, p_sessions jsonb)
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
  v_therapist_notes jsonb;
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

  -- exercise_id -> the therapist's note, preferring this week's row.
  select coalesce(jsonb_object_agg(s.exercise_id::text, s.notes), '{}'::jsonb)
  into v_therapist_notes
  from (
    select distinct on (pe.exercise_id) pe.exercise_id, pe.notes
    from public.patient_exercises pe
    where pe.program_id = p_program_id and coalesce(pe.notes, '') <> ''
    order by pe.exercise_id, (pe.week is not distinct from p_week) desc
  ) s;

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
      (patient_id, program_id, exercise_id, block, sets, reps, reps_max, rir, is_time, notes, patient_notes, scheduled_days, week, rest_time_seconds, weight_kg)
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
      coalesce(v_therapist_notes->>(item->>'exercise_id'), ''),
      nullif(left(trim(coalesce(item->>'patient_notes', '')), 300), ''),
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
