"use client";

import { supabase } from "@/app/lib/supabase";
import { cancelRestAlarm, removePushSubscription, savePushSubscription, scheduleRestAlarm, updateRestAlarm } from "@/app/actions/push";

// Browser side of Web Push (server: app/actions/push.ts, worker:
// public/sw.js). On iPhone this only works for the app added to the home
// screen (iOS 16.4+); in Safari itself there's no PushManager.

export type PushStatus = "unsupported" | "needs-install" | "denied" | "off" | "on";

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch((err) => console.error("Service worker registration failed:", err));
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function getPushStatus(): Promise<PushStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (isIos() && !isStandalone()) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return (await currentSubscription()) ? "on" : "off";
}

// Must run from a tap: iOS only shows the permission prompt for a user gesture.
export async function enablePush(): Promise<{ ok: true } | { ok: false; status: PushStatus; error?: string }> {
  const status = await getPushStatus();
  if (status === "unsupported" || status === "needs-install" || status === "denied") return { ok: false, status };
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { ok: false, status, error: "התראות לא מוגדרות" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, status: permission === "denied" ? "denied" : "off" };

  try {
    const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
    const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const saved = await savePushSubscription(await accessToken(), json, navigator.userAgent);
    if (!saved.ok) return { ok: false, status: "off", error: saved.error };
    return { ok: true };
  } catch (err) {
    return { ok: false, status: "off", error: err instanceof Error ? err.message : "שגיאה" };
  }
}

export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await removePushSubscription(await accessToken(), subscription.endpoint);
  await subscription.unsubscribe();
}

// ---- The rest alarm: one at a time, like the rest timer itself ----

// The schedule call is in flight while the rest runs; stop/extend wait for
// it, so a rest that ends right away still cancels its alarm.
let pendingAlarm: Promise<string | null> | null = null;

export function startRestAlarm(endsAtMs: number, title: string, body: string) {
  stopRestAlarm();
  pendingAlarm = (async () => {
    if (!(await currentSubscription())) return null;
    const result = await scheduleRestAlarm(await accessToken(), endsAtMs, title, body);
    return result.ok ? result.alarmId : null;
  })().catch(() => null);
}

export function extendRestAlarm(endsAtMs: number) {
  const alarm = pendingAlarm;
  if (!alarm) return;
  void alarm.then(async (id) => {
    if (id) await updateRestAlarm(await accessToken(), id, endsAtMs);
  });
}

export function stopRestAlarm() {
  const alarm = pendingAlarm;
  pendingAlarm = null;
  if (!alarm) return;
  void alarm.then(async (id) => {
    if (id) await cancelRestAlarm(await accessToken(), id);
  });
}
