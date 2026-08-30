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
    // Survives across events on this same subscription (plain closure
    // variable, not React state — there's nothing here that needs a
    // re-render on its own). Guards against a real race: INITIAL_SESSION
    // fires first, doesn't recognize the session as recovery (yet), and
    // schedules the normal hydrate-and-route fetch below — a genuine
    // network request. PASSWORD_RECOVERY then fires moments later and sets
    // reset_password immediately (synchronous). But the earlier, slower
    // fetch is still in flight, and when *it* finally resolves, its .then()
    // used to unconditionally overwrite currentView right back to
    // patient/admin — the slow call winning just because it finished last.
    let isRecoveryFlow = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        isRecoveryFlow = false;
        setLoggedInPatient(null);
        setCurrentView("landing");
        return;
      }

      if (event === "USER_UPDATED") {
        // updateUser() on the reset_password screen succeeded — the
        // recovery flow is done. Clear the flag so the hydrate-and-route
        // path below (which this same event also carries a session for)
        // is allowed to run normally instead of being treated as stale.
        isRecoveryFlow = false;
      } else if (event === "PASSWORD_RECOVERY") {
        // A recovery-link click routes to the "set new password" screen
        // instead of a normal login.
        isRecoveryFlow = true;
        setCurrentView("reset_password");
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
        if (isRecoveryFlow) return; // superseded by a PASSWORD_RECOVERY/USER_UPDATED event since this was scheduled
        supabase
          .from("patients")
          .select("*")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data }) => {
            if (!data || isRecoveryFlow) return; // re-check: the race described above resolves here
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
