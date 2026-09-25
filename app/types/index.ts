export type Lang = "he" | "en";

export type ViewName = "landing" | "register" | "login" | "reset_password" | "patient" | "admin";

export type PatientType = "clinical" | "fitness";
export type UserRole = "patient" | "admin";

export interface Patient {
  id: string;
  user_id: string; // 1:1 link to auth.users.id — real Supabase Auth identity, not a local password column
  role: UserRole;
  full_name: string;
  email?: string;
  phone?: string;
  patient_type: PatientType;
  premium_tracks?: string; // comma-separated ADMIN_TAGS ids the patient has purchased access to
  // NOTE: does not correspond to a real column right now (verified against
  // the live schema during the auth migration) — superseded by Supabase
  // Auth's own email_confirmed_at, but the 3 call sites that read this
  // (PatientShell.tsx, PremiumStoreTab.tsx, PlanTab.tsx) are out of scope
  // for this pass and still reference it, so it's left in place for now.
  email_verified?: boolean;
  reminder_time?: string; // "HH:MM"
  reminder_days?: string; // comma-separated DAYS_OF_WEEK ids
  onboarding_completed_at?: string | null; // null = hasn't finished the onboarding wizard yet
  created_at?: string;
}

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "clinical";

// Which name(s) getExerciseName() shows for this exercise, independent of the
// viewer's own UI language — an explicit authorial override, not a fallback.
export type NameDisplayPreference = "en" | "he" | "both";

export interface Exercise {
  id: string;
  // Replaces the old single `title` column. Both are optional now (an
  // exercise can be entered in just one language) — always read through
  // getExerciseName(exercise, lang) (app/utils/format.ts) rather than these
  // directly; it resolves name_display_preference and the empty-field/
  // lang-not-ready fallbacks for you.
  name_he?: string;
  name_en?: string;
  name_display_preference: NameDisplayPreference;
  categories: string[]; // was a single `category` string; an exercise can now belong to more than one
  difficulty_level?: DifficultyLevel | null;
  equipment?: string[]; // EQUIPMENT_LIST ids (app/constants/catalog.ts)
  description?: string;
  // English sibling of description/patient_cues/common_mistake below — added
  // purely additively (see 20260924120000_exercises_add_english_translation_fields.sql
  // and 20260925090000_exercises_rename_cues_mistakes_en_columns.sql), unlike
  // name_he/name_en which replaced a single column. Optional/for future use:
  // always read through pickLangText (app/utils/format.ts) rather than these
  // directly, same convention as getExerciseName.
  description_en?: string;
  gif_url?: string;
  secondary_gif_url?: string | null; // optional second camera angle; toggled between in WorkoutPlayer's active-exercise view
  target_muscle?: string; // AVAILABLE_MUSCLES id (app/constants/catalog.ts) - not react-body-highlighter, which only backs the separate pain-area check-in
  secondary_muscles?: string; // comma-separated AVAILABLE_MUSCLES ids
  admin_tags?: string; // comma-separated ADMIN_TAGS ids
  common_mistake?: string; // plain text, one point per line — UI splits on \n and prefixes each with ❌, DB stays plain
  mistakes_en?: string; // English sibling of common_mistake — see description_en above (column renamed from common_mistake_en on 2026-09-25, while still empty on every row)
  patient_cues?: string; // "Clinical Cues": plain text, one point per line — UI splits on \n and prefixes each with ✅, DB stays plain
  cues_en?: string; // English sibling of patient_cues — see description_en above (column renamed from patient_cues_en on 2026-09-25, while still empty on every row)
  easier_version_id?: string | null; // exercises.id of the regression (e.g. Banded Pull-up for Pull-up)
  harder_version_id?: string | null; // exercises.id of the progression (e.g. Pull-up for Banded Pull-up)
  // AVAILABLE_MUSCLES ids (app/constants/catalog.ts), real arrays this time —
  // unlike target_muscle/secondary_muscles above, which pack multiple ids
  // into one comma-separated string. Rendered by AnatomyHeatmap via
  // muscleMapping.ts, which resolves each id to real SVG path ids.
  prime_movers?: string[];
  synergists?: string[];
}

