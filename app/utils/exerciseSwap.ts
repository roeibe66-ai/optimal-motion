import { GYM_ONLY_EQUIPMENT } from "@/app/constants/catalog";
import type { DifficultyLevel, Exercise } from "@/app/types";

// Mid-workout "swap this exercise" suggestions (SwapExerciseSheet). Pure
// ranking over the patient's exercise catalog — no DB writes; the swap only
// replaces the exercise for the current slot of the running session.

// Where the patient is training right now. "gym" = any equipment; "home" =
// bodyweight plus whatever accessories they ticked (kettlebell, band, ...).
export interface SwapSetting {
  mode: "gym" | "home";
  gear: string[]; // EQUIPMENT_LIST ids available at home ("bodyweight" is implied)
}

// Each refresh walks this cycle: same level → harder → easier → same (next
// batch) → ...
export type SwapTier = "same" | "harder" | "easier";
export const SWAP_TIER_CYCLE: SwapTier[] = ["same", "harder", "easier"];
export const SWAP_BATCH_SIZE = 5;

const LEVEL_RANK: Record<DifficultyLevel, number> = { clinical: 0, beginner: 1, intermediate: 2, advanced: 3 };
// An exercise with no difficulty set is treated as intermediate when deciding
// what's harder/easier than it (a newly added exercise may have none yet).
const UNKNOWN_RANK = LEVEL_RANK.intermediate;

const levelRank = (ex: Exercise): number | null => (ex.difficulty_level ? LEVEL_RANK[ex.difficulty_level] : null);

