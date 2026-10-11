"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import type { HydratedPatientExercise } from "@/app/hooks/useWorkoutSession";
import type { Exercise, PatientExercise, PatientProgram, WorkoutFormat, WorkoutLog } from "@/app/types";

// Fetches everything the patient side needs: this patient's assigned
// exercises (joined with the exercise catalog client-side, matching the
// original), the full exercise catalog (used for swap-alternatives and the
// DIY builder), and this patient's workout logs.
export function usePatientData() {
  const { loggedInPatient } = useAuth();

  const [patientExercises, setPatientExercises] = useState<HydratedPatientExercise[]>([]);
  const [exerciseCatalog, setExerciseCatalog] = useState<Exercise[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [programs, setPrograms] = useState<PatientProgram[]>([]);
  // False until the first fetch settles — lets screens show a skeleton
  // instead of their empty state ("no plan", "no data yet") for the second
  // before the real data lands.
  const [hasLoaded, setHasLoaded] = useState(false);

  // Offline-first: paint the last-known plan immediately, before the network
  // fetch below resolves.
  useEffect(() => {
    const cachedPlan = localStorage.getItem("om_offline_plan");
    if (!cachedPlan) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser-only cache, unavailable during the server render
      setPatientExercises(JSON.parse(cachedPlan));
    } catch {
      // corrupted cache — ignore, the fetch below replaces it
    }
  }, []);

  const fetchPatientData = useCallback(async () => {
    if (!loggedInPatient) return;

    const [assigns, exs, logs, programs] = await Promise.all([
      supabase.from("patient_exercises").select("*").eq("patient_id", loggedInPatient.id),
      // Approved demo media rides along (RLS hides unapproved rows), so every
      // exercise in the plan/catalog carries it — see getExerciseMediaItems.
      supabase.from("exercises").select("*, media:exercise_media(*)"),
      supabase.from("workout_logs").select("*").eq("patient_id", loggedInPatient.id).order("created_at", { ascending: false }),
      supabase
        .from("patient_programs")
        .select("id, patient_id, name, format, time_cap_seconds, weekly_target, patient_edited_at, is_self_added, created_at")
        .eq("patient_id", loggedInPatient.id)
        .order("created_at", { ascending: true }),
    ]);
    const programById = new Map((programs.data ?? []).map((p) => [p.id as string, p as { name: string; format: WorkoutFormat; time_cap_seconds: number | null }]));

    const exerciseRows = (exs.data ?? []) as Exercise[];
    const assignmentRows = (assigns.data ?? []) as PatientExercise[];

    if (assigns.data && exs.data) {
      const combined = assignmentRows
        .map((assignment) => ({
          ...assignment,
          exercise: exerciseRows.find((e) => e.id === assignment.exercise_id),
        }))
        .map((a) => {
          const program = a.program_id ? programById.get(a.program_id) : undefined;
          return program
            ? { ...a, program_name: program.name, program_format: program.format, program_time_cap_seconds: program.time_cap_seconds }
            : a;
        })
        .filter((a): a is HydratedPatientExercise => !!a.exercise);

      setPatientExercises(combined);
      localStorage.setItem("om_offline_plan", JSON.stringify(combined));
    }
    if (exs.data) setExerciseCatalog(exerciseRows);
    if (logs.data) setWorkoutLogs(logs.data as WorkoutLog[]);
    if (programs.data) setPrograms(programs.data as PatientProgram[]);
    setHasLoaded(true);
    // Depend on the id, not the whole object: AuthContext calls
    // setLoggedInPatient() with a brand-new object on every auth event that
    // carries a session — including TOKEN_REFRESHED, which supabase-js fires
    // automatically when a background tab regains focus, even though
    // nothing about the patient actually changed. Depending on the object
    // itself refetched everything (exercises/logs) on every tab switch,
    // which fed new object references into useWorkoutSession's activeAssign
    // and spuriously reset the in-progress exercise timer mid-set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInPatient?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount and whenever the logged-in patient changes
    fetchPatientData();
  }, [fetchPatientData]);

  return { patientExercises, exerciseCatalog, workoutLogs, programs, hasLoaded, refetch: fetchPatientData };
}
