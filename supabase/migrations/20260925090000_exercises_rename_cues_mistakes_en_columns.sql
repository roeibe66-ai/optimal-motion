-- Renames the two English columns added in
-- 20260924120000_exercises_add_english_translation_fields.sql to match the
-- naming the admin form's English fields actually use now: `cues_en` and
-- `mistakes_en` instead of `patient_cues_en`/`common_mistake_en`.
-- `description_en` is unchanged (already the requested name).
--
-- RENAME COLUMN, not drop+add: both columns have been empty on every row
-- since the moment they were created (no UI ever wrote to them under the
-- old names — this rename ships in the same pass as the UI change), but a
-- rename preserves whatever's there regardless, rather than relying on that.
alter table public.exercises rename column patient_cues_en to cues_en;
alter table public.exercises rename column common_mistake_en to mistakes_en;
