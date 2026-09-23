"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import type { SessionPerformanceEntry } from "@/app/types";

export interface ExerciseHistorySession {
  logId: string;
  date: string; // ISO — caller formats for display
  sets: SessionPerformanceEntry[]; // every set logged for this exercise in that session, ordered by set_number
}

const SESSIONS_LIMIT = 20;
const LOGS_FETCH_WINDOW = 200; // generous — most of these logs won't mention this specific exercise at all

// The Exercise Info bottom sheet's "History" tab: every real set the patient
// has actually logged for this one exercise, across past sessions — not the
// best-set-per-session aggregate useWorkoutSession's own exHistoryData keeps
// for the Charts tab's line graph. Self-contained (fetches straight from
// Supabase, keyed on exerciseId + the logged-in patient) rather than
// threading yet another prop down from PatientShell, since the modal already
// has everything it needs to fetch this itself.
export function useExerciseHistory(exerciseId: string) {
  const { loggedInPatient } = useAuth();
  const [sessions, setSessions] = useState<ExerciseHistorySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!loggedInPatient) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting to the empty state when there's no patient to fetch for (e.g. logged out), not deriving external state
      setSessions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    supabase
      .from("workout_logs")
      .select("id, created_at, performance_data")
      .eq("patient_id", loggedInPatient.id)
      .order("created_at", { ascending: false })
      .limit(LOGS_FETCH_WINDOW)
      .then(({ data }) => {
        if (cancelled) return;
        const matched: ExerciseHistorySession[] = [];
        for (const log of data ?? []) {
          if (matched.length >= SESSIONS_LIMIT) break;
          if (!log.performance_data) continue;
          let entries: SessionPerformanceEntry[];
          try {
            entries = JSON.parse(log.performance_data as string);
          } catch {
            continue; // malformed performance_data on this one log — skip it, not the whole list
          }
          const setsForExercise = entries.filter((e) => e.exercise_id === exerciseId).sort((a, b) => a.set_number - b.set_number);
          if (setsForExercise.length > 0) {
            matched.push({ logId: String(log.id), date: log.created_at as string, sets: setsForExercise });
          }
        }
        setSessions(matched);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loggedInPatient, exerciseId]);

  return { sessions, isLoading };
}
