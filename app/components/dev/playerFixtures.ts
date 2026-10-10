// Worst-case / edge-case fixtures for the workout player (break-ui).
// Shaped like the SessionExercise[] the player gets for an Explore workout or
// a saved DIY day (adHocSession), plus the workout logs it reads "פעם
// קודמת" weights from. Rendered only by the dev /dev/player harness.
//
// Limits found: sets/reps/rest/weight are plain numeric columns with no
// upper bound; exercise names are unbounded text (longest live name_he is 70
// chars, used verbatim below).
import type { DevDataMode } from "@/app/components/dev/devDataMode";
import type { SessionExercise } from "@/app/hooks/useWorkoutSession";
import type { Exercise, WorkoutLog } from "@/app/types";

export interface PlayerFixture {
  title: string;
  exercises: SessionExercise[];
  workoutLogs: WorkoutLog[];
}

function ex(id: string, nameHe: string, opts: Partial<Exercise> = {}): Exercise {
  return { id, name_he: nameHe, name_display_preference: "he", categories: ["מכון כושר"], equipment: [], target_muscle: "quadriceps", ...opts };
}

let seq = 0;
function se(exercise: Exercise, block: string, opts: Partial<SessionExercise> = {}): SessionExercise {
  seq++;
  return { id: `p-${seq}`, exercise, sets: 3, reps: 10, rir: null, is_time: false, block, rest_time_seconds: 60, weight_kg: null, ...opts };
}

// A past log carrying per-set weights, so the "פעם קודמת" chip has data.
function weightLog(entries: { exercise_id: string; weight_kg: number }[]): WorkoutLog {
  return {
    id: "pl-1", patient_id: "-1", category: "אימון קודם", rpe: 7, pain_before: null, pain_after: null,
    created_at: new Date(Date.now() - 3 * 864e5).toISOString(),
    performance_data: JSON.stringify(entries.map((e, i) => ({ ...e, set_number: i + 1, reps: 8 }))),
  };
}

function demo(): PlayerFixture {
  const squat = ex("d1", "סקוואט גביע");
  const rdl = ex("d2", "דדליפט רומני", { target_muscle: "hamstring" });
  const plank = ex("d3", "פלאנק", { target_muscle: "abs" });
  return {
    title: "חיזוק רגליים",
    exercises: [se(squat, "A", { reps: 10, weight_kg: 16, rir: 2 }), se(rdl, "B", { reps: 8 }), se(plank, "C", { is_time: true, reps: 45 })],
    workoutLogs: [weightLog([{ exercise_id: "d1", weight_kg: 14 }])],
  };
}

function worst(): PlayerFixture {
  const longest = ex("w1", "בק לוור בפישוק רגליים - תרגיל אקסצנטרי (Straddle Back Lever Negatives)", { categories: ["קליסטניקס"], target_muscle: "front-deltoids" });
  const enOnly = ex("w2", "", { name_en: "Single-Leg Kettlebell Romanian Deadlift", name_display_preference: "en", target_muscle: "hamstring" });
  const wallSit = ex("w3", "ישיבה על הקיר", { target_muscle: "quadriceps" });
  const jacks = ex("w4", "קפיצות פיסוק", { target_muscle: "calves" });
  const singles = ex("w5", "דדליפט", { target_muscle: "hamstring" });
  const mixed = ex("w6", "Nordic Hamstring Curl (אקסצנטרי, איטי, עם עזרה של שותף או רצועה)", { target_muscle: "hamstring" });
  return {
    title: "שיקום ברך אחרי ניתוח ACL — שלב ב׳ (חזרה לריצה וקפיצות)",
    exercises: [
      // Rep range, RIR 0, a heavy decimal weight that differs from last time, a 5-minute rest.
      se(longest, "A", { sets: 5, reps: 8, reps_max: 12, rir: 0, weight_kg: 102.5, rest_time_seconds: 300 }),
      // Superset of three: an English-only name, a 3-minute hold, high reps.
      se(enOnly, "B", { sets: 4, reps: 6, weight_kg: 24 }),
      se(wallSit, "B", { sets: 4, is_time: true, reps: 180 }),
      se(jacks, "B", { sets: 4, reps: 50, rest_time_seconds: 120 }),
      // Heavy singles: many sets of one rep.
      se(singles, "C", { sets: 12, reps: 1, rir: 1, weight_kg: 180, rest_time_seconds: 240 }),
      // Mixed-language long name, no rest.
      se(mixed, "D", { sets: 3, reps: 3, reps_max: 5, rest_time_seconds: 0 }),
    ],
    workoutLogs: [weightLog([{ exercise_id: "w1", weight_kg: 97.5 }, { exercise_id: "w5", weight_kg: 175 }])],
  };
}

function one(): PlayerFixture {
  return { title: "גב", exercises: [se(ex("o1", "סקוואט"), "A", { sets: 1, reps: 1 })], workoutLogs: [] };
}

function empty(): PlayerFixture {
  // A workout whose exercises all vanished from the catalog — hydration drops them.
  return { title: "אימון ריק", exercises: [], workoutLogs: [] };
}

function huge(): PlayerFixture {
  return {
    title: "אימון ארוך מאוד",
    exercises: Array.from({ length: 40 }, (_, i) => se(ex(`h${i}`, `תרגיל ${i + 1}`), String.fromCharCode(65 + (i % 26)) + (i >= 26 ? "2" : ""), { sets: 10, reps: 10, rest_time_seconds: 30 })),
    workoutLogs: [],
  };
}

export function playerFixture(mode: DevDataMode): PlayerFixture {
  seq = 0;
  switch (mode) {
    case "demo": return demo();
    case "worst": return worst();
    case "empty": return empty();
    case "one": return one();
    case "huge": return huge();
  }
}
