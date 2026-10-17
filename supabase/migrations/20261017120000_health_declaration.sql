-- Health declaration (הצהרת בריאות, PAR-Q style — HealthDeclaration.tsx),
-- asked before a patient's first workout and again once a year, like a gym's
-- form under חוק מכוני כושר. answers: question id -> boolean (true = "כן").
-- Any "כן" means the patient was advised to see a doctor and acknowledged it
-- (medical_ack). Patients write their own row (patients self-update RLS);
-- the therapist (admin) reads it. Sensitive health data — listed in /privacy.

alter table public.patients
  add column if not exists health_declaration jsonb,
  add column if not exists health_declared_at timestamptz;
