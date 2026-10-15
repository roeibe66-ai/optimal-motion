"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { notify } from "@/app/components/ui/feedback";
import type { OnboardingAnswers } from "@/app/components/patient/onboarding/OnboardingFlow";

// The fitness onboarding questionnaire (OnboardingFlow): opens by itself once
// for a fitness patient who hasn't finished or deferred it; after "אמלא אחר
// כך" a home card (`shouldOffer`) and the profile can open it again.
// Clinical patients never get it — Roei builds their program.
export function useOnboarding() {
  const { loggedInPatient, setLoggedInPatient } = useAuth();
  const [isOpenManually, setIsOpenManually] = useState(false);

  const eligible = !!loggedInPatient && loggedInPatient.patient_type === "fitness" && loggedInPatient.role !== "admin";
  const completed = !!loggedInPatient?.onboarding_completed_at;
  const deferred = !!loggedInPatient?.onboarding_skipped_at;
  const isOpen = eligible && (isOpenManually || (!completed && !deferred));

  const saveRow = async (patch: Record<string, unknown>) => {
    if (!loggedInPatient) return false;
    const { data, error } = await supabase.from("patients").update(patch).eq("id", loggedInPatient.id).select().single();
    if (error || !data) {
      notify("השמירה נכשלה: " + (error?.message ?? "נסו שוב"), "error");
      return false;
    }
    setLoggedInPatient(data);
    try {
      localStorage.setItem("optimalMotionUser", JSON.stringify(data));
    } catch {
      // The session cache is a convenience; the row is saved.
    }
    return true;
  };

  const finish = async (answers: OnboardingAnswers) => {
    const ok = await saveRow({ ...answers, onboarding_completed_at: new Date().toISOString() });
    if (ok) setIsOpenManually(false);
    return ok;
  };

  // "אמלא אחר כך" the first time; closing a re-opened questionnaire otherwise.
  const later = async () => {
    setIsOpenManually(false);
    if (!completed && !deferred) await saveRow({ onboarding_skipped_at: new Date().toISOString() });
  };

  return {
    isOpen,
    open: () => setIsOpenManually(true),
    finish,
    later,
    // A home-screen card offers it until it's done.
    shouldOffer: eligible && !completed && deferred,
    canEdit: eligible,
  };
}
