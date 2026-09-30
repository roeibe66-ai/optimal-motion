-- Published program templates (packages) become the Explore tab's catalog.
--
-- Before this, "publish" in the admin program library only flipped
-- packages.status — no patient screen read it, and Explore read a separate
-- `workouts` table of hand-seeded placeholder sessions. Now: a published
-- template is listed in Explore, free or premium, and a patient can add a
-- free one to their own programs (a full copy — every week and day — as a
-- named patient_programs row, same as an admin assignment).

-- 1) Free/premium flag per template. Existing templates default to free.
alter table public.packages
  add column is_free boolean not null default true;

-- 2) Patients can read published templates and their exercises. Drafts stay
--    admin-only (packages_admin_only / package_exercises_admin_only remain).
create policy "packages_select_published" on public.packages
  for select
  to authenticated
  using (status = 'published');

create policy "package_exercises_select_published" on public.package_exercises
  for select
  to authenticated
  using (package_id in (select id from public.packages where status = 'published'));

-- 3) Where a patient program came from, and whether the patient added it
--    themselves (from Explore) or the admin assigned it.
alter table public.patient_programs
  add column source_package_id bigint references public.packages(id) on delete set null,
  add column is_self_added boolean not null default false;

-- A patient may remove a program they added themselves from Explore — never
-- one the admin assigned. (Its patient_exercises rows go with it through the
-- program_id foreign key's on delete cascade.)
create policy "patient_programs_delete_self_added" on public.patient_programs
  for delete
  using (is_self_added and patient_id in (select id from public.patients where user_id = auth.uid()));

-- 4) "Add to my programs": copies a published, free template into the
--    calling patient's plan. SECURITY DEFINER so the published/free check
--    happens server-side — patients still can't insert patient_programs rows
--    directly, so a premium template can't be copied by calling the table API.
create function public.add_published_package_to_my_programs(p_package_id bigint)
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

  -- Already in the patient's programs (added before, or assigned by the admin).
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

  -- package_exercises.sets/reps are text columns; patient_exercises' are integer.
  insert into public.patient_exercises
    (patient_id, program_id, exercise_id, block, sets, reps, rir, is_time, notes, scheduled_days, week, rest_time_seconds,
     tempo_eccentric, tempo_pause, tempo_concentric)
  select
    v_patient_id, v_program_id, pe.exercise_id, coalesce(pe.block, 'A'),
    case when pe.sets ~ '^\d+$' then pe.sets::integer end,
    case when pe.reps ~ '^\d+$' then pe.reps::integer end,
    pe.rir, coalesce(pe.is_time, false), '', pe.scheduled_days, coalesce(pe.week, 1), pe.rest_time_seconds,
    pe.tempo_eccentric, pe.tempo_pause, pe.tempo_concentric
  from public.package_exercises pe
  where pe.package_id = p_package_id;

  return v_program_id;
end;
$$;

revoke execute on function public.add_published_package_to_my_programs(bigint) from public, anon;
grant execute on function public.add_published_package_to_my_programs(bigint) to authenticated;

-- 5) Likes on Explore now target templates (the old workout_likes pointed at
--    the placeholder workouts table).
create table public.package_likes (
  id uuid primary key default gen_random_uuid(),
  patient_id bigint not null references public.patients(id) on delete cascade,
  package_id bigint not null references public.packages(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (patient_id, package_id)
);

alter table public.package_likes enable row level security;

create policy "package_likes_self_or_admin" on public.package_likes
  for all
  using (public.is_admin() or patient_id in (select id from public.patients where user_id = auth.uid()))
  with check (public.is_admin() or patient_id in (select id from public.patients where user_id = auth.uid()));

-- 6) Remove the four hand-seeded placeholder workouts (and any likes on
--    them). The workouts/workout_likes tables are left in place, unused.
delete from public.workouts;
