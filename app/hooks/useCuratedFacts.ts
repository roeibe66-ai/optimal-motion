"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import type { CuratedFact } from "@/app/types";

// Powers the patient home screen's "Did you know?" section: fetches every
// admin-published curated_facts row. Not per-patient — every patient sees
// the same set the admin research tab has published, so there's no
// patient_id filter, just a gate on being authenticated at all (same
// pattern as usePatientData/useSavedPrograms: wait for loggedInPatient
// before querying, since curated_facts' RLS policy requires an
// authenticated session).
export function useCuratedFacts() {
  const { loggedInPatient } = useAuth();
  const [curatedFacts, setCuratedFacts] = useState<CuratedFact[]>([]);

  const fetchCuratedFacts = useCallback(async () => {
    if (!loggedInPatient) return;
    const { data } = await supabase.from("curated_facts").select("*").order("created_at", { ascending: false });
    if (data) setCuratedFacts(data as CuratedFact[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInPatient?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount and whenever the logged-in patient changes
    fetchCuratedFacts();
  }, [fetchCuratedFacts]);

  return { curatedFacts, refetchCuratedFacts: fetchCuratedFacts };
}
