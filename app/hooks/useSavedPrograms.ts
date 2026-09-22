"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import type { SavedProgram, SavedProgramDay } from "@/app/types";

// DIY-builder "save program" feature: fetches this patient's saved weekly
// programs (patient_saved_programs) and exposes an upsert-by-editingId save,
// matching the fetch/refetch pattern used by usePatientData. A program is
// multiple ordinal days (Day 1, Day 2, ...) each with their own exercise
// list, stored together as one jsonb `days` column — replaces the earlier
// single-day patient_saved_workouts table (see the 20260922130000 migration).
export function useSavedPrograms() {
  const { loggedInPatient } = useAuth();
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>([]);

  const fetchSavedPrograms = useCallback(async () => {
    if (!loggedInPatient) return;
    const { data } = await supabase
      .from("patient_saved_programs")
      .select("*")
      .eq("patient_id", loggedInPatient.id)
      .order("created_at", { ascending: false });
    if (data) setSavedPrograms(data as SavedProgram[]);
  }, [loggedInPatient]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount and whenever the logged-in patient changes
    fetchSavedPrograms();
  }, [fetchSavedPrograms]);

  const saveProgram = useCallback(
    async (params: { editingId: string | null; name: string; days: SavedProgramDay[] }) => {
      if (!loggedInPatient) return;
      const payload = {
        patient_id: loggedInPatient.id,
        name: params.name,
        days: params.days,
      };
      if (params.editingId) {
        await supabase.from("patient_saved_programs").update(payload).eq("id", params.editingId);
      } else {
        await supabase.from("patient_saved_programs").insert(payload);
      }
      await fetchSavedPrograms();
    },
    [loggedInPatient, fetchSavedPrograms]
  );

  const deleteProgram = useCallback(
    async (id: string) => {
      await supabase.from("patient_saved_programs").delete().eq("id", id);
      await fetchSavedPrograms();
    },
    [fetchSavedPrograms]
  );

  return { savedPrograms, saveProgram, deleteProgram, refetchSavedPrograms: fetchSavedPrograms };
}
