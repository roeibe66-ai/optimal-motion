-- Confirmed clean before migrating: all 3 existing rows in both columns
-- match ^\d+$ (pure digit strings), no nulls/empty strings/decimals/garbage.
-- This closes the foundational bug class behind the Tier 0.5 fixes
-- (duration calc string-concat, makeHarder() reps arithmetic) at the schema
-- level instead of normalizing with Number()/parseInt() at every call site.
alter table public.patient_exercises
  alter column sets type integer using sets::integer,
  alter column reps type integer using reps::integer;
