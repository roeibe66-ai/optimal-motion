-- Exercise progression/regression pyramid: each exercise can optionally
-- point at an easier and a harder variant of itself (e.g. Pull-up <->
-- Banded Pull-up). Self-referencing FKs on the same table; `on delete
-- set null` so deleting one exercise never blocks on or cascades into
-- an unrelated exercise it happens to be linked from.
alter table public.exercises
  add column if not exists easier_version_id uuid references public.exercises(id) on delete set null,
  add column if not exists harder_version_id uuid references public.exercises(id) on delete set null;