const splitIds = (csv: string | undefined) =>
  (csv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Every assisting muscle the catalog knows about for an exercise — the new
// array columns plus the legacy comma-separated one — minus its main muscle.
function assistingMuscles(ex: Exercise): Set<string> {
  const all = new Set([...(ex.synergists ?? []), ...(ex.prime_movers ?? []), ...splitIds(ex.secondary_muscles)]);
  if (ex.target_muscle) all.delete(ex.target_muscle);
  return all;
}

// Needs a gym: it uses a barbell, a machine or a cable (EQUIPMENT_LIST
// gymOnly). Until 2026-10-15 those were all tagged "dumbbells" and a name
// heuristic told them apart (MISTAKES.md); the catalog now says it directly.
const isGymOnly = (ex: Exercise) => (ex.equipment ?? []).some((id) => GYM_ONLY_EQUIPMENT.has(id));

export function fitsSetting(ex: Exercise, setting: SwapSetting): boolean {
  if (setting.mode === "gym") return true;
  if (isGymOnly(ex)) return false;
  const available = new Set(["bodyweight", ...setting.gear]);
  return (ex.equipment ?? []).every((id) => available.has(id));
}

// Where the patient is training, read off the workout itself: one gym-only
// exercise means they're at the gym; otherwise they're at home with exactly
// the accessories this workout already uses (a kettlebell exercise → they
// have a kettlebell, rings → rings, ...). Bodyweight is always assumed.
//
// The onboarding answers (patients.training_location / home_equipment) fill
// in what the workout can't show: someone who trains at the gym is at the
// gym even on a bodyweight day, and their home gear counts even when this
// workout doesn't use it.
export interface SwapProfile {
  location?: "gym" | "home" | "both" | null;
  homeEquipment?: string[] | null;
}

export function inferSwapSetting(workoutExercises: Exercise[], profile?: SwapProfile | null): SwapSetting {
  const workoutGear = workoutExercises.flatMap((ex) => ex.equipment ?? []);
  const gear = Array.from(new Set([...workoutGear, ...(profile?.location !== "gym" ? (profile?.homeEquipment ?? []) : [])])).filter((id) => id !== "bodyweight");
  const atGym = workoutExercises.some(isGymOnly) || profile?.location === "gym";
  return { mode: atGym ? "gym" : "home", gear };
}

export interface SwapCandidate {
  exercise: Exercise;
  sharedMuscles: number; // assisting muscles in common with the original
  score: number;
}

// Similarity to the original: mostly the overlap of assisting muscles
// (Jaccard, so a candidate that drags in lots of unrelated muscles ranks
// lower), a bit for sharing a prime mover / category, and a bonus for the
// admin's own explicit progression/regression link.
function scoreCandidate(original: Exercise, origMuscles: Set<string>, ex: Exercise): SwapCandidate {
  const muscles = assistingMuscles(ex);
  let shared = 0;
  muscles.forEach((m) => {
    if (origMuscles.has(m)) shared++;
  });
  const union = origMuscles.size + muscles.size - shared;
  const jaccard = union > 0 ? shared / union : 0;
  const sharedPrime = (ex.prime_movers ?? []).filter((m) => (original.prime_movers ?? []).includes(m)).length;
  const sharedCategory = ex.categories?.some((c) => original.categories?.includes(c)) ? 1 : 0;
  const linked = ex.id === original.harder_version_id || ex.id === original.easier_version_id ? 1 : 0;
  return { exercise: ex, sharedMuscles: shared, score: jaccard * 10 + shared + sharedPrime * 0.5 + sharedCategory * 0.5 + linked * 3 };
}

// All ranked candidates for one tier (the caller pages through them 5 at a
// time). `original` is the exercise the program prescribed — harder/easier
// are relative to it, not to whatever the patient already swapped to.
export function rankSwapCandidates(
  original: Exercise,
  catalog: Exercise[],
  setting: SwapSetting,
  tier: SwapTier,
  excludeIds: Set<string>
): SwapCandidate[] {
  if (!original.target_muscle) return [];
  const origMuscles = assistingMuscles(original);
  const origRank = levelRank(original);
  const origRankForCompare = origRank ?? UNKNOWN_RANK;

  const pool = catalog
    .filter((ex) => ex.id !== original.id && !excludeIds.has(ex.id))
    .filter((ex) => fitsSetting(ex, setting))
    // Same main muscle — or the admin's explicit easier/harder version of
    // this exercise, which is a valid swap even if tagged slightly differently.
    .filter((ex) => ex.target_muscle === original.target_muscle || ex.id === original.harder_version_id || ex.id === original.easier_version_id)
    .map((ex) => scoreCandidate(original, origMuscles, ex));

  const bySimilarity = (a: SwapCandidate, b: SwapCandidate) => b.score - a.score;

  if (tier === "same") {
    const exact = pool.filter((c) => (origRank === null ? levelRank(c.exercise) === null : levelRank(c.exercise) === origRank));
    // Not enough at exactly this level: fill with exercises whose level
    // isn't set (plausibly the same) before showing nothing.
    const unknown = origRank === null ? [] : pool.filter((c) => levelRank(c.exercise) === null);
    // Original has no level: its "level" is anything intermediate-ish.
    const near = origRank === null ? pool.filter((c) => levelRank(c.exercise) === UNKNOWN_RANK) : [];
    return [...exact.sort(bySimilarity), ...unknown.sort(bySimilarity), ...near.sort(bySimilarity)];
  }

  // Harder/easier: only exercises with a known level on the right side of the
  // original's, closest level first, then most similar.
  const direction = tier === "harder" ? 1 : -1;
  const linkedId = tier === "harder" ? original.harder_version_id : original.easier_version_id;
  return pool
    .filter((c) => {
      if (c.exercise.id === linkedId) return true;
      const r = levelRank(c.exercise);
      return r !== null && (r - origRankForCompare) * direction > 0;
    })
    .sort((a, b) => {
      if (a.exercise.id === linkedId) return -1;
      if (b.exercise.id === linkedId) return 1;
      const da = Math.abs((levelRank(a.exercise) ?? origRankForCompare) - origRankForCompare);
      const db = Math.abs((levelRank(b.exercise) ?? origRankForCompare) - origRankForCompare);
      return da - db || bySimilarity(a, b);
    });
}

// Batch N of a tier's list, wrapping around once it runs out — a short last
// batch is topped up from the start, so a refresh always shows a full 5
// whenever the tier has that many at all.
export function pageOf<T>(list: T[], batch: number): T[] {
  if (list.length <= SWAP_BATCH_SIZE) return list;
  const pages = Math.ceil(list.length / SWAP_BATCH_SIZE);
  const start = (batch % pages) * SWAP_BATCH_SIZE;
  return Array.from({ length: SWAP_BATCH_SIZE }, (_, i) => list[(start + i) % list.length]);
}
