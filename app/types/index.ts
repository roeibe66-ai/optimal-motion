export type Lang = "he" | "en";

export type ViewName = "landing" | "register" | "login" | "patient" | "admin";

export type PatientType = "clinical" | "fitness";

export interface Patient {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  password: string;
  patient_type: PatientType;
  premium_tracks?: string; // comma-separated ADMIN_TAGS ids the patient has purchased access to
  email_verified?: boolean;
  reminder_time?: string; // "HH:MM"
  reminder_days?: string; // comma-separated DAYS_OF_WEEK ids
  created_at?: string;
}

export interface Exercise {
  id: string;
  title: string;
  category: string;
  description?: string;
  gif_url?: string;
  target_muscle?: string; // react-body-highlighter muscle id
  secondary_muscles?: string; // comma-separated react-body-highlighter muscle ids
  admin_tags?: string; // comma-separated ADMIN_TAGS ids
  common_mistake?: string;
}

export interface Package {
  id: string;
  title: string;
  description?: string;
}

export interface PackageExercise {
  id: string;
  package_id: string;
  exercise_id: string;
  block: string;
  sets: number;
  reps: number;
  rir: number | null;
  is_time: boolean;
  week: number;
  scheduled_days: string; // single DAYS_OF_WEEK id
}

export interface PatientExercise {
  id: string;
  patient_id: string;
  exercise_id: string;
  exercise?: Exercise; // joined client-side after fetch, not a DB column
  block: string;
  sets: number;
  reps: number;
  rir: number | null;
  notes?: string;
  is_time: boolean;
  week: number;
  scheduled_days?: string | null; // comma-separated DAYS_OF_WEEK ids, or null for "every day"
}

export interface SessionPerformanceEntry {
  exercise_id: string;
  set_number: number;
  reps: number;
  rir?: number; // patient-reported reps-in-reserve for this specific set, captured on the rest screen
}

export interface WorkoutLog {
  id: string;
  patient_id: string;
  category: string;
  rpe: number;
  pain_before: number | null;
  pain_after: number | null;
  pain_areas?: string | null; // comma-separated react-body-highlighter muscle ids
  performance_data?: string | null; // JSON-stringified SessionPerformanceEntry[]
  created_at: string;
}

// An Exercise as it exists inside the admin plan builder's drag-and-drop grid,
// before being persisted as a PatientExercise or PackageExercise row.
export interface BuilderExercise extends Exercise {
  temp_id: string;
  sets: number;
  reps: number;
  rir: number | null;
  is_time: boolean;
  block: string;
}

export type BuilderDayPlan = Record<string, BuilderExercise[]>; // keyed by DAYS_OF_WEEK id
export type BuilderWeekPlan = Record<number, BuilderDayPlan>; // keyed by week number

export interface SavedWorkout {
  id: string;
  patient_id: string;
  name: string;
  scheduled_day: string | null; // DAYS_OF_WEEK id
  exercise_ids: string[]; // ordered, references exercises.id
  created_at: string;
}

export interface OnboardingAnswers {
  goal: string;
  location: string;
  pain: string;
}
