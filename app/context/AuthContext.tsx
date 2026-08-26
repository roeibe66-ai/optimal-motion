"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
export function AuthProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("he");
  const [currentView, setCurrentView] = useState<ViewName>("landing");
  const [loggedInPatient, setLoggedInPatient] = useState<Patient | null>(null);
  const [justRegistered, setJustRegistered] = useState(false);

  // Restore session on first load. Only identity is restored here — patient
  // data (offline plan cache) and reminder/haptics prefs are re-derived by
  // their own hooks once `loggedInPatient` is set.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedUserLocal = localStorage.getItem("optimalMotionUser");
    const savedUserSession = sessionStorage.getItem("optimalMotionUser");
    const savedUser = savedUserLocal || savedUserSession;
    if (!savedUser) return;

    if (savedUser === "admin") {
      // Deliberately deferred to the client: reading storage during render
      // would mismatch the server-rendered "landing" view.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentView("admin");
    } else {
      const parsed = JSON.parse(savedUser);
      setLoggedInPatient(parsed);
      setCurrentView("patient");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("optimalMotionUser");
    sessionStorage.removeItem("optimalMotionUser");
    localStorage.removeItem("om_offline_plan");
    setLoggedInPatient(null);
    setCurrentView("landing");
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
