import "server-only";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { ensureVapid, sendPush, type PushPayload, type PushTarget } from "@/app/lib/webPush";

// Web Push to every admin device that turned alerts on (the coach tab's
// "התראה למכשיר הזה"). Service role: patients can't read admins'
// subscriptions. Never throws — an alert that fails must not fail the action
// that raised it.
export async function pushToAdmins(payload: PushPayload, ttlSeconds: number) {
  try {
    if (!ensureVapid()) return;
    const { data: admins } = await supabaseAdmin.from("patients").select("id").eq("role", "admin");
    const adminIds = (admins ?? []).map((a) => a.id);
    if (adminIds.length === 0) return;
    const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("endpoint, p256dh, auth").in("patient_id", adminIds);
    const { gone } = await sendPush((subs ?? []) as PushTarget[], payload, ttlSeconds);
    if (gone.length) await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", gone);
  } catch (err) {
    console.error("Admin alert failed:", err);
  }
}
