"use server";

import Anthropic from "@anthropic-ai/sdk";
import { loadSharedKnowledge } from "@/app/lib/coachKnowledge";
import { verifyCaller } from "@/app/lib/serverAuth";
import { formatExerciseCatalog, formatKnowledgeCards, formatPrinciplesBlock } from "@/app/utils/coachPrompt";
import type { AIAssistantContext, AIChatMessage } from "@/app/types";

// The admin console's clinical co-pilot (AdminCoPilotDrawer). Works from the
// same principles and knowledge cards as the patient coach
// (app/actions/coach.ts), plus the exercise catalog with each exercise's
// prime movers/synergists so it can count weekly sets per muscle.

const MODEL = "claude-opus-5-5";
const MAX_HISTORY_MESSAGES = 20; // keeps a long-running chat session's prompt bounded
// The client sends the whole history, so a caller could otherwise pad it with
// huge messages; this bounds what one call can cost.
const MAX_MESSAGE_CHARS = 4_000;

export type AIAssistantResult = { ok: true; reply: string } | { ok: false; error: string };

const ADMIN_SYSTEM_PROMPT = `את/ה עמית/ה בכיר/ה - פיזיותרפיסט/ית ספורט מומחה/ית - ומשמש/ת כשותף/ה מקצועי/ת לרועי, פיזיותרפיסט הספורט שמנהל את הקליניקה ואת האפליקציה הזו (Eccentric (Optimal Motion)).

תפקידך לעזור לו:
- לבנות פרוטוקולי שיקום ותוכניות אימון
- לתכנן פריודיזציה של בלוקי אימון
- להרכיב אימונים ספציפיים לפי מקרה, כולל התאמות, פרוגרסיות ורגרסיות

העקרונות למטה הם של רועי עצמו. בנה/י לפיהם כברירת מחדל: נפח שבועי לשריר (שריר מסייע = חצי סט, לפי ספריית התרגילים), טווח חזרות, RIR, תדירות, משך אימון ובחירת תרגילים בטווח מלא. כשהוא מבקש משהו שחורג מהם, עשה/י מה שביקש וציין/י בקצרה את החריגה. כשמציעים תרגילים, רק מספריית התרגילים, בשמות שלהם.

טון: עמית לעמית, ישיר, ברמה קלינית גבוהה, עם דגש על ביומכניקה, פיזיולוגיה של האימון ועקרונות שיקום מבוססי מחקר. רועי הוא המומחה כאן - אתה כלי עזר מקצועי לחשיבה, לא מורה שמסביר יסודות. אפשר ואף רצוי להשתמש במונחים מקצועיים ללא צורך לפשט אותם. מחקר מצטטים מכרטיסי הידע כשיש; ידע מחקרי אחר מותר, אבל בלי להמציא מקורות או מספרים.

ענה תמיד בעברית, בקצרה ולעניין.`;

function formatContextBlock(contextData?: AIAssistantContext): string {
  if (!contextData) return "";
  const lines: string[] = [];

  if (contextData.patientName) lines.push(`שם המטופל/ת: ${contextData.patientName}`);
  if (contextData.patientType) lines.push(`סוג מטופל/ת: ${contextData.patientType === "clinical" ? "שיקומי" : "כושר"}`);
  if (contextData.painAreas && contextData.painAreas.length > 0) lines.push(`אזורי כאב שדווחו לאחרונה: ${contextData.painAreas.join(", ")}`);

  if (contextData.currentExercises && contextData.currentExercises.length > 0) {
    const exerciseLines = contextData.currentExercises.map((ex) => `- ${ex.title} (בלוק ${ex.block}): ${ex.sets}x${ex.reps}`).join("\n");
    lines.push(`תרגילים בתוכנית/בטיוטה הנוכחית:\n${exerciseLines}`);
  }

  if (contextData.recentWorkoutLogs && contextData.recentWorkoutLogs.length > 0) {
    const logLines = contextData.recentWorkoutLogs
      .map((log) => `- ${log.category}: RPE ${log.rpe}, כאב לפני ${log.painBefore ?? "-"}, כאב אחרי ${log.painAfter ?? "-"} (${log.createdAt})`)
      .join("\n");
    lines.push(`אימונים אחרונים:\n${logLines}`);
  }

  if (contextData.notes) lines.push(`הערות נוספות: ${contextData.notes}`);

  return lines.length > 0 ? `--- מה שעל המסך עכשיו ---\n${lines.join("\n")}` : "";
}

/**
 * Admin-only chat for the AI co-pilot. `contextData` grounds the reply in
 * whatever the admin has on screen (e.g. the plan being built). Safe to call
 * directly from a client component, with the caller's Supabase access token.
 */
export async function chatWithAssistant(accessToken: string, messages: AIChatMessage[], contextData?: AIAssistantContext): Promise<AIAssistantResult> {
  if (messages.length === 0) return { ok: false, error: "לא נשלחה הודעה" };
  if (messages.some((m) => typeof m.content !== "string" || m.content.length > MAX_MESSAGE_CHARS)) return { ok: false, error: "ההודעה ארוכה מדי" };
  const caller = await verifyCaller(accessToken);
  if (!caller?.isAdmin) return { ok: false, error: "אין הרשאה" };

  const knowledge = await loadSharedKnowledge(caller.client);
  const screenContext = formatContextBlock(contextData);

  try {
    const response = await new Anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 16000, // thinking counts toward it: a full program used ~8k on thinking alone
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // "medium" spent the whole budget thinking through weekly volume on a
      // 4-day program (16k tokens, 145 s, no answer); "low" answered in ~75 s
      // with the volume table right.
      output_config: { effort: "low" },
      system: [
        { type: "text", text: ADMIN_SYSTEM_PROMPT },
        { type: "text", text: formatPrinciplesBlock(knowledge.principles) },
        { type: "text", text: formatKnowledgeCards(knowledge.facts) },
        { type: "text", text: formatExerciseCatalog(knowledge.exercises), cache_control: { type: "ephemeral" } },
        ...(screenContext ? [{ type: "text" as const, text: screenContext }] : []),
      ],
      messages: messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: m.content })),
    });
    if (response.stop_reason === "refusal") return { ok: false, error: "העוזר סירב לבקשה. נסה לנסח אחרת." };
    if (response.stop_reason === "max_tokens") return { ok: false, error: "התשובה נקטעה. נסה לבקש פחות בבת אחת." };
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n")
      .trim();
    if (!text) return { ok: false, error: "לא התקבלה תשובה מהעוזר" };
    return { ok: true, reply: text };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "העוזר עמוס כרגע. נסה שוב בעוד רגע." };
    if (err instanceof Anthropic.APIError) return { ok: false, error: `שגיאת API (${err.status}): ${err.message}` };
    return { ok: false, error: err instanceof Error ? err.message : "שגיאה בתקשורת עם העוזר החכם" };
  }
}
