-- Bilingual free-text fields for exercises, following the name_he/name_en
-- precedent (20260918110000_exercises_categories_array_difficulty_bilingual_names.sql):
-- purely additive this time, not a rename+backfill+drop — `description`,
-- `patient_cues`, and `common_mistake` keep their existing Hebrew data
-- untouched, and each gets a new nullable `_en` sibling column that starts
-- empty for every existing row. English is optional/for-future-use, so
-- nothing here is NOT NULL.
--
-- target_muscle/secondary_muscles/categories/equipment are intentionally
-- NOT touched: those store catalog ids (app/constants/catalog.ts), not
-- authored text, so there's nothing per-exercise to translate — an English
-- label for a muscle/category belongs on the shared catalog entry, not a
-- new column on every exercise row.
alter table public.exercises add column if not exists description_en text;
alter table public.exercises add column if not exists patient_cues_en text;
alter table public.exercises add column if not exists common_mistake_en text;
