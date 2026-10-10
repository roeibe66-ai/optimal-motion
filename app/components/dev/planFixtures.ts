// Worst-case / edge-case fixtures for the patient Plan tab (break-ui).
// Shaped exactly like the props PatientShell feeds PlanTab (via
// usePatientData + useWorkoutSession) plus the logged-in patient's name, and
// rendered by the dev-only /dev/plan harness — never by the real app.
//
// Limits found: patients.full_name is built from two unbounded register
// inputs (`${first} ${last}`); program names (patient_programs.name) come from
// the admin assign modal or the DIY builder, both unbounded; curated facts
// are LLM-drafted text, unbounded.
import type { DevDataMode } from "@/app/components/dev/devDataMode";
import type { HydratedPatientExercise } from "@/app/hooks/useWorkoutSession";
import type { CuratedFact, Exercise, ExploreProgram, WorkoutLog } from "@/app/types";

export interface PlanFixture {
  fullName: string;
  firstName?: string | null; // patients.first_name; null = account from before the column
  exercises: HydratedPatientExercise[];
  workoutLogs: WorkoutLog[];
  curatedFacts: CuratedFact[];
  starterPrograms: ExploreProgram[];
}

const TODAY = String(new Date().getDay());

function exercise(id: string, nameHe: string, opts: Partial<Exercise> = {}): Exercise {
  return {
    id,
    name_he: nameHe,
    name_display_preference: "he",
    categories: ["מכון כושר"],
    equipment: [],
    ...opts,
  };
}

let rowSeq = 0;
function row(program: string | undefined, ex: Exercise, opts: Partial<HydratedPatientExercise> = {}): HydratedPatientExercise {
  rowSeq++;
  return {
    id: `fx-${rowSeq}`,
    patient_id: "-1",
    exercise_id: ex.id,
    exercise: ex,
    program_name: program,
    block: "A",
    sets: 3,
    reps: 10,
    rir: null,
    is_time: false,
    week: 1,
    scheduled_days: TODAY,
    rest_time_seconds: 60,
    ...opts,
  };
}

function log(daysAgo: number, rpe: number | null, category: string, hour = 9): WorkoutLog {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return { id: `log-${daysAgo}-${hour}`, patient_id: "-1", category, rpe: rpe as number, pain_before: null, pain_after: null, created_at: d.toISOString() };
}

function fact(id: string, didYouKnow: string, summary: string, paperTitle: string, year: number | null, url: string | null): CuratedFact {
  return { id, did_you_know_he: didYouKnow, summary_he: summary, paper_title: paperTitle, year, paper_url: url, is_hidden: false, created_at: "2026-10-01T00:00:00Z" };
}

const starter = (id: string, title: string): ExploreProgram => ({ id, title, status: "published", is_free: true, exercises: [] });

// --- Demo: the kind data the screen was designed against ---------------
function demo(): PlanFixture {
  const squat = exercise("d1", "סקוואט גביע", { equipment: ["kettlebell"], target_muscle: "quadriceps", prime_movers: ["quadriceps", "gluteal"], synergists: ["hamstring"] });
  const rdl = exercise("d2", "דדליפט רומני", { equipment: ["dumbbells"], target_muscle: "hamstring", prime_movers: ["hamstring"], synergists: ["gluteal", "lower-back"] });
  const plank = exercise("d3", "פלאנק", { target_muscle: "abs", prime_movers: ["abs"] });
  return {
    fullName: "רועי בן טוב",
    exercises: [
      row("חיזוק רגליים", squat, { block: "A", reps: 8, reps_max: 12, weight_kg: 16 }),
      row("חיזוק רגליים", rdl, { block: "B", rir: 2 }),
      row("חיזוק רגליים", plank, { block: "C", is_time: true, reps: 45 }),
      row("מוביליטי", plank, { scheduled_days: "2" }),
    ],
    workoutLogs: [log(1, 6, "חיזוק רגליים"), log(3, 7, "חיזוק רגליים"), log(5, 5, "מוביליטי"), log(8, 8, "חיזוק רגליים"), log(10, 7, "חיזוק רגליים")],
    curatedFacts: [fact("f1", "אימון אקסצנטרי מפחית כאב בגיד הברך תוך 12 שבועות.", "מטא-אנליזה של 14 מחקרים מצאה שיפור משמעותי בכאב ובתפקוד.", "Eccentric training for patellar tendinopathy", 2021, "https://example.com/paper")],
    starterPrograms: [],
  };
}

