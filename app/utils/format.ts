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

// "Clinical Cues" (patient_cues) and "Common Mistakes" (common_mistake) are
// stored as plain text, one point per line — the ✅/❌ prefix is injected
// here at render time, never persisted, so the DB stays plain and portable.
export function formatCueLines(text: string | null | undefined, emoji: "✅" | "❌"): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `${emoji} ${line}`);
}

export const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export const formatAdminDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
