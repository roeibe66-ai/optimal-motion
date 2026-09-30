-- 1) Named patient programs.
--
-- Every admin assignment to a patient is now a named program ("תוכנית כוח
-- לבית", ...) instead of loose patient_exercises rows that the patient app
-- grouped by exercise category. The program name is what the patient sees
-- as the workout's title. Rows with program_id null are patient-created
-- (the DIY builder's "save to my weekly plan"), shown under a fixed label.
create table public.patient_programs (
  id uuid primary key default gen_random_uuid(),
  patient_id bigint not null references public.patients(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create index patient_programs_patient_id_idx on public.patient_programs (patient_id);

alter table public.patient_programs enable row level security;

-- Same split as patient_exercises: the patient can read their own
-- programs; only the admin creates, renames or deletes them.
create policy "patient_programs_select_self_or_admin" on public.patient_programs
  for select
  using (public.is_admin() or patient_id in (select id from public.patients where user_id = auth.uid()));
create policy "patient_programs_insert_admin_only" on public.patient_programs
  for insert
  with check (public.is_admin());
create policy "patient_programs_update_admin_only" on public.patient_programs
  for update
  using (public.is_admin())
  with check (public.is_admin());
create policy "patient_programs_delete_admin_only" on public.patient_programs
  for delete
  using (public.is_admin());

-- Deleting a program deletes its exercise rows with it.
alter table public.patient_exercises
  add column program_id uuid references public.patient_programs(id) on delete cascade;

create index patient_exercises_program_id_idx on public.patient_exercises (program_id);

-- Backfill: every existing assignment moves into one program per patient,
-- named "התוכנית שלי" (the admin can rename it afterwards).
with created as (
  insert into public.patient_programs (patient_id, name)
  select distinct patient_id, 'התוכנית שלי'
  from public.patient_exercises
  where program_id is null and patient_id is not null
  returning id, patient_id
)
update public.patient_exercises pe
set program_id = created.id
from created
where pe.patient_id = created.patient_id and pe.program_id is null;

-- 2) Hide a "Did you know?" fact without deleting it.
alter table public.curated_facts
  add column is_hidden boolean not null default false;

-- Patients only ever see visible facts; the admin sees everything.
drop policy "curated_facts_select_authenticated" on public.curated_facts;
create policy "curated_facts_select_visible_or_admin" on public.curated_facts
  for select
  to authenticated
  using (not is_hidden or public.is_admin());

create policy "curated_facts_admin_update" on public.curated_facts
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
