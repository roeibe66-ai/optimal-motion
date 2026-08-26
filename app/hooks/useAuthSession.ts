"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { isStrongPassword } from "@/app/utils/validation";

// Login + registration business logic. Kept separate from AuthContext so the
// context stays pure identity state — this hook is what actually talks to
// Supabase and localStorage/sessionStorage to produce that state.
//
// Note: the original also seeded `reminder_time`/`reminder_days` into local
// component state on login. That's dropped here — the future `useReminders`
// hook will derive those directly from `loggedInPatient` whenever it changes,
// so nothing is lost, just relocated to where it's actually used.
export function useAuthSession() {
  const { setLoggedInPatient, setCurrentView, setJustRegistered } = useAuth();

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (loginIdentifier === "admin" && loginPassword === "admin") {
      if (rememberMe) localStorage.setItem("optimalMotionUser", "admin");
      else sessionStorage.setItem("optimalMotionUser", "admin");
      setCurrentView("admin");
      setLoginIdentifier("");
      setLoginPassword("");
      return;
    }

    const loginField = loginIdentifier.includes("@") ? "email" : "phone";

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq(loginField, loginIdentifier)
      .eq("password", loginPassword)
      .single();

    if (error || !data) {
      alert("פרטי התחברות שגויים. ודא שהזנת אימייל או טלפון נכונים.");
      return;
    }

    if (rememberMe) localStorage.setItem("optimalMotionUser", JSON.stringify(data));
    else sessionStorage.setItem("optimalMotionUser", JSON.stringify(data));

    setLoggedInPatient(data);
    setCurrentView("patient");
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

    const { data: existingUser } = await supabase.from("patients").select("id").eq("email", regEmail).single();
    if (existingUser) {
      alert("כתובת האימייל הזו כבר רשומה במערכת. אנא התחבר לחשבונך.");
      return;
    }

    const { data, error } = await supabase
      .from("patients")
      .insert([{ full_name: fullName, email: regEmail, password: regPass, patient_type: "fitness", premium_tracks: "", email_verified: false }])
      .select()
      .single();

    if (error) {
      alert("שגיאה בהרשמה: " + error.message);
      return;
    }
    if (!data) return;

    localStorage.setItem("optimalMotionUser", JSON.stringify(data));
    setLoggedInPatient(data);
    setJustRegistered(true);
    setCurrentView("patient");
  };

  return {
    loginIdentifier,
    setLoginIdentifier,
    loginPassword,
    setLoginPassword,
    rememberMe,
    setRememberMe,
    handleLogin,
    regFirstName,
    setRegFirstName,
    regLastName,
    setRegLastName,
    regEmail,
    setRegEmail,
    regPass,
    setRegPass,
    handleRegister,
  };
}
