// Patient-facing features that are switched off for the friends-and-family
// beta (2026-10). The code stays in place — flip a flag back to true to
// bring the feature back; nothing else needs to change.
export const FEATURES = {
  // Floating AI coach chat on the patient home/plan screen (PatientCoachSheet).
  // The admin console's co-pilot is separate and unaffected.
  // Turning it on starts storing patients' conversations (coach_messages,
  // 6 months) and switches the /privacy text to say so — a data-flow change,
  // so bump LEGAL_VERSION (app/constants/legal.ts) in the same change; every
  // patient then accepts the updated policy again (ConsentGate).
  patientAiCoach: false,
  // The "תוכניות" (premium store) bottom-nav tab (PremiumStoreTab).
  premiumTab: false,
} as const;
