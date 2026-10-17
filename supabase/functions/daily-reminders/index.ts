// Daily workout reminders as Web Push, sent from the server so they arrive
// with the app closed. pg_cron calls this every minute
// (20261015170000_daily_reminders.sql); it sends each patient's reminder once
// a day, in the first REMINDER_WINDOW_MIN minutes after the time they set
// for that weekday (patients.reminder_schedule, their own timezone) — unless
// they already trained today. Same subscriptions and VAPID keys as the
// rest-end alerts (app/actions/push.ts).
//
// Deployed without JWT verification; instead every call must carry the
// x-cron-secret header, which only the cron job has (generated in Vault by
// the migration, checked with verify_reminders_cron_secret).

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const REMINDER_WINDOW_MIN = 15;
const DEFAULT_TZ = "Asia/Jerusalem";

type Schedule = Record<string, string>; // weekday "0"-"6" (Sunday = 0) -> "HH:MM"

interface PatientRow {
  id: number;
  first_name: string | null;
  reminder_schedule: Schedule | null;
  reminder_time: string | null;
  reminder_days: string | null;
  reminder_timezone: string | null;
}

// Same fallback as app/hooks/useReminders.ts: accounts saved before per-day
// times have one shared time on each chosen day.
function scheduleOf(p: PatientRow): Schedule {
  if (p.reminder_schedule && Object.keys(p.reminder_schedule).length > 0) return p.reminder_schedule;
  if (!p.reminder_time || !p.reminder_days) return {};
  return Object.fromEntries(p.reminder_days.split(",").filter(Boolean).map((d) => [d, p.reminder_time!]));
}

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Wall-clock date, weekday and minute of day in a timezone.
function localNow(tz: string, at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday: WEEKDAY[parts.weekday], minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

const localDateOf = (iso: string, tz: string) => localNow(tz, new Date(iso)).date;

Deno.serve(async (req: Request) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const secret = req.headers.get("x-cron-secret") ?? "";
  const { data: authorized } = secret ? await db.rpc("verify_reminders_cron_secret", { p_secret: secret }) : { data: false };
  if (authorized !== true) return new Response("Unauthorized", { status: 401 });

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) return new Response("VAPID keys missing", { status: 500 });
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? Deno.env.get("SUPABASE_URL")!, publicKey, privateKey);

  const { data: subs } = await db.from("push_subscriptions").select("patient_id, endpoint, p256dh, auth");
  if (!subs?.length) return Response.json({ sent: 0 });

  const patientIds = Array.from(new Set(subs.map((s) => s.patient_id)));
  const { data: patients } = await db
    .from("patients")
    .select("id, first_name, reminder_schedule, reminder_time, reminder_days, reminder_timezone")
    .in("id", patientIds);

  const now = new Date();
  let sent = 0;
  for (const p of (patients ?? []) as PatientRow[]) {
    const tz = p.reminder_timezone || DEFAULT_TZ;
    const local = localNow(tz, now);
    const time = scheduleOf(p)[String(local.weekday)];
    if (!time || !/^\d{2}:\d{2}$/.test(time)) continue;
    const due = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    if (local.minute < due || local.minute >= due + REMINDER_WINDOW_MIN) continue;

    // Once a day: the log row is the lock (primary key patient + local date).
    const { data: claimed } = await db
      .from("reminder_log")
      .upsert({ patient_id: p.id, local_date: local.date }, { onConflict: "patient_id,local_date", ignoreDuplicates: true })
      .select("patient_id");
    if (!claimed?.length) continue;

    // Already trained today: nothing to remind about.
    const since = new Date(now.getTime() - 36 * 3600_000).toISOString();
    const { data: logs } = await db.from("workout_logs").select("created_at").eq("patient_id", p.id).gte("created_at", since);
    if ((logs ?? []).some((l) => localDateOf(l.created_at as string, tz) === local.date)) continue;

    // Service message only (חוק התקשורת סעיף 30א): the patient scheduled it.
    // Never put promotions ("upgrade to premium", sales) in it — marketing
    // needs its own explicit opt-in and an unsubscribe in every message.
    const name = p.first_name?.trim();
    const payload = JSON.stringify({
      title: "הגיע הזמן להתאמן 💪",
      body: name ? `${name}, האימון של היום מחכה לך` : "האימון של היום מחכה לך",
      tag: "daily-reminder",
      url: "/",
    });
    for (const sub of subs.filter((s) => s.patient_id === p.id)) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 3600 });
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        else console.error("Reminder push failed:", status, err);
      }
    }
  }
  return Response.json({ sent });
});
