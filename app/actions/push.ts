"use server";

import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyCaller } from "@/app/lib/serverAuth";
import { ensureVapid, sendPush, type PushTarget } from "@/app/lib/webPush";

// Web Push for the workout player's rest timer (iPhone home-screen PWA, iOS
// 16.4+): when a rest starts, the app schedules a rest_alarms row; this
// server waits until ends_at (inside `after`, so the client gets its answer
// at once) and sends the notification unless the app cancelled it — the
// rest ended with the app open, was skipped, or the workout closed.
// Extending the rest moves ends_at, which the waiting sender re-reads.
//
// The wait runs inside this request's function, so it's bounded by
// maxDuration (300 s, app/layout.tsx): longer rests get no alert.

const MAX_WAIT_MS = 280_000;
const MIN_WAIT_MS = 5_000; // nothing to alert about for a rest that's already over

export type PushResult = { ok: true } | { ok: false; error: string };
export type ScheduleResult = { ok: true; alarmId: string } | { ok: false; error: string };

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

async function ownPatientId(client: SupabaseClient, userId: string): Promise<number | null> {
  const { data } = await client.from("patients").select("id").eq("user_id", userId).maybeSingle();
  return data ? Number(data.id) : null;
}

export async function savePushSubscription(accessToken: string, subscription: PushSubscriptionInput, userAgent: string): Promise<PushResult> {
  const caller = await verifyCaller(accessToken);
  if (!caller) return { ok: false, error: "אין הרשאה" };
  const patientId = await ownPatientId(caller.client, caller.userId);
  if (!patientId) return { ok: false, error: "אין הרשאה" };
  if (!subscription?.endpoint?.startsWith("https://") || !subscription.keys?.p256dh || !subscription.keys?.auth) return { ok: false, error: "מנוי לא תקין" };

  const { error } = await caller.client.from("push_subscriptions").upsert(
    {
      patient_id: patientId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" }
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removePushSubscription(accessToken: string, endpoint: string): Promise<PushResult> {
  const caller = await verifyCaller(accessToken);
  if (!caller) return { ok: false, error: "אין הרשאה" };
  const { error } = await caller.client.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return error ? { ok: false, error: error.message } : { ok: true };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Waits until the alarm is due (re-reading ends_at, which an extended rest
// moves), then claims it (pending -> sent, so it can't go out twice) and
// sends it to every device of the patient.
async function runAlarm(client: SupabaseClient, alarmId: string, deadline: number) {
  for (;;) {
    const { data: alarm } = await client.from("rest_alarms").select("ends_at, status").eq("id", alarmId).maybeSingle();
    if (!alarm || alarm.status !== "pending") return;
    const wait = new Date(alarm.ends_at as string).getTime() - Date.now();
    if (wait <= 0) break;
    if (Date.now() + wait > deadline) return; // extended past what this function can wait for
    await sleep(wait);
  }

  const { data: claimed } = await client
    .from("rest_alarms")
    .update({ status: "sent" })
    .eq("id", alarmId)
    .eq("status", "pending")
    .select("patient_id, title, body")
    .maybeSingle();
  if (!claimed) return; // cancelled in the meantime

  const { data: subs } = await client.from("push_subscriptions").select("endpoint, p256dh, auth").eq("patient_id", claimed.patient_id);
  // A rest alert that arrives a minute late is useless.
  const { delivered, gone } = await sendPush((subs ?? []) as PushTarget[], { title: claimed.title as string, body: claimed.body as string, tag: "rest-timer" }, 60);
  if (gone.length) await client.from("push_subscriptions").delete().in("endpoint", gone);
  if (delivered === 0) await client.from("rest_alarms").update({ status: "failed" }).eq("id", alarmId);
}

export async function scheduleRestAlarm(accessToken: string, endsAtMs: number, title: string, body: string): Promise<ScheduleResult> {
  if (!ensureVapid()) return { ok: false, error: "התראות לא מוגדרות בשרת" };
  const now = Date.now();
  if (!Number.isFinite(endsAtMs) || endsAtMs - now < MIN_WAIT_MS || endsAtMs - now > MAX_WAIT_MS) return { ok: false, error: "זמן מנוחה מחוץ לטווח" };
  const caller = await verifyCaller(accessToken);
  if (!caller) return { ok: false, error: "אין הרשאה" };
  const patientId = await ownPatientId(caller.client, caller.userId);
  if (!patientId) return { ok: false, error: "אין הרשאה" };

  const { data, error } = await caller.client
    .from("rest_alarms")
    .insert({ patient_id: patientId, ends_at: new Date(endsAtMs).toISOString(), title: title.slice(0, 120), body: body.slice(0, 240) })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "שגיאה" };

  const alarmId = data.id as string;
  after(() => runAlarm(caller.client, alarmId, now + MAX_WAIT_MS + 10_000));
  return { ok: true, alarmId };
}

export async function updateRestAlarm(accessToken: string, alarmId: string, endsAtMs: number): Promise<PushResult> {
  const caller = await verifyCaller(accessToken);
  if (!caller) return { ok: false, error: "אין הרשאה" };
  const { error } = await caller.client.from("rest_alarms").update({ ends_at: new Date(endsAtMs).toISOString() }).eq("id", alarmId).eq("status", "pending");
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function cancelRestAlarm(accessToken: string, alarmId: string): Promise<PushResult> {
  const caller = await verifyCaller(accessToken);
  if (!caller) return { ok: false, error: "אין הרשאה" };
  const { error } = await caller.client.from("rest_alarms").update({ status: "cancelled" }).eq("id", alarmId).eq("status", "pending");
  return error ? { ok: false, error: error.message } : { ok: true };
}
