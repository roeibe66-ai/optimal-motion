"use client";

import { useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { addressed } from "@/app/utils/address";

// `t("בחר יום")` → "בחרי יום" for a patient who chose the feminine form of
// address in the onboarding questionnaire; unchanged otherwise. See
// app/utils/address.ts for which words it changes and when not to use it.
// Stable until the form changes, so it's safe in hook dependency lists.
export function useAddress() {
  const { loggedInPatient } = useAuth();
  const form = loggedInPatient?.address_form;
  return useCallback((text: string) => addressed(form, text), [form]);
}
