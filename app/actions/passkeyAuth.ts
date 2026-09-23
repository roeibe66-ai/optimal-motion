"use server";

import { headers } from "next/headers";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { PublicKeyCredentialCreationOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/server";

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
  return generateRegistrationOptions({
    rpName: "OptimalMotion",
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
}

export type VerifyPasskeyRegistrationResult =
  | { verified: true; credentialId: string; publicKey: string; counter: number }
  | { verified: false; error: string };

// The actual cryptographic proof check — this is the one part of the whole
// flow that must run server-side (it needs the expected challenge/origin/
// rpID to reject a forged or replayed response). On success, the CALLER
// (an already-authenticated browser session) writes the verified credential
// into patient_passkeys itself via the normal RLS-protected client; this
// action never touches the database.
export async function verifyPasskeyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<VerifyPasskeyRegistrationResult> {
  const { rpID, origin } = await getRpInfo();
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
