// Patient-facing features that are switched off for the friends-and-family
// beta (2026-10). The code stays in place — flip a flag back to true to
// bring the feature back; nothing else needs to change.
export const FEATURES = {
  // Floating AI coach chat on the patient home/plan screen (PatientCoachSheet).
  // The admin console's co-pilot is separate and unaffected.
  patientAiCoach: false,
  // The "תוכניות" (premium store) bottom-nav tab (PremiumStoreTab).
  premiumTab: false,
} as const;
