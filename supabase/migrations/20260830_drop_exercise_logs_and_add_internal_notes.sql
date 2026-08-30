-- exercise_logs: confirmed orphaned before dropping — 0 rows, no views/
-- functions/triggers reference it, and the one hit in
-- constraint_column_usage was its own primary key, not an incoming FK.
drop table public.exercise_logs;

-- exercise_internal_notes: admin/practitioner-only notes on an exercise,
-- never meant for patient eyes. Deliberately a separate table rather than a
-- column on exercises — exercises has a SELECT policy open to all
-- authenticated users (patients need to read the library), and RLS is
-- row-level, not column-level, so a column here would still come back over
-- a raw select('*') regardless of what the UI renders. This table's own
-- admin-only policy closes that at the database level instead.
create table public.exercise_internal_notes (
  exercise_id uuid primary key references public.exercises(id) on delete cascade,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.exercise_internal_notes enable row level security;

create policy "exercise_internal_notes_admin_only" on public.exercise_internal_notes
  for all
  using (public.is_admin())
  with check (public.is_admin());
