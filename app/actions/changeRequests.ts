"use server";

import { after } from "next/server";
import { verifyCaller } from "@/app/lib/serverAuth";
import { pushToAdmins } from "@/app/lib/adminAlerts";

// A patient asks the therapist to change or upgrade their workout. The limits
// live in the database (submit_change_request, 20261017170000_change_requests.sql):
// fitness — one open request at a time, 2 a month; clinical — none. The
// admins get a push (after the patient has their answer).

const MAX_CHARS = 500;

export type ChangeRequestResult = { ok: true } | { ok: false; error: string };

export async function submitChangeRequest(accessToken: string, programId: string | null, message: string): Promise<ChangeRequestResult> {
  const text = message.trim();
  if (!text) return { ok: false, error: "צריך לכתוב מה לשנות" };
  if (text.length > MAX_CHARS) return { ok: false, error: "הבקשה ארוכה מדי" };
  const caller = await verifyCaller(accessToken);
  if (!caller) return { ok: false, error: "אין הרשאה" };

  const { error } = await caller.client.rpc("submit_change_request", { p_program_id: programId, p_message: text });
  // The function's own messages are written for the patient.
  if (error) return { ok: false, error: error.message || "השליחה נכשלה" };

  const { data: me } = await caller.client.from("patients").select("first_name, full_name").eq("user_id", caller.userId).maybeSingle();
  const name = (me?.first_name as string | null) || (me?.full_name as string | null) || "מתאמן";
  const excerpt = text.length > 90 ? `${text.slice(0, 90)}…` : text;
  after(() => pushToAdmins({ title: "📝 בקשה לשינוי באימון", body: `${name}: ${excerpt}`, tag: "change-request" }, 3 * 24 * 3600));
  return { ok: true };
}
