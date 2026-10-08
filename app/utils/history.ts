import type { SessionPerformanceEntry, WorkoutLog } from "@/app/types";

// workout_logs.performance_data is JSON text — malformed rows yield [] rather
// than throwing, so one bad log never hides the rest of the history.
export function parsePerformance(log: Pick<WorkoutLog, "performance_data">): SessionPerformanceEntry[] {
  if (!log.performance_data) return [];
  try {
    const parsed = JSON.parse(log.performance_data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// The heaviest weight the patient reported for each exercise in the most
// recent session that has a weight for it — "what you lifted last time".
// Exercises never logged with a weight are simply absent.
export function getLastUsedWeights(logs: WorkoutLog[]): Record<string, number> {
  const result: Record<string, number> = {};
  const newestFirst = [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const log of newestFirst) {
    const maxInLog: Record<string, number> = {};
    for (const entry of parsePerformance(log)) {
      const w = Number(entry.weight_kg);
      if (!entry.exercise_id || !(w > 0) || entry.exercise_id in result) continue;
      maxInLog[entry.exercise_id] = Math.max(maxInLog[entry.exercise_id] ?? 0, w);
    }
    Object.assign(result, maxInLog);
  }
  return result;
}
