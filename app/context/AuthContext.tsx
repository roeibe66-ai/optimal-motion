"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/app/lib/supabase";
import { TRANSLATIONS } from "@/app/constants/translations";
import type { Lang, Patient, ViewName } from "@/app/types";

interface AuthContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (typeof TRANSLATIONS)["he"];
  currentView: ViewName;
  setCurrentView: (view: ViewName) => void;
  loggedInPatient: Patient | null;
  setLoggedInPatient: (patient: Patient | null) => void;
  // One-shot signal set right after a successful sign-up. The (not yet built)
  // patient shell reads and clears it on mount to kick off the onboarding
  // wizard — kept here because it's part of the identity transition itself,
  // not general patient-tab UI state.
  justRegistered: boolean;
  setJustRegistered: (value: boolean) => void;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Global identity/session state — the pieces of state that would otherwise
// need prop-drilling into nearly every component (marketing, patient, admin).
// Everything else (admin data, patient data, workout session, builder state)
// lives in feature-scoped hooks instead.
//
// Session restore/live updates are driven entirely by Supabase Auth's own
// event stream now, not by manually reading a JSON-serialized patient row
// (password included!) out of localStorage/sessionStorage. onAuthStateChange
// fires once immediately with whatever session Supabase already resolved
// from its own storage (event "INITIAL_SESSION" — this is what covers
// page-reload restore) and again on every future sign-in/out, so one
// subscription covers both initial restore and live updates.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("he");
  const [currentView, setCurrentView] = useState<ViewName>("landing");
  const [loggedInPatient, setLoggedInPatient] = useState<Patient | null>(null);
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setLoggedInPatient(null);
        setCurrentView("landing");
        return;
      }
      // No session yet (e.g. initial load with nobody logged in) — leave
      // currentView alone rather than forcing "landing", since the user
      // could legitimately already be sitting on "login"/"register".
      if (!session) return;

      // Deferred via setTimeout: calling another Supabase API method
      // synchronously inside this callback is a documented supabase-js bug
      // that deadlocks every subsequent call on this client — see
      // "Why is my supabase API call not returning?" in Supabase's own
      // troubleshooting docs. The setTimeout escapes the callback's
      // synchronous execution context, which is the standard workaround.
      setTimeout(() => {
        supabase
          .from("patients")
          .select("*")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data }) => {
            if (!data) return;
            setLoggedInPatient(data);
            setCurrentView(data.role === "admin" ? "admin" : "patient");
          });
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = () => {
    supabase.auth.signOut();
    localStorage.removeItem("om_offline_plan");
  };

  const value: AuthContextValue = {
    lang,
    setLang,
    t: TRANSLATIONS[lang],
    currentView,
    setCurrentView,
    loggedInPatient,
    setLoggedInPatient,
    justRegistered,
    setJustRegistered,
    handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
