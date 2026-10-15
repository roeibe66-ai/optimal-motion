-- Onboarding questionnaire for fitness patients (OnboardingFlow). Every
-- answer is optional; the patient fills them in their own row (existing
-- self-update RLS on patients). Read by the AI coach (coachPrompt.ts) — the
-- experience level sets the weekly volume in Roei's principles.

alter table public.patients
  add column if not exists training_goals text[] not null default '{}',
  add column if not exists training_experience text
    check (training_experience in ('none', 'beginner', 'intermediate', 'advanced')),
  add column if not exists training_days smallint check (training_days between 1 and 7),
  add column if not exists session_minutes smallint check (session_minutes between 10 and 180),
  add column if not exists training_location text check (training_location in ('gym', 'home', 'both')),
  add column if not exists home_equipment text[] not null default '{}',
  -- How the app addresses them in Hebrew: 'm' / 'f', or 'n' = no preference.
  add column if not exists address_form text check (address_form in ('m', 'f', 'n')),
  -- Year, not age, so it stays right.
  add column if not exists birth_year smallint check (birth_year between 1920 and 2020),
  add column if not exists height_cm smallint check (height_cm between 100 and 250),
  add column if not exists weight_kg numeric(5, 1) check (weight_kg between 25 and 300),
  -- Muscle ids from the body map (same vocabulary as workout_logs.pain_areas).
  add column if not exists limitation_areas text[] not null default '{}',
  add column if not exists recent_surgery boolean,
  -- "אמלא אחר כך": don't open the questionnaire by itself again; a home card
  -- offers it until onboarding_completed_at is set.
  add column if not exists onboarding_skipped_at timestamptz;