// A single admin-curated, publicly browsable workout (Explore tab / the
// no-program-yet onboarding block) — distinct from Package (an unused
// multi-week admin->patient assignment) and SavedProgram (private,
// patient-authored). One session's worth of exercises, not a multi-day plan.
export interface Workout {
  id: string;
  title: string;
  category?: string | null;
  cover_image_url?: string | null;
  exercise_ids: string[];
  is_free: boolean;
  sort_order: number;
  created_at: string;
}

export type PackageStatus = "draft" | "published";

export interface Package {
  id: string;
  title: string;
  description?: string;
  status: PackageStatus;
  created_at?: string;
}

export interface PackageExercise {
  id: string;
  package_id: string;
  exercise_id: string;
  exercise?: Exercise; // joined client-side after fetch, not a DB column
  block: string;
  sets: number;
  reps: number;
  rir: number | null;
  is_time: boolean;
  week: number;
  scheduled_days: string; // single DAYS_OF_WEEK id
  rest_time_seconds: number;
  // Live since 20260901084753_patient_and_package_exercises_tempo, but no
  // builder UI sets them yet — read-only fields so the PDF export can
  // display tempo when a row happens to have it, without claiming the
  // builder can edit it.
  tempo_eccentric?: number | null;
  tempo_pause?: number | null;
  tempo_concentric?: number | null;
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
  rest_time_seconds: number;
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
  rest_time_seconds: number;
}

export type BuilderDayPlan = Record<string, BuilderExercise[]>; // keyed by DAYS_OF_WEEK id
export type BuilderWeekPlan = Record<number, BuilderDayPlan>; // keyed by week number

// One ordinal day (Day 1, Day 2, ...) within a saved weekly program — not
// tied to a calendar weekday, just a builder slot.
export interface SavedProgramDay {
  day_number: number;
  exercise_ids: string[]; // ordered, references exercises.id
}

export interface SavedProgram {
  id: string;
  patient_id: string;
  name: string;
  days: SavedProgramDay[];
  created_at: string;
}

// One highly-cited paper's LLM-generated Hebrew digest, produced by
// app/actions/researchAgent.ts. Not a DB row (nothing is persisted yet) —
// this is what the future research tab renders directly from the server
// action's response.
export interface ResearchFinding {
  paperTitle: string;
  paperUrl: string;
  year: number | null;
  summaryHe: string;
  didYouKnowHe: string;
  // Both computed deterministically in researchAgent.ts from the paper's
  // publication-type/keyword signals (the same ones its evidence-hierarchy
  // ranking used) — not LLM-generated, so they can't drift from what
  // actually determined the paper's rank. evidenceLabelHe is the bare label
  // ("סקירה שיטתית"); citationLabelHe is the ready-to-display tag
  // ("מקור: סקירה שיטתית, 2023").
  evidenceLabelHe: string;
  citationLabelHe: string;
}

// A ResearchFinding the admin has approved and published — the curated_facts
// table (snake_case columns, matching every other table here) rather than
// the LLM-shaped ResearchFinding above. Read directly by the patient home
// screen's "Did you know?" section.
export interface CuratedFact {
  id: string;
  paper_title: string;
  paper_url: string | null;
  year: number | null;
  summary_he: string;
  did_you_know_he: string;
  created_at: string;
}

// app/actions/aiAssistant.ts's dual-mode chat: "admin" gets the peer-to-peer
// clinical co-pilot persona, "patient" gets the premium-coach persona.
export type AIAssistantRole = "admin" | "patient";

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Freeform grounding data the caller assembles from whatever it already has
// on screen (the admin builder's in-progress plan, or the patient's own
// assigned plan/logs) and hands to chatWithAssistant alongside the message
// history — every field is optional since admin and patient callers each
// only have some of these available.
export interface AIAssistantContext {
  patientName?: string;
  patientType?: PatientType;
  currentExercises?: { title: string; block: string; sets: number; reps: number }[];
  recentWorkoutLogs?: { category: string; rpe: number; painBefore: number | null; painAfter: number | null; createdAt: string }[];
  painAreas?: string[];
  notes?: string;
}
