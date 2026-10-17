"use server";

import Anthropic from "@anthropic-ai/sdk";
import { after } from "next/server";
import { FEATURES } from "@/app/constants/features";
import { loadPatientContext, loadSharedKnowledge } from "@/app/lib/coachKnowledge";
import { verifyCaller } from "@/app/lib/serverAuth";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { pushToAdmins } from "@/app/lib/adminAlerts";
import { COACH_SYSTEM_PROMPT, formatExerciseCatalog, formatKnowledgeCards, formatPatientContext, formatPrinciplesBlock } from "@/app/utils/coachPrompt";
import type { AIChatMessage } from "@/app/types";

// The patient's personal AI coach. Everything it knows is loaded here on the
// server with the caller's own token — Roei's principles, the knowledge
// cards, the exercise catalog and this patient's plan and recent sessions —
// never taken from the client.
//
// While FEATURES.patientAiCoach is off, only an admin can call it, for a
// chosen patient (the admin "בדיקת המאמן" tab). Patients are refused.
//
// Safety and cost (20261015210000_coach_safety.sql): a patient gets a daily
// message limit (coach_take_message, counted in the database); every reply
// flagged urgent/emergency is recorded in coach_flags and pushed to the
// admins' devices — from the test tab too, marked as a test.
//
// History (20261017120000_coach_messages.sql): each patient exchange is
// stored for 6 months, so the chat continues where it stopped and the
// therapist can read it; the patient can delete it. Test chats aren't stored.

const MODEL = "claude-sonnet-5-5";
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2_000;

export type CoachRedFlag = "none" | "urgent" | "emergency";
export type CoachResult = { ok: true; reply: string; redFlag: CoachRedFlag } | { ok: false; error: string };

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "red_flag"],
  properties: {
    reply: { type: "string" },
    red_flag: { type: "string", enum: ["none", "urgent", "emergency"] },
  },
};

export async function askCoach(accessToken: string, messages: AIChatMessage[], testPatientId?: string): Promise<CoachResult> {
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") return { ok: false, error: "לא נשלחה הודעה" };
  if (messages.some((m) => typeof m.content !== "string" || m.content.length > MAX_MESSAGE_CHARS)) return { ok: false, error: "ההודעה ארוכה מדי" };

  const caller = await verifyCaller(accessToken);
  if (!caller) return { ok: false, error: "אין הרשאה" };

  let patientId: string;
  if (testPatientId) {
    if (!caller.isAdmin) return { ok: false, error: "אין הרשאה" };
    patientId = testPatientId;
  } else {
    if (!FEATURES.patientAiCoach) return { ok: false, error: "המאמן האישי עדיין לא זמין" };
    const { data: me } = await caller.client.from("patients").select("id").eq("user_id", caller.userId).maybeSingle();
    if (!me) return { ok: false, error: "אין הרשאה" };
    patientId = String(me.id);
    const { data: taken, error: limitError } = await caller.client.rpc("coach_take_message");
    if (limitError) return { ok: false, error: "שגיאה זמנית. נסו שוב בעוד רגע." };
    if (taken === -1) return { ok: false, error: "ההודעות למאמן להיום נגמרו. אפשר להמשיך מחר." };
  }

  const knowledge = await loadSharedKnowledge(caller.client);
  const patient = await loadPatientContext(caller.client, patientId, knowledge.exercises);
  if (!patient) return { ok: false, error: "המתאמן לא נמצא" };

  try {
    const response = await new Anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 16000, // thinking counts toward it
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      system: [
        { type: "text", text: COACH_SYSTEM_PROMPT },
        { type: "text", text: formatPrinciplesBlock(knowledge.principles) },
        { type: "text", text: formatKnowledgeCards(knowledge.facts) },
        // Everything above is the same for every patient: cached once.
        { type: "text", text: formatExerciseCatalog(knowledge.exercises), cache_control: { type: "ephemeral" } },
        // Same for every turn of this patient's conversation.
        { type: "text", text: formatPatientContext(patient), cache_control: { type: "ephemeral" } },
      ],
      messages: messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: m.content })),
    });

    if (response.stop_reason === "refusal") return { ok: false, error: "המאמן לא יכול לענות על זה. נסה לנסח אחרת." };
    if (response.stop_reason === "max_tokens") return { ok: false, error: "התשובה נקטעה. נסה לשאול על פחות בבת אחת." };
    const text = response.content.find((b) => b.type === "text")?.text;
    if (!text) return { ok: false, error: "לא התקבלה תשובה" };
    const out = JSON.parse(text) as { reply: string; red_flag: CoachRedFlag };
    const lastMessage = messages[messages.length - 1].content;
    if (!testPatientId) {
      const flag = out.red_flag === "none" ? null : out.red_flag;
      after(() => storeExchange(patientId, lastMessage, out.reply, flag));
    }
    if (out.red_flag !== "none") {
      const level = out.red_flag;
      // After the reply is on its way: the patient never waits for this.
      after(() => recordRedFlag({ patientId, patientName: patient.firstName, level, message: lastMessage, reply: out.reply, isTest: !!testPatientId }));
    }
    return { ok: true, reply: out.reply, redFlag: out.red_flag };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "המאמן עמוס כרגע. נסה שוב בעוד רגע." };
    if (err instanceof Anthropic.APIError) return { ok: false, error: `שגיאת API (${err.status}): ${err.message}` };
    if (err instanceof SyntaxError) return { ok: false, error: "התשובה לא הייתה בפורמט תקין" };
    return { ok: false, error: err instanceof Error ? err.message : "שגיאה בתקשורת עם המאמן" };
  }
}

