-- The PAR-Q health declaration (20261017120000) was dropped the same day:
-- like the big fitness apps, trainees accept a medical disclaimer as part of
-- the terms instead, and clinic patients are screened in person. No data
-- was ever written to these columns.
alter table public.patients
  drop column if exists health_declaration,
  drop column if exists health_declared_at;
