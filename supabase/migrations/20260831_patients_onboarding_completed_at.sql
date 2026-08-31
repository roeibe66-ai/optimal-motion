-- Tracks whether a patient has actually completed the onboarding wizard,
-- replacing the old justRegistered in-memory signal (set at signUp() call
-- time, before email confirmation — unreliable across tabs/devices/reloads).
-- Null = not yet completed; existing rows get NULL, so already-registered
-- patients will see the wizard once more on their next login too.
alter table public.patients
  add column onboarding_completed_at timestamptz null;
