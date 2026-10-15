import type { TrainingExperience } from "@/app/types";

// Answer options for the fitness onboarding questionnaire (OnboardingFlow).
// Stored as the ids; the labels are only for display (also used by the AI
// coach's patient context, app/utils/coachPrompt.ts).

export const TRAINING_GOALS: { id: string; label: string }[] = [
  { id: "strength", label: "כוח" },
  { id: "muscle", label: "מסת שריר" },
  { id: "weight_loss", label: "ירידה במשקל" },
  { id: "fitness", label: "כושר כללי" },
  { id: "injury_return", label: "חזרה מפציעה" },
  { id: "less_pain", label: "פחות כאבים" },
  { id: "sport", label: "ביצועים בספורט" },
  { id: "mobility", label: "ניידות" },
];
export const MAX_TRAINING_GOALS = 2;

// The level drives the weekly volume in the coach principles (section 3).
export const TRAINING_EXPERIENCE: { id: TrainingExperience; label: string; hint: string | null }[] = [
  { id: "none", label: "עוד לא התאמנתי", hint: null },
  { id: "beginner", label: "פחות מחצי שנה", hint: "מתחילים · 10-12 סטים לשריר בשבוע" },
  { id: "intermediate", label: "חצי שנה עד שנתיים", hint: "בינוניים · 12-16 סטים" },
  { id: "advanced", label: "יותר משנתיים", hint: "מתקדמים · 16-20 סטים" },
];

export const TRAINING_DAYS = [2, 3, 4, 5, 6];
export const SESSION_MINUTES: { value: number; label: string }[] = [
  { value: 20, label: "20" },
  { value: 30, label: "30" },
  { value: 45, label: "45" },
  { value: 60, label: "60+" },
];

export const TRAINING_LOCATIONS: { id: "gym" | "home" | "both"; label: string }[] = [
  { id: "gym", label: "במכון" },
  { id: "home", label: "בבית" },
  { id: "both", label: "גם וגם" },
];

export const ADDRESS_FORMS: { id: "m" | "f" | "n"; label: string }[] = [
  { id: "m", label: "בלשון זכר" },
  { id: "f", label: "בלשון נקבה" },
  { id: "n", label: "לא משנה" },
];
