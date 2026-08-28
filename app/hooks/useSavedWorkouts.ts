"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import type { SavedWorkout } from "@/app/types";

// DIY-builder "save workout" feature: fetches this patient's saved workouts
// (patient_saved_workouts) and exposes an upsert-by-editingId save, matching
// the fetch/refetch pattern used by usePatientData.
export function useSavedWorkouts() {
  const { loggedInPatient } = useAuth();
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);

  const fetchSavedWorkouts = useCallback(async () => {
    if (!loggedInPatient) return;
    const { data } = await supabase
      .from("patient_saved_workouts")
      .select("*")
      .eq("patient_id", loggedInPatient.id)
      .order("created_at", { ascending: false });
    if (data) setSavedWorkouts(data as SavedWorkout[]);
  }, [loggedInPatient]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount and whenever the logged-in patient changes
    fetchSavedWorkouts();
  }, [fetchSavedWorkouts]);

  const saveWorkout = useCallback(
    async (params: { editingId: string | null; name: string; scheduledDay: string; exerciseIds: string[] }) => {
      if (!loggedInPatient) return;
      const payload = {
        patient_id: loggedInPatient.id,
        name: params.name,
        scheduled_day: params.scheduledDay,
        exercise_ids: params.exerciseIds,
      };
      if (params.editingId) {
        await supabase.from("patient_saved_workouts").update(payload).eq("id", params.editingId);
      } else {
        await supabase.from("patient_saved_workouts").insert(payload);
      }
      await fetchSavedWorkouts();
    },
    [loggedInPatient, fetchSavedWorkouts]
  );

  return { savedWorkouts, saveWorkout, refetchSavedWorkouts: fetchSavedWorkouts };
}
