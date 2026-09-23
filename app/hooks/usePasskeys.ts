"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startRegistration } from "@simplewebauthn/browser";
import { WebAuthnError } from "@simplewebauthn/browser";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { generatePasskeyRegistrationOptions, verifyPasskeyRegistration } from "@/app/actions/passkeyAuth";

const dismissKey = (patientId: string) => `om_passkey_prompt_dismissed_${patientId}`;

// Best-effort device label from the UA string — cosmetic only (shown next to
// the credential in account settings later), never used for anything
// security-relevant.
function guessDeviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/macintosh/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows";
  return "מכשיר זה";
}

// Drives the "enable Face ID / Touch ID" prompt: whether this device/browser
// can do it at all, whether this patient already has a credential (so the
// prompt never nags a returning passkey user), and the actual registration
// ceremony — generate options server-side, run navigator.credentials.create()
// via @simplewebauthn/browser, verify the signature server-side, then store
// the verified credential under this patient's own RLS-scoped session.
export function usePasskeys() {
  const { loggedInPatient } = useAuth();
  const [isPlatformAuthAvailable, setIsPlatformAuthAvailable] = useState(false);
  const [hasRegisteredPasskey, setHasRegisteredPasskey] = useState<boolean | null>(null); // null = not checked yet
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(true); // conservative default until the mount effect below runs

  useEffect(() => {
    if (!browserSupportsWebAuthn()) return;
    platformAuthenticatorIsAvailable().then(setIsPlatformAuthAvailable);
  }, []);

  const existingCredentialIdsRef = useRef<string[]>([]);

  const checkRegistered = useCallback(async () => {
    if (!loggedInPatient) return;
    const { data } = await supabase.from("patient_passkeys").select("credential_id").eq("patient_id", loggedInPatient.id);
    const ids = (data ?? []).map((r) => r.credential_id as string);
    existingCredentialIdsRef.current = ids;
    setHasRegisteredPasskey(ids.length > 0);
  }, [loggedInPatient]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount and whenever the logged-in patient changes
    checkRegistered();
  }, [checkRegistered]);

  useEffect(() => {
    if (!loggedInPatient) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser-only preference the server render can't see
      setIsDismissed(localStorage.getItem(dismissKey(String(loggedInPatient.id))) === "1");
    } catch {
      setIsDismissed(false); // storage unavailable (private mode etc.) — fail open, just re-prompt next time too
    }
  }, [loggedInPatient]);

  const dismissPrompt = useCallback(() => {
    setIsDismissed(true);
    if (!loggedInPatient) return;
    try {
      localStorage.setItem(dismissKey(String(loggedInPatient.id)), "1");
    } catch {
      // best-effort only — worst case the prompt reappears next login
    }
  }, [loggedInPatient]);

  const shouldShowPrompt = isPlatformAuthAvailable && hasRegisteredPasskey === false && !isDismissed;

  const registerPasskey = useCallback(async (): Promise<boolean> => {
    if (!loggedInPatient) return false;
    setIsRegistering(true);
    setError(null);
    try {
      const optionsJSON = await generatePasskeyRegistrationOptions(
        Number(loggedInPatient.id),
        loggedInPatient.full_name,
        existingCredentialIdsRef.current
      );
      const registrationResponse = await startRegistration({ optionsJSON });
      const result = await verifyPasskeyRegistration(registrationResponse, optionsJSON.challenge);
      if (!result.verified) {
        setError(result.error);
        return false;
      }
      const { error: insertError } = await supabase.from("patient_passkeys").insert({
        patient_id: loggedInPatient.id,
        credential_id: result.credentialId,
        public_key: result.publicKey,
        counter: result.counter,
        device_label: guessDeviceLabel(),
      });
      if (insertError) {
        setError(insertError.message);
        return false;
      }
      setHasRegisteredPasskey(true);
      dismissPrompt();
      return true;
    } catch (err) {
      // WebAuthnError covers user cancellation ("NotAllowedError") and other
      // ceremony failures — surfaced as a quiet message, not a hard alert,
      // since backing out of the OS prompt is a completely normal outcome.
      if (err instanceof WebAuthnError) {
        setError(err.name === "NotAllowedError" ? "הביטול בוצע — ניתן לנסות שוב בכל עת." : err.message);
      } else {
        setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
      }
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, [loggedInPatient, dismissPrompt]);

  return {
    isPlatformAuthAvailable,
    hasRegisteredPasskey,
    shouldShowPrompt,
    isRegistering,
    error,
    registerPasskey,
    dismissPrompt,
  };
}
