"use server";

import { cookies, headers } from "next/headers";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

// WebAuthn's rp.id must be the bare hostname (no port/scheme) and must
// exactly match the domain the credential is used from; origin is the full
// scheme+host+port the browser actually made the request on. Both are
// derived from the request's own Host header via next/headers rather than
// hardcoded, so this works unmodified in dev (localhost) and on whatever
// domain this ends up deployed to, without an env var to keep in sync.
async function getRpInfo() {
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const rpID = host.split(":")[0];
  const origin = `${proto}://${host}`;
  return { rpID, origin };
}

// The challenge each ceremony must sign is kept server-side, in a short-lived
// httpOnly cookie set when the options are generated and consumed (deleted)
// on verify. It used to come back from the client as a parameter, so a
// captured login response could be replayed with its own challenge — and
// platform passkeys (iCloud Keychain) keep their counter at 0, so the
// counter check didn't stop that either.
const CHALLENGE_COOKIE = { registration: "om_pk_reg", authentication: "om_pk_auth" } as const;
const CHALLENGE_TTL_SECONDS = 300;

async function rememberChallenge(kind: keyof typeof CHALLENGE_COOKIE, challenge: string) {
  (await cookies()).set(CHALLENGE_COOKIE[kind], challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

// Single use: read and delete in one step.
async function takeChallenge(kind: keyof typeof CHALLENGE_COOKIE) {
  const store = await cookies();
  const value = store.get(CHALLENGE_COOKIE[kind])?.value;
  store.delete(CHALLENGE_COOKIE[kind]);
  return value;
}

// Called right before navigator.credentials.create() — excludeCredentials
// (the patient's already-registered credential ids, fetched client-side
// under normal auth.uid()-scoped RLS) stops the same authenticator from
// being registered twice.
export async function generatePasskeyRegistrationOptions(
  patientId: number,
  patientName: string,
  existingCredentialIds: string[]
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { rpID } = await getRpInfo();
  const options = await generateRegistrationOptions({
    rpName: "Eccentric",
    rpID,
    userID: new TextEncoder().encode(String(patientId)),
    userName: patientName,
    attestationType: "none",
    excludeCredentials: existingCredentialIds.map((id) => ({ id })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });
  await rememberChallenge("registration", options.challenge);
  return options;
}

export type VerifyPasskeyRegistrationResult =
  | { verified: true; credentialId: string; publicKey: string; counter: number }
  | { verified: false; error: string };

// The actual cryptographic proof check — this is the one part of the whole
// flow that must run server-side (it needs the expected challenge — from the
// cookie, never the client — plus origin/rpID to reject a forged or replayed
// response). On success, the CALLER
// (an already-authenticated browser session) writes the verified credential
// into patient_passkeys itself via the normal RLS-protected client; this
// action never touches the database.
export async function verifyPasskeyRegistration(response: RegistrationResponseJSON): Promise<VerifyPasskeyRegistrationResult> {
  const { rpID, origin } = await getRpInfo();
  const expectedChallenge = await takeChallenge("registration");
  if (!expectedChallenge) return { verified: false, error: "פג תוקף הבקשה. נסו שוב." };
  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
    if (!verification.verified || !verification.registrationInfo) {
      return { verified: false, error: "אימות ה-Passkey נכשל" };
    }
    const { credential } = verification.registrationInfo;
    return {
      verified: true,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
    };
  } catch (err) {
    return { verified: false, error: err instanceof Error ? err.message : "שגיאה לא ידועה באימות" };
  }
}

// --- Login (passwordless, "sign in with Face ID/Touch ID") ---

// No allowCredentials passed: this is a usernameless/discoverable-credential
// request — the browser itself prompts "which saved passkey for this site?"
// rather than the app needing to know who's signing in before the ceremony
// starts, which is the whole point of skipping the password/email step.
export async function generatePasskeyAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { rpID } = await getRpInfo();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });
  await rememberChallenge("authentication", options.challenge);
  return options;
}

export type VerifyPasskeyAuthenticationResult =
  | { verified: true; tokenHash: string }
  | { verified: false; error: string };

// This is the one action in the whole passkey feature that has to run
// *before* any session exists, which is exactly why it's the one place that
// touches supabaseAdmin (service-role, bypasses RLS) — there is no auth.uid()
// yet to scope a normal RLS-protected lookup to. Flow: look up the stored
// credential by the id the browser returned, verify the signature against
// it, bump its replay-attack counter, then mint a real session for the
// credential's patient via the documented generateLink -> verifyOtp pattern
// (the only way to hand a browser a real Supabase Auth session from a custom
// auth method without the service-role key ever leaving the server) — the
// caller finishes it client-side with supabase.auth.verifyOtp({ token_hash,
// type: "magiclink" }), which is what actually establishes the session and
// fires the same onAuthStateChange event a password login would.
export async function verifyPasskeyAuthentication(response: AuthenticationResponseJSON): Promise<VerifyPasskeyAuthenticationResult> {
  const { rpID, origin } = await getRpInfo();
  const expectedChallenge = await takeChallenge("authentication");
  if (!expectedChallenge) return { verified: false, error: "פג תוקף הבקשה. נסו שוב." };

  const { data: credentialRow, error: lookupError } = await supabaseAdmin
    .from("patient_passkeys")
    .select("id, patient_id, credential_id, public_key, counter")
    .eq("credential_id", response.id)
    .maybeSingle();

  if (lookupError || !credentialRow) {
    return { verified: false, error: "לא נמצא Passkey רשום למכשיר זה. אפשר להתחבר עם סיסמה." };
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credentialRow.credential_id,
        publicKey: new Uint8Array(Buffer.from(credentialRow.public_key, "base64url")),
        counter: Number(credentialRow.counter),
      },
    });

    if (!verification.verified) {
      return { verified: false, error: "אימות ה-Passkey נכשל" };
    }

    // Best-effort — a failed counter update shouldn't block a login that
    // already cryptographically verified; it only weakens the replay guard
    // for this one credential going forward, not the login itself.
    await supabaseAdmin.from("patient_passkeys").update({ counter: verification.authenticationInfo.newCounter }).eq("id", credentialRow.id);

    const { data: patientRow, error: patientError } = await supabaseAdmin
      .from("patients")
      .select("user_id")
      .eq("id", credentialRow.patient_id)
      .maybeSingle();

    if (patientError || !patientRow?.user_id) {
      return { verified: false, error: "לא נמצא משתמש מקושר ל-Passkey זה" };
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(patientRow.user_id);
    if (userError || !userData.user?.email) {
      return { verified: false, error: "שגיאה באיתור פרטי המשתמש" };
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email,
    });
    if (linkError || !linkData.properties?.hashed_token) {
      return { verified: false, error: "שגיאה ביצירת החיבור" };
    }

    return { verified: true, tokenHash: linkData.properties.hashed_token };
  } catch (err) {
    return { verified: false, error: err instanceof Error ? err.message : "שגיאה לא ידועה באימות" };
  }
}
