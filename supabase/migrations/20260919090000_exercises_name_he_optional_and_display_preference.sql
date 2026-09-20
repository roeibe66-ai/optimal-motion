-- name_he becomes optional: the builder no longer requires a Hebrew name up
-- front (an admin entering an English-sourced exercise can save with just
-- name_en and add the Hebrew translation later).
alter table public.exercises alter column name_he drop not null;

-- Per-exercise override for which name(s) getExerciseName() shows, independent
-- of the viewer's own UI language — 'both' renders "English | Hebrew".
alter table public.exercises add column name_display_preference text not null default 'en'
  check (name_display_preference in ('en', 'he', 'both'));
