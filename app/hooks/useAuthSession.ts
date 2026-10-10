"use client";

import { useEffect, useState, type FormEvent } from "react";
import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startAuthentication, WebAuthnError } from "@simplewebauthn/browser";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { isPasswordConfirmed, isStrongPassword } from "@/app/utils/validation";
import { generatePasskeyAuthenticationOptions, verifyPasskeyAuthentication } from "@/app/actions/passkeyAuth";
import { confirmAction, notify } from "@/app/components/ui/feedback";

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
  const { setCurrentView } = useAuth();

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regConfirmPass, setRegConfirmPass] = useState("");
  const [regPatientType, setRegPatientType] = useState<"clinical" | "fitness">("fitness");

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const [isPasskeySupported, setIsPasskeySupported] = useState(false);
  const [isPasskeyLoggingIn, setIsPasskeyLoggingIn] = useState(false);
  const [passkeyLoginError, setPasskeyLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (!browserSupportsWebAuthn()) return;
    platformAuthenticatorIsAvailable().then(setIsPasskeySupported);
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({ email: loginIdentifier, password: loginPassword });

    if (error) {
      notify("פרטי התחברות שגויים, או שהחשבון עדיין לא אומת במייל.", "error");
      return;
    }

    setLoginIdentifier("");
    setLoginPassword("");
  };

  // redirectTo = the origin the user is on (prod, preview or localhost), so
  // the round trip lands back where it started instead of on the Supabase
  // project's Site URL. Each origin must be in the project's Auth "Redirect
  // URLs" allow-list, or Supabase silently falls back to the Site URL.
  // Same for signUp's emailRedirectTo and resetPasswordForEmail below.
  // AuthContext's existing
  // onAuthStateChange listener already hydrates loggedInPatient and routes
  // to patient/admin for any new session regardless of how it was
  // established, so the OAuth redirect back needs no special handling here.
  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) {
      notify("שגיאה בהתחברות עם Google: " + error.message, "error");
    }
  };

  // Passwordless login: a real WebAuthn assertion ceremony (no email/
  // password entered anywhere), verified server-side, resolved into a real
  // Supabase Auth session via verifyOtp — see app/actions/passkeyAuth.ts for
  // why that's the mechanism rather than a hand-rolled token. Same
  // no-manual-routing note as every other sign-in path here: a successful
  // verifyOtp fires the normal SIGNED_IN event, which AuthContext's
  // onAuthStateChange listener already routes on.
  const handlePasskeyLogin = async () => {
    setIsPasskeyLoggingIn(true);
    setPasskeyLoginError(null);
    try {
      const optionsJSON = await generatePasskeyAuthenticationOptions();
      const authResponse = await startAuthentication({ optionsJSON });
      const result = await verifyPasskeyAuthentication(authResponse, optionsJSON.challenge);

      if (!result.verified) {
        setPasskeyLoginError(result.error);
        return;
      }

      const { error } = await supabase.auth.verifyOtp({ token_hash: result.tokenHash, type: "magiclink" });
      if (error) {
        setPasskeyLoginError("שגיאה בהתחברות: " + error.message);
      }
    } catch (err) {
      // Backing out of the OS Face ID/Touch ID prompt is a completely normal
      // outcome, not an error worth surfacing — every other ceremony
      // failure still gets a message.
      if (err instanceof WebAuthnError) {
        if (err.name !== "NotAllowedError") setPasskeyLoginError(err.message);
      } else {
        setPasskeyLoginError(err instanceof Error ? err.message : "שגיאה לא ידועה");
      }
    } finally {
      setIsPasskeyLoggingIn(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    const fullName = `${regFirstName} ${regLastName}`.trim();

    // The form already shows live strength/match feedback and disables
    // submit until both are satisfied — this is a silent defense-in-depth
    // guard (e.g. against an Enter-key submit bypassing the disabled
    // button), not the primary way a user finds out their password is weak.
    if (!isStrongPassword(regPass) || !isPasswordConfirmed(regPass, regConfirmPass)) {
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPass,
      // first_name rides along so the signup trigger (handle_new_patient)
      // stores it as typed — full_name alone can't tell "בת שבע כהן"'s
      // first name from its first word.
      options: { data: { full_name: fullName, first_name: regFirstName.trim(), patient_type: regPatientType }, emailRedirectTo: window.location.origin },
    });

    if (error) {
      notify("שגיאה בהרשמה: " + error.message, "error");
      return;
    }
    if (!data.user) return;

    // Supabase doesn't error signUp() for an already-registered, confirmed
    // email (to avoid leaking which emails exist in the system) — an empty
    // identities array is the documented signal that this is a repeat
    // signup, not a genuinely new auth user.
    if (data.user.identities && data.user.identities.length === 0) {
      notify("כתובת האימייל הזו כבר רשומה במערכת. אנא התחבר לחשבונך.", "info");
      return;
    }

    // The patients row is created automatically by the on_auth_user_created
    // trigger (security definer — bypasses RLS, since there's no auth.uid()
    // yet at this point). No client-side insert needed, and none is possible
    // now that patients has RLS scoped to user_id = auth.uid().

    // No active session yet — email confirmation is required, so there's
    // nothing to route into until the patient confirms and logs in for real.
    // The one message here that must not be missed — a sheet the patient
    // acknowledges, not a toast that fades on its own.
    void confirmAction({
      title: "נרשמת בהצלחה!",
      message: "שלחנו לך מייל אימות — יש ללחוץ על הקישור במייל ואז להתחבר.",
      confirmLabel: "הבנתי",
      cancelLabel: null,
    });
    setCurrentView("login");
    setRegFirstName("");
    setRegLastName("");
    setRegEmail("");
    setRegPass("");
    setRegConfirmPass("");
    setRegPatientType("fitness");
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: window.location.origin });

    if (error) {
      notify("שגיאה בשליחת קישור לאיפוס: " + error.message, "error");
      return;
    }

    // Supabase doesn't error this call for an email that isn't registered
    // either (same anti-enumeration reasoning as signUp) — showing the
    // "check your email" state either way is the correct, honest UI: it's
    // true regardless of whether the address exists.
    setForgotSent(true);
  };

  // Called from the reset_password view, reached via the recovery link's
  // temporary session (AuthContext routes PASSWORD_RECOVERY here instead of
  // straight into patient/admin view).
  const handleSetNewPassword = async (e: FormEvent) => {
    e.preventDefault();

    if (!isStrongPassword(newPassword) || !isPasswordConfirmed(newPassword, newPasswordConfirm)) {
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      notify("שגיאה בעדכון הסיסמה: " + error.message, "error");
      return;
    }

    setNewPassword("");
    setNewPasswordConfirm("");
    // No manual routing here — updateUser() success fires a USER_UPDATED
    // event with a normal (non-recovery) session, which AuthContext's
    // onAuthStateChange listener already handles the same way as a fresh
    // login: hydrate loggedInPatient and route to patient/admin by role.
  };

  return {
    loginIdentifier,
    setLoginIdentifier,
    loginPassword,
    setLoginPassword,
    handleLogin,
    handleGoogleSignIn,
    isPasskeySupported,
    isPasskeyLoggingIn,
    passkeyLoginError,
    handlePasskeyLogin,
    regFirstName,
    setRegFirstName,
    regLastName,
    setRegLastName,
    regEmail,
    setRegEmail,
    regPass,
    setRegPass,
    regConfirmPass,
    setRegConfirmPass,
    regPatientType,
    setRegPatientType,
    handleRegister,
    forgotEmail,
    setForgotEmail,
    forgotSent,
    handleForgotPassword,
    newPassword,
    setNewPassword,
    newPasswordConfirm,
    setNewPasswordConfirm,
    handleSetNewPassword,
  };
}
