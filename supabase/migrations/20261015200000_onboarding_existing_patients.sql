-- Roei, 2026-10-15: the onboarding questionnaire opens by itself only for new
-- fitness patients. Everyone who already had an account is treated as
-- "אמלא אחר כך": no automatic popup, the home card and the profile row
-- offer it instead (useOnboarding).
update public.patients
set onboarding_skipped_at = now()
where patient_type = 'fitness'
  and coalesce(role, '') <> 'admin'
  and onboarding_completed_at is null
  and onboarding_skipped_at is null;
