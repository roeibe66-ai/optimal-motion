-- exercises.gif_url is already nullable (confirmed via information_schema —
-- no NOT NULL constraint exists at the DB level; the only "required"
-- behavior was a `required` attribute on the admin add-exercise form's
-- input). This migration only adds the new optional second-angle field.
alter table public.exercises
  add column if not exists secondary_gif_url text;
