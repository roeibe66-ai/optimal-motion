// Worst-case / edge-case fixtures for the Explore tab cards (break-ui).
// Shaped exactly like what useExplorePrograms builds from Supabase, and
// swapped in at that hook via `?data=` (devDataMode.ts) — dev only.
//
// Titles are unbounded in the schema (`text not null` on packages/workouts),
// so the long ones are realistic for a physio catalog rather than random.
// Cover art comes from real exercise ids (passed in), except where a
// missing/broken cover is the point.
import type { DevDataMode } from "@/app/components/dev/devDataMode";
import type { ExploreProgram, PackageExercise, Workout, WorkoutItem } from "@/app/types";

export interface ExploreFixture {
  programs: ExploreProgram[];
  workouts: Workout[];
  likedProgramIds: string[];
  likedWorkoutIds: string[];
  addedProgramIds: string[];
}

// An exercise id that matches nothing in the catalog — the card gets no cover.
const NO_COVER = "00000000-0000-0000-0000-000000000000";

function program(id: string, title: string, isFree: boolean, weeks: number, daysPerWeek: number, exerciseId: string): ExploreProgram {
  const exercises: PackageExercise[] = [];
  for (let week = 1; week <= weeks; week++) {
    for (let day = 0; day < daysPerWeek; day++) {
      exercises.push({
        id: `${id}-w${week}-d${day}`,
        package_id: id,
        exercise_id: exerciseId,
        block: "A",
        sets: 3,
        reps: 10,
        rir: null,
        is_time: false,
        week,
        scheduled_days: String(day),
        rest_time_seconds: 60,
      });
    }
  }
  return { id, title, status: "published", is_free: isFree, exercises };
}

function workout(id: string, title: string, opts: { isFree?: boolean; amrapMinutes?: number; itemCount: number; exerciseId: string; coverUrl?: string }): Workout {
  const items: WorkoutItem[] = Array.from({ length: opts.itemCount }, () => ({ exercise_id: opts.exerciseId, sets: 3, reps: 10, is_time: false }));
  return {
    id,
    title,
    format: opts.amrapMinutes ? "amrap" : "standard",
    time_cap_seconds: opts.amrapMinutes ? opts.amrapMinutes * 60 : null,
    status: "published",
    is_free: opts.isFree ?? true,
    items,
    exercise_ids: items.map((it) => it.exercise_id),
    cover_image_url: opts.coverUrl ?? null,
    created_at: "2026-10-01T00:00:00Z",
  };
}

function worstCase(ex: (i: number) => string): ExploreFixture {
  return {
    programs: [
      // Two long titles that only differ at the end — end-truncation makes them identical.
      program("-101", "שיקום ברך אחרי ניתוח שחזור רצועה צולבת קדמית (ACL) — שלב ב׳: חזרה לריצה", false, 12, 6, ex(0)),
      program("-102", "שיקום ברך אחרי ניתוח שחזור רצועה צולבת קדמית (ACL) — שלב א׳", true, 4, 3, ex(1)),
      // Shortest real title, one week, one day ("1 ימי אימון"), no cover art.
      program("-103", "גב", true, 1, 1, NO_COVER),
      // Mixed English/Hebrew (bidi) title.
      program("-104", "Full Body Strength 3x/week — למתחילים", true, 2, 7, ex(2)),
      // Emoji first, colon, and a year-long program.
      program("-105", "🔥 אתגר 30 יום: בטן, ישבן וירכיים", false, 52, 5, ex(3)),
      // Quotes and an ampersand (escaping; also flows into alert/confirm/WhatsApp text).
      program("-106", 'תוכנית "בית" ללא ציוד & גומיות', true, 3, 2, ex(4)),
    ],
    workouts: [
      workout("-201", "AMRAP מלא לכל הגוף עם קטלבל — 4 תרגילים, ללא מנוחה בין סבבים", { amrapMinutes: 60, itemCount: 4, exerciseId: ex(0) }),
      // One exercise ("1 תרגילים").
      workout("-202", "מתיחת ירך", { itemCount: 1, exerciseId: ex(1) }),
      // Cover URL that isn't an image — the broken-image case.
      workout("-203", "שחרור כתפיים בעבודה מול מחשב", { itemCount: 5, exerciseId: ex(2), coverUrl: "https://example.com/covers/shoulder-release.jpg" }),
      // Long English title, premium, many exercises.
      workout("-204", "Pre-hab לכתף: Rotator Cuff, Scapular Control & Thoracic Mobility", { isFree: false, itemCount: 38, exerciseId: ex(3) }),
      // Long hyphenated token with no spaces.
      workout("-205", "HIIT-Tabata-EMOM-Conditioning-Finisher", { amrapMinutes: 8, itemCount: 6, exerciseId: ex(4) }),
    ],
    likedProgramIds: ["-101", "-104"],
    likedWorkoutIds: ["-201"],
    addedProgramIds: ["-101", "-102"],
  };
}

function one(ex: (i: number) => string): ExploreFixture {
  return {
    programs: [program("-301", "גב", true, 1, 1, ex(0))],
    workouts: [workout("-401", "מתיחת ירך", { itemCount: 1, exerciseId: ex(1) })],
    likedProgramIds: [],
    likedWorkoutIds: [],
    addedProgramIds: [],
  };
}

function huge(ex: (i: number) => string): ExploreFixture {
  const names = ["חיזוק ברך", "שיקום כתף", "יציבות גב תחתון", "ניידות ירך", "כוח לכל הגוף", "מתיחות בוקר"];
  return {
    programs: Array.from({ length: 300 }, (_, i) => program(`-${1000 + i}`, `${names[i % names.length]} ${i + 1}`, i % 3 !== 0, 1 + (i % 4), 1 + (i % 5), ex(i))),
    workouts: Array.from({ length: 300 }, (_, i) =>
      workout(`-${2000 + i}`, `${names[i % names.length]} — אימון ${i + 1}`, { itemCount: 1 + (i % 9), exerciseId: ex(i), amrapMinutes: i % 4 === 0 ? 10 + (i % 20) : undefined })
    ),
    likedProgramIds: [],
    likedWorkoutIds: [],
    addedProgramIds: [],
  };
}

// null in "demo" mode (use the real data). `exerciseIds` are real catalog ids
// to borrow cover art from; fixtures cycle through them.
export function exploreFixture(mode: DevDataMode, exerciseIds: string[]): ExploreFixture | null {
  const ex = (i: number) => (exerciseIds.length ? exerciseIds[i % exerciseIds.length] : NO_COVER);
  switch (mode) {
    case "demo":
      return null;
    case "worst":
      return worstCase(ex);
    case "empty":
      return { programs: [], workouts: [], likedProgramIds: [], likedWorkoutIds: [], addedProgramIds: [] };
    case "one":
      return one(ex);
    case "huge":
      return huge(ex);
  }
}