// --- Worst case: realistic data that the demo avoided --------------------
function worst(): PlanFixture {
  const longProgram = "שיקום ברך אחרי ניתוח ACL — שלב ב׳ (חזרה לריצה וקפיצות)";
  const exs = [
    exercise("w1", "כפיפת ברך בשכיבה על הבטן עם גומיית התנגדות — רגל אחת", {
      equipment: ["resistance_band", "dumbbells", "kettlebell", "pullup_bar", "parallettes", "rings", "ab_wheel", "jump_rope"],
      target_muscle: "hamstring",
      prime_movers: ["hamstring", "quadriceps", "gluteal"],
      synergists: ["calves", "adductors", "abductors", "lower-back", "abs", "obliques"],
    }),
    exercise("w2", "", { name_en: "Bulgarian Split Squat", name_display_preference: "en", target_muscle: "quadriceps", categories: ["קטלבל"] }),
    exercise("w3", "Copenhagen Plank עם הרמת רגל", { target_muscle: "adductors" }),
    exercise("w4", "גשר", { target_muscle: "gluteal" }),
    exercise("w5", "הליכת חקלאי", { target_muscle: "upper-back", equipment: ["kettlebell"] }),
    exercise("w6", "Nordic Hamstring Curl (אקסצנטרי, איטי, עם עזרה של שותף או רצועה)", { target_muscle: "hamstring" }),
    exercise("w7", "קפיצות", { target_muscle: "calves", categories: ["פליומטרי"] }),
    exercise("w8", "Single-Leg-Romanian-Deadlift-To-Knee-Drive", { target_muscle: "gluteal" }),
    exercise("w9", "מתיחת ירך", { target_muscle: "abductors" }),
  ];
  return {
    // Two-word first name typed into the register form's first-name field.
    fullName: "בת שבע וולפסון-קוזלובסקי",
    firstName: "בת שבע",
    exercises: [
      row(longProgram, exs[0], { block: "A", sets: 5, reps: 8, reps_max: 12, rir: 0, weight_kg: 22.5, rest_time_seconds: 180 }),
      // A superset of three, with a long rest after each round.
      row(longProgram, exs[1], { block: "B", sets: 4, reps: 12, weight_kg: 102.5 }),
      row(longProgram, exs[2], { block: "B", sets: 4, is_time: true, reps: 90 }),
      row(longProgram, exs[5], { block: "B", sets: 4, reps: 3, reps_max: 5, rest_time_seconds: 240 }),
      row(longProgram, exs[3], { block: "C", sets: 1, reps: 1 }),
      row(longProgram, exs[4], { block: "D", sets: 3, is_time: true, reps: 600 }),
      row(longProgram, exs[7], { block: "E", sets: 12, reps: 100 }),
      row(longProgram, exs[6], { block: "F", sets: 3, reps: 20, scheduled_days: "", rest_time_seconds: 0 }),
      // Other programs: a one-word name, a mixed-language one, a self-built
      // one (no program_name -> "האימונים שלי"), and one that isn't on today.
      row("גב", exs[3]),
      row("Mobility & Prehab לכתף ולעמוד שדרה חזי", exs[8]),
      row(undefined, exs[4]),
      row("יוגה", exs[8], { scheduled_days: String((Number(TODAY) + 1) % 7) }),
    ],
    workoutLogs: [
      // 22 logs: rpe extremes, a null rpe, two on the same day, across a year boundary.
      ...Array.from({ length: 20 }, (_, i) => log(i * 4, [1, 10, 6, 8, 3, 9, 7, 5, 10, 2][i % 10], i % 3 === 0 ? longProgram : "גב")),
      log(0, 9, longProgram, 18),
      log(2, null, "גב"),
    ],
    curatedFacts: [
      fact(
        "wf1",
        "מחקר שבדק 1,284 רצים חובבים מצא שחיזוק השרירים האחוריים של הירך באמצעות תרגילים אקסצנטריים איטיים, פעמיים בשבוע במשך 10 שבועות, הפחית את הסיכון לפציעת האמסטרינג ביותר מ-50% לעומת קבוצת ביקורת שהתאמנה כרגיל.",
        "הניסוי המבוקר כלל 1,284 משתתפים בגילאי 18–55. קבוצת ההתערבות ביצעה Nordic Hamstring Curl פעמיים בשבוע. שיעור הפציעות ירד מ-13.1% ל-6.0%. החוקרים מציינים שההיענות לתוכנית הייתה גבוהה יחסית, ושהיתרון נשמר גם בניתוח לפי גיל, מין ורמת אימון.",
        "Preventive effect of eccentric training on acute hamstring injuries in men's soccer: a cluster-randomized controlled trial with 12-month follow-up and subgroup analyses",
        2011,
        "https://example.com/journals/sports-medicine/2011/preventive-effect-of-eccentric-training-on-acute-hamstring-injuries",
      ),
      // Missing year and url.
      fact("wf2", "מתיחות לפני אימון לא מונעות פציעות.", "סקירה שיטתית.", "Stretching and injury prevention", null, null),
    ],
    starterPrograms: [],
  };
}

