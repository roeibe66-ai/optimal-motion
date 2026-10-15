import type { SessionPerformanceEntry, WorkoutLog } from "@/app/types";
import { parsePerformance } from "@/app/utils/history";

// Automatic "ready to progress" suggestion, shown on the exercise screen
// (COACH-PRINCIPLES.md, section 4): when the last SESSIONS_NEEDED sessions of
// an exercise were too easy, offer more weight — or, with no weight to raise,
// more reps / a harder variation. Deterministic, no AI call; the patient
// accepts or dismisses it.
//
// "Too easy" (Roei, 2026-10-15) needs the patient's own RIR: every set of
// both sessions at RIR 3+ and the top of the rep range reached, and neither
// session rated the hardest RPE. Session RPE alone is never enough.

export type ProgressionSuggestion =
  | { kind: "weight"; fromKg: number; toKg: number; avgRir: number }
  // canAddReps: +2 reps stays within the rep ceiling; otherwise only a
  // harder variation is offered.
  | { kind: "challenge"; avgRir: number; canAddReps: boolean };

const SESSIONS_NEEDED = 2;
// After a longer break the principles say to come back lighter, not heavier.
const MAX_DAYS_SINCE_LAST = 14;
// Session RPE (1-10, stored from the Ecco scale: 2 קליל ... 10 גמרתי). A
// session rated the hardest level never counts as easy, whatever the RIR.
const MAX_SESSION_RPE = 10;
// Hypertrophy target is RIR 0-2 (RPE 7-10), so 3+ in reserve is "too easy".
const MIN_EASY_RIR = 3;
const DEFAULT_TARGET_RIR = 2;
// The rep range is 6-12: past 12 the answer is more load, not more reps.
const MAX_REPS = 12;
// Pain after the session at or above this blocks any progression.
const BLOCKING_PAIN_AFTER = 4;

// Common cast-iron sizes (2 kg steps up to 16, then 4 kg) — competition
// bells come in 2 kg steps throughout, but most home sets don't.
const KETTLEBELL_SIZES_KG = [4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48];

// The smallest realistic jump: the next kettlebell size, else +2 kg on light
// dumbbells, +2.5 kg up to 60, +5 kg beyond (heavy lower-body lifts).
export function nextWeightKg(currentKg: number, equipment: string[] | null | undefined): number {
  if (equipment?.includes("kettlebell")) {
    return KETTLEBELL_SIZES_KG.find((size) => size > currentKg) ?? currentKg + 4;
  }
  if (currentKg < 20) return currentKg + 2;
  if (currentKg < 60) return currentKg + 2.5;
  return currentKg + 5;
}

interface SuggestProgressionInput {
  exerciseId: string;
  equipment: string[] | null | undefined;
  isTime: boolean;
  // The top of the prescribed range (reps_max ?? reps); seconds for timed.
  targetTopReps: number;
  targetRir: number | null;
  logs: WorkoutLog[]; // past sessions only (not the one in progress)
  nowMs?: number; // defaults to the current time; call from an effect or handler, not during render
}

const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

export function suggestProgression({ exerciseId, equipment, isTime, targetTopReps, targetRir, logs, nowMs = Date.now() }: SuggestProgressionInput): ProgressionSuggestion | null {
  const sessions: { log: WorkoutLog; sets: SessionPerformanceEntry[] }[] = [];
  const newestFirst = [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const log of newestFirst) {
    const sets = parsePerformance(log).filter((s) => s.exercise_id === exerciseId);
    if (sets.length > 0) sessions.push({ log, sets });
    if (sessions.length === SESSIONS_NEEDED) break;
  }
  if (sessions.length < SESSIONS_NEEDED) return null;
  if (nowMs - new Date(sessions[0].log.created_at).getTime() > MAX_DAYS_SINCE_LAST * 86_400_000) return null;

  const easyRir = Math.max(MIN_EASY_RIR, (targetRir ?? DEFAULT_TARGET_RIR) + 1);
  const rirsSeen: number[] = [];
  for (const { log, sets } of sessions) {
    if (log.pain_after !== null && log.pain_after !== undefined && log.pain_after >= BLOCKING_PAIN_AFTER) return null;
    if (log.rpe != null && log.rpe >= MAX_SESSION_RPE) return null;
    if (targetTopReps > 0 && sets.some((s) => (Number(s.reps) || 0) < targetTopReps)) return null;
    // Every set needs a reported RIR, and every one of them 3+.
    if (sets.some((s) => typeof s.rir !== "number" || s.rir < easyRir)) return null;
    rirsSeen.push(...sets.map((s) => s.rir as number));
  }

  const avgRir = Math.round(average(rirsSeen) * 10) / 10;
  const lastKg = Math.max(0, ...sessions[0].sets.map((s) => Number(s.weight_kg) || 0));
  if (lastKg > 0) return { kind: "weight", fromKg: lastKg, toKg: nextWeightKg(lastKg, equipment), avgRir };
  // "+2 reps" means little on a timed hold; those only progress by weight.
  if (isTime) return null;
  return { kind: "challenge", avgRir, canAddReps: targetTopReps + 2 <= MAX_REPS };
}
