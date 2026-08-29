"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { isStrongPassword } from "@/app/utils/validation";

// Login + registration business logic, now backed by real Supabase Auth
// instead of a plaintext password column. This hook only triggers the auth
// call and reports errors — AuthContext's onAuthStateChange listener is what
// actually hydrates `loggedInPatient` and routes to the right view once a
// session exists, for both login and (after email confirmation) register.
//
// Everyone — clinical and fitness patients alike — now self-registers
// through this same form (Option A from the auth migration decision): the
// admin CRM no longer creates accounts, so there's no separate "admin
// pre-provisions, patient claims later" path to handle here.
export function useAuthSession() {
  const { setCurrentView, setJustRegistered } = useAuth();

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPatientType, setRegPatientType] = useState<"clinical" | "fitness">("fitness");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({ email: loginIdentifier, password: loginPassword });

    if (error) {
      alert("פרטי התחברות שגויים, או שהחשבון עדיין לא אומת במייל.");
      return;
    }

    setLoginIdentifier("");
    setLoginPassword("");
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    const fullName = `${regFirstName} ${regLastName}`.trim();

    if (!isStrongPassword(regPass)) {
      alert("הסיסמה חלשה מדי. אנא בחר סיסמה באורך 8 תווים לפחות, הכוללת גם אותיות וגם מספרים.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email: regEmail, password: regPass });

    if (error) {
      alert("שגיאה בהרשמה: " + error.message);
      return;
    }
    if (!data.user) return;

    // Supabase doesn't error signUp() for an already-registered, confirmed
    // email (to avoid leaking which emails exist in the system) — an empty
    // identities array is the documented signal that this is a repeat
    // signup, not a genuinely new auth user.
    if (data.user.identities && data.user.identities.length === 0) {
      alert("כתובת האימייל הזו כבר רשומה במערכת. אנא התחבר לחשבונך.");
      return;
    }

    const { error: insertError } = await supabase
      .from("patients")
      .insert([{ user_id: data.user.id, full_name: fullName, email: regEmail, patient_type: regPatientType, premium_tracks: "" }]);

    if (insertError) {
      alert("שגיאה ביצירת הפרופיל: " + insertError.message);
      return;
    }

    // No active session yet — email confirmation is required, so there's
    // nothing to route into until the patient confirms and logs in for
    // real. justRegistered is set anyway as a best-effort signal for the
    // same-tab case where they confirm and log back in within this same
    // browser session (in-memory state, so it's a no-op if the tab reloads
    // in between — not reliable across devices/tabs, just harmless either way).
    setJustRegistered(true);
    alert("נרשמת בהצלחה! שלחנו לך מייל אימות — יש ללחוץ על הקישור במייל ואז להתחבר.");
    setCurrentView("login");
    setRegFirstName("");
    setRegLastName("");
    setRegEmail("");
    setRegPass("");
    setRegPatientType("fitness");
  };

  return {
    loginIdentifier,
    setLoginIdentifier,
    loginPassword,
    setLoginPassword,
    handleLogin,
    regFirstName,
    setRegFirstName,
    regLastName,
    setRegLastName,
    regEmail,
    setRegEmail,
    regPass,
    setRegPass,
    regPatientType,
    setRegPatientType,
    handleRegister,
  };
}
