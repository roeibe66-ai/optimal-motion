import type { Exercise, Lang } from "@/app/types";

// name_he/name_en replaced the old single `title` column so exercise names
// can be bilingual; both are optional (an exercise can be entered in just
// one language). Every read site should go through this rather than reaching
// into name_he/name_en directly.
//
// name_display_preference is an explicit per-exercise authorial override —
// "always show this exercise's name in English", say, regardless of the
// viewer's own UI language — so it takes priority over `lang` whenever it's
// set to one of the three recognized values. `lang` is the fallback used for
// legacy/unrecognized preference values (there's always at least one, since
// the DB column defaults to 'en' — but a caller building an Exercise-shaped
// object by hand, like a preview before it's saved, might omit it).
export function getExerciseName(exercise: Pick<Exercise, "name_he" | "name_en" | "name_display_preference">, lang: Lang): string {
  const he = exercise.name_he?.trim() || "";
  const en = exercise.name_en?.trim() || "";

  if (exercise.name_display_preference === "both") {
    if (en && he) return `${en} | ${he}`;
    return en || he;
  }
  if (exercise.name_display_preference === "he") return he || en;
  if (exercise.name_display_preference === "en") return en || he;

  // No recognized preference — fall back to the lang toggle, Hebrew by
  // default if lang isn't wired through for this caller yet.
  if (lang === "en" && en) return en;
  return he || en;
}

// Same he/en-with-fallback resolution as getExerciseName, for the plainer
// free-text fields (description, patient_cues, common_mistake) that don't
// have their own per-exercise name_display_preference-style override — the
// viewer's `lang` alone decides, falling back to whichever language
// actually has content so an English-only viewer still sees a Hebrew-only
// field rather than nothing.
export function pickLangText(he: string | null | undefined, en: string | null | undefined, lang: Lang): string {
  const heText = he?.trim() || "";
  const enText = en?.trim() || "";
  if (lang === "en" && enText) return enText;
  return heText || enText;
}

export interface CueLine {
  emoji: "✅" | "❌";
  text: string;
}

// "Clinical Cues" (patient_cues) and "Common Mistakes" (common_mistake) are
// stored as plain text, one point per line — the ✅/❌ marker is attached
// here at render time (never persisted, so the DB stays plain and portable),
// kept separate from the line text rather than prepended into one string so
// a caller can lay the emoji out as its own fixed-width bullet instead of it
// running inline with wrapped text.
export function formatCueLines(text: string | null | undefined, emoji: "✅" | "❌"): CueLine[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ emoji, text: line }));
}

export interface WorkoutMuscleAggregation {
  primeMovers: string[];
  synergists: string[];
}

// Feeds AnatomyHeatmap for a whole workout (e.g. the dashboard's daily
// workout card) rather than a single exercise: walks every block and every
// exercise assignment in that block, collecting each exercise's
// prime_movers/synergists into one deduplicated pair of arrays representing
// the day's total muscle engagement. Accepts the same
// Record<blockId, assignment[]> shape useWorkoutSession's blocksMap already
// uses, so callers that have grouped-by-block data can pass it straight
// through, and callers with a flat list can group it into one block first.
export function getWorkoutMuscleAggregation(
  blocksMap: Record<string, { exercise: Pick<Exercise, "prime_movers" | "synergists"> }[]>
): WorkoutMuscleAggregation {
  const primeMovers = new Set<string>();
  const synergists = new Set<string>();

  Object.values(blocksMap).forEach((blockAssignments) => {
    blockAssignments.forEach(({ exercise }) => {
      (exercise.prime_movers ?? []).forEach((m) => primeMovers.add(m));
      (exercise.synergists ?? []).forEach((m) => synergists.add(m));
    });
  });

  return { primeMovers: Array.from(primeMovers), synergists: Array.from(synergists) };
}

export const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export const formatAdminDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