const FLAG_TITLE: Record<Exclude<CoachRedFlag, "none">, string> = { emergency: "🚨 דגל אדום: חירום", urgent: "⚠️ דגל אדום: לפנות היום" };

// Saves the flag and pushes it to every admin device. Service role: the
// patient can't read admins' subscriptions, and the flag must be written
// whatever the patient's own permissions are.
async function recordRedFlag(f: { patientId: string; patientName: string | null; level: Exclude<CoachRedFlag, "none">; message: string; reply: string; isTest: boolean }) {
  try {
    await supabaseAdmin.from("coach_flags").insert({
      patient_id: Number(f.patientId),
      level: f.level,
      patient_message: f.message.slice(0, 2000),
      coach_reply: f.reply.slice(0, 4000),
      is_test: f.isTest,
    });
    const excerpt = f.message.length > 90 ? `${f.message.slice(0, 90)}…` : f.message;
    await pushToAdmins(
      { title: `${f.isTest ? "[בדיקה] " : ""}${FLAG_TITLE[f.level]}`, body: `${f.patientName ?? "מתאמן"}: ${excerpt}`, tag: `coach-flag-${f.patientId}` },
      24 * 3600
    );
  } catch (err) {
    console.error("Recording coach red flag failed:", err);
  }
}

// Service role: rows are only ever written here, never by the client.
async function storeExchange(patientId: string, message: string, reply: string, redFlag: Exclude<CoachRedFlag, "none"> | null) {
  const { error } = await supabaseAdmin.from("coach_messages").insert([
    { patient_id: Number(patientId), role: "user", content: message.slice(0, 8000), red_flag: null },
    { patient_id: Number(patientId), role: "assistant", content: reply.slice(0, 8000), red_flag: redFlag },
  ]);
  if (error) console.error("Storing coach exchange failed:", error);
}

const HISTORY_LIMIT = 40;

export type CoachHistoryResult = { ok: true; messages: (AIChatMessage & { redFlag: CoachRedFlag })[] } | { ok: false; error: string };

// The patient's own recent conversation (RLS: own rows only), oldest first.
export async function loadCoachHistory(accessToken: string): Promise<CoachHistoryResult> {
  const caller = await verifyCaller(accessToken);
  if (!caller) return { ok: false, error: "אין הרשאה" };
  const { data: me } = await caller.client.from("patients").select("id").eq("user_id", caller.userId).maybeSingle();
  if (!me) return { ok: false, error: "אין הרשאה" };
  const { data, error } = await caller.client
    .from("coach_messages")
    .select("role, content, red_flag")
    .eq("patient_id", me.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    messages: (data ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string, redFlag: ((m.red_flag as CoachRedFlag | null) ?? "none") })),
  };
}

export async function clearCoachHistory(accessToken: string): Promise<{ ok: boolean; error?: string }> {
  const caller = await verifyCaller(accessToken);
  if (!caller) return { ok: false, error: "אין הרשאה" };
  const { data: me } = await caller.client.from("patients").select("id").eq("user_id", caller.userId).maybeSingle();
  if (!me) return { ok: false, error: "אין הרשאה" };
  const { error } = await caller.client.from("coach_messages").delete().eq("patient_id", me.id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
