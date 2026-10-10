// Worst-case / edge-case fixtures for the Calendar, builder (DIY), My
// workouts and Profile tabs (break-ui). Shaped like the props PatientShell
// passes each tab, rendered only by the dev /dev/tabs harness.
//
// Limits found: exercise names are unbounded text (longest live name_he is
// 70 chars, used below verbatim); saved-program and DIY names are now capped
// at 45 in the form but unbounded in the DB; full_name is "first last" from
// two 30-char inputs.
import type { DevDataMode } from "@/app/components/dev/devDataMode";
import type { HydratedPatientExercise } from "@/app/hooks/useWorkoutSession";
import type { Exercise, SavedProgram, WorkoutLog } from "@/app/types";

export interface TabsFixture {
  fullName: string;
  firstName: string | null;
  catalog: Exercise[];
  patientExercises: HydratedPatientExercise[]; // Calendar
  workoutLogs: WorkoutLog[]; // Calendar ticks, Profile stats
  programStartDate: string;
  diyDays: Record<number, Exercise[]>; // builder draft
  savedPrograms: SavedProgram[]; // My workouts
}

const PATIENT = "-1";
const daysAgo = (n: number, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const iso = (d: Date) => d.toISOString();
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function ex(id: string, nameHe: string, opts: Partial<Exercise> = {}): Exercise {
  return { id, name_he: nameHe, name_display_preference: "he", categories: ["מכון כושר"], equipment: [], target_muscle: "quadriceps", ...opts };
}

// Real live catalog names (incl. the longest name_he, 70 chars) and a pair that
// only differs past the point a one-line truncate cuts.
const CATALOG: Exercise[] = [
  ex("c1", "בק לוור בפישוק רגליים - תרגיל אקסצנטרי (Straddle Back Lever Negatives)", { categories: ["קליסטניקס"], target_muscle: "front-deltoids" }),
  ex("c2", "דדליפט רומני עם קטלבל", { categories: ["מכון כושר", "קטלבל"], target_muscle: "hamstring", equipment: ["kettlebell"] }),
  ex("c3", "דדליפט רומני על רגל אחת עם קטלבל", { categories: ["מכון כושר", "קטלבל"], target_muscle: "hamstring", equipment: ["kettlebell"] }),
  ex("c4", "", { name_en: "Bulgarian Split Squat", name_display_preference: "en", target_muscle: "quadriceps" }),
  // Four categories — none in the live data today, nothing in the schema prevents it.
  ex("c5", "סקוואט קפיצה", { categories: ["קליסטניקס", "מכון כושר", "קטלבל", "פליומטרי"], target_muscle: "quadriceps" }),
  // No target muscle — nothing in the schema requires one.
  ex("c6", "מתיחת בוקר", { target_muscle: undefined }),
  ex("c7", "סקוואט", { target_muscle: "quadriceps" }),
  ex("c8", "גשר", { target_muscle: "gluteal" }),
];
const byId = (id: string) => CATALOG.find((e) => e.id === id)!;

let seq = 0;
function row(program: string | undefined, exercise: Exercise, opts: Partial<HydratedPatientExercise> = {}): HydratedPatientExercise {
  seq++;
  return {
    id: `t-${seq}`, patient_id: PATIENT, exercise_id: exercise.id, exercise, program_name: program,
    block: "A", sets: 3, reps: 10, rir: null, is_time: false, week: 1, scheduled_days: "", rest_time_seconds: 60, ...opts,
  };
}
const log = (d: Date, category = "גב"): WorkoutLog => ({ id: `l-${d.getTime()}`, patient_id: PATIENT, category, rpe: 6, pain_before: null, pain_after: null, created_at: iso(d) });

function demo(): TabsFixture {
  return {
    fullName: "רועי בן טוב",
    firstName: "רועי",
    catalog: CATALOG,
    patientExercises: [
      row("חיזוק רגליים", byId("c7"), { scheduled_days: "0,2,4" }),
      row("חיזוק רגליים", byId("c8"), { scheduled_days: "0,2,4" }),
      row("מוביליטי", byId("c8"), { scheduled_days: "1,3" }),
    ],
    workoutLogs: [log(daysAgo(1)), log(daysAgo(3)), log(daysAgo(5)), log(daysAgo(8))],
    programStartDate: iso(daysAgo(20)),
    diyDays: { 1: [byId("c7"), byId("c8")], 2: [byId("c2")] },
    savedPrograms: [{ id: "s1", patient_id: PATIENT, name: "רגליים ובטן", created_at: iso(daysAgo(3)), days: [{ day_number: 1, exercise_ids: ["c7", "c8"] }, { day_number: 2, exercise_ids: ["c2"] }] }],
  };
}

function worst(): TabsFixture {
  const today = new Date();
  const longA = "שיקום ברך אחרי ניתוח ACL — שלב א׳ (חיזוק)";
  const longB = "שיקום ברך אחרי ניתוח ACL — שלב ב׳ (ריצה)";
  return {
    fullName: "בת שבע וולפסון-קוזלובסקי",
    firstName: "בת שבע",
    catalog: CATALOG,
    patientExercises: [
      // Two programs every day whose names only differ past ~25 chars, a
      // third on Sundays, and a one-time workout pinned to today.
      row(longA, byId("c7")),
      row(longB, byId("c2")),
      row(longB, byId("c3")),
      row("גב", byId("c8"), { scheduled_days: "0" }),
      row(undefined, byId("c4"), { week: null, scheduled_days: null, scheduled_date: dateKey(today) }),
    ],
    // 9 workouts spread over 6 months, the latest yesterday — a real streak of 1.
    workoutLogs: [1, 20, 41, 60, 85, 100, 130, 150, 180].map((n) => log(daysAgo(n), longA)),
    programStartDate: iso(daysAgo(10)),
    diyDays: {
      1: [byId("c1")],
      2: [byId("c2"), byId("c3"), byId("c1"), byId("c4"), byId("c5")],
      3: [], 4: [byId("c7")], 5: [], 6: [byId("c8")], 7: [], 8: [], 9: [byId("c6")],
    },
    savedPrograms: [
      // 45 chars (the new form cap), one day with one exercise.
      { id: "w1", patient_id: PATIENT, name: "תוכנית ביתית לחיזוק הגב התחתון והליבה — 3x שבוע", created_at: iso(today), days: [{ day_number: 1, exercise_ids: ["c1"] }] },
      // Exercises deleted from the catalog since saving: day 2 hydrates to nothing.
      { id: "w2", patient_id: PATIENT, name: "Upper/Lower Split", created_at: iso(daysAgo(400)), days: [{ day_number: 1, exercise_ids: ["c2", "c3", "deleted-1"] }, { day_number: 2, exercise_ids: ["deleted-2", "deleted-3"] }] },
      // Seven days, every category.
      { id: "w3", patient_id: PATIENT, name: "שבוע מלא", created_at: iso(daysAgo(40)), days: Array.from({ length: 7 }, (_, i) => ({ day_number: i + 1, exercise_ids: ["c1", "c2", "c4", "c5", "c7"] })) },
    ],
  };
}

function one(): TabsFixture {
  return {
    fullName: "Jo",
    firstName: "Jo",
    catalog: CATALOG,
    patientExercises: [row("גב", byId("c8"), { scheduled_days: String(new Date().getDay()) })],
    workoutLogs: [log(daysAgo(0))],
    programStartDate: iso(daysAgo(2)),
    diyDays: { 1: [byId("c7")] },
    savedPrograms: [{ id: "o1", patient_id: PATIENT, name: "גב", created_at: iso(daysAgo(1)), days: [{ day_number: 1, exercise_ids: ["c8"] }] }],
  };
}

function empty(): TabsFixture {
  return { fullName: "", firstName: null, catalog: CATALOG, patientExercises: [], workoutLogs: [], programStartDate: iso(new Date()), diyDays: { 1: [] }, savedPrograms: [] };
}

function huge(): TabsFixture {
  const programs = Array.from({ length: 12 }, (_, i) => `תוכנית ${i + 1}`);
  return {
    fullName: "Aleksandra Wiśniewska-Kowalczyk",
    firstName: "Aleksandra",
    catalog: CATALOG,
    patientExercises: programs.flatMap((p) => [row(p, byId("c7")), row(p, byId("c8"))]),
    workoutLogs: Array.from({ length: 300 }, (_, i) => log(daysAgo(i))),
    programStartDate: iso(daysAgo(400)),
    diyDays: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [i + 1, CATALOG.slice(0, 1 + (i % 8))])),
    savedPrograms: Array.from({ length: 50 }, (_, i) => ({
      id: `h${i}`, patient_id: PATIENT, name: `תוכנית שמורה ${i + 1}`, created_at: iso(daysAgo(i * 7)),
      days: [{ day_number: 1, exercise_ids: ["c7", "c8"] }],
    })),
  };
}

export function tabsFixture(mode: DevDataMode): TabsFixture {
  seq = 0;
  switch (mode) {
    case "demo": return demo();
    case "worst": return worst();
    case "empty": return empty();
    case "one": return one();
    case "huge": return huge();
  }
}