function one(): PlanFixture {
  const ex = exercise("o1", "סקוואט", { target_muscle: "quadriceps", prime_movers: ["quadriceps"] });
  return {
    fullName: "Jo",
    exercises: [row("גב", ex, { sets: 1 })],
    workoutLogs: [log(1, 7, "גב")],
    curatedFacts: [fact("of1", "עובדה אחת.", "סיכום.", "One paper", 2020, null)],
    starterPrograms: [],
  };
}

function empty(): PlanFixture {
  // A brand-new patient: no plan, no logs, no facts — the starter-program offer.
  return {
    fullName: "",
    exercises: [],
    workoutLogs: [],
    curatedFacts: [],
    starterPrograms: [starter("s1", "חיזוק כללי למתחילים"), starter("s2", "מוביליטי יומי — 10 דקות"), starter("s3", "Full Body Strength 3x/week — למתחילים")],
  };
}

function huge(): PlanFixture {
  const programs = Array.from({ length: 14 }, (_, i) => `תוכנית ${i + 1}`);
  const exercises: HydratedPatientExercise[] = [];
  for (let i = 0; i < 60; i++) {
    const ex = exercise(`h${i}`, `תרגיל מספר ${i + 1}`, { target_muscle: "abs", prime_movers: ["abs"] });
    exercises.push(row(i < 40 ? programs[0] : programs[i % programs.length], ex, { block: String.fromCharCode(65 + Math.floor(i / 3)) }));
  }
  programs.forEach((p, i) => exercises.push(row(p, exercise(`hp${i}`, "פלאנק"))));
  return {
    fullName: "Aleksandra Wiśniewska-Kowalczyk",
    exercises,
    workoutLogs: Array.from({ length: 300 }, (_, i) => log(i, (i % 10) + 1, programs[i % programs.length])),
    curatedFacts: Array.from({ length: 25 }, (_, i) => fact(`hf${i}`, `עובדה מספר ${i + 1} על אימון וכאב.`, "סיכום קצר.", `Paper ${i + 1}`, 2000 + i, null)),
    starterPrograms: [],
  };
}

export function planFixture(mode: DevDataMode): PlanFixture {
  rowSeq = 0;
  switch (mode) {
    case "demo":
      return demo();
    case "worst":
      return worst();
    case "empty":
      return empty();
    case "one":
      return one();
    case "huge":
      return huge();
  }
}
