-- Categories: single string -> array, so an exercise can belong to more
-- than one (e.g. both calisthenics and mobility).
alter table public.exercises add column categories text[] not null default '{}'::text[];
update public.exercises set categories = array[category] where category is not null and category <> '';
alter table public.exercises drop column category;

-- Difficulty level, shown in the builder's new dropdown.
alter table public.exercises add column difficulty_level text
  check (difficulty_level is null or difficulty_level in ('beginner','intermediate','advanced','clinical'));

-- Bilingual display name, replacing the single `title` column. Existing
-- titles are Hebrew (the app's primary language), so they backfill name_he;
-- name_en starts empty for existing rows.
alter table public.exercises add column name_he text;
alter table public.exercises add column name_en text;
update public.exercises set name_he = title;
alter table public.exercises alter column name_he set not null;
alter table public.exercises drop column title;
