import "server-only";
import webpush from "web-push";

// Web Push sending shared by the server actions (rest alarms in
// app/actions/push.ts, red-flag alerts in app/actions/coach.ts). The daily
// reminders run in a Supabase Edge Function with their own copy.

let vapidReady = false;
export function ensureVapid(): boolean {
  if (vapidReady) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  // The contact the push services see: the site itself, not a personal address.
  const site = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://localhost";
  webpush.setVapidDetails(site, publicKey, privateKey);
  vapidReady = true;
  return true;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url?: string;
}

// Sends to every target; reports how many arrived and which endpoints are
// gone for good (404/410: unsubscribed or expired — the caller deletes them).
export async function sendPush(targets: PushTarget[], payload: PushPayload, ttlSeconds: number) {
  const body = JSON.stringify({ url: "/", ...payload });
  let delivered = 0;
  const gone: string[] = [];
  for (const t of targets) {
    try {
      await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, body, { TTL: ttlSeconds, urgency: "high" });
      delivered++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) gone.push(t.endpoint);
      else console.error("Push failed:", status, err);
    }
  }
  return { delivered, gone };
}
