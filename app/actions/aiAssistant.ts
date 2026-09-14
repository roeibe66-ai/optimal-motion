"use server";

import { generateText, type ModelMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { AIAssistantContext, AIAssistantRole, AIChatMessage } from "@/app/types";

const MAX_HISTORY_MESSAGES = 20; // keeps a long-running chat session's prompt bounded

export type AIAssistantResult = { ok: true; reply: string } | { ok: false; error: string };

const ADMIN_SYSTEM_PROMPT = `את/ה עמית/ה בכיר/ה - פיזיותרפיסט/ית ספורט מומחה/ית - ומשמש/ת כשותף/ה מקצועי/ת לרועי, פיזיותרפיסט הספורט שמנהל את הקליניקה ואת האפליקציה הזו (OptimalMotion).

תפקידך לעזור לו:
- לבנות פרוטוקולי שיקום ותוכניות אימון
- לתכנן פריודיזציה של בלוקי אימון
- להרכיב אימונים ספציפיים לפי מקרה, כולל התאמות, פרוגרסיות ורגרסיות

טון: עמית לעמית, ישיר, ברמה קלינית גבוהה, עם דגש על ביומכניקה, פיזיולוגיה של האימון ועקרונות שיקום מבוססי מחקר. רועי הוא המומחה כאן - אתה כלי עזר מקצועי לחשיבה, לא מורה שמסביר יסודות. אפשר ואף רצוי להשתמש במונחים מקצועיים ללא צורך לפשט אותם.

ענה תמיד בעברית, בקצרה ולעניין.`;

const PATIENT_SYSTEM_PROMPT = `את/ה מאמן/ת אישי/ת פרימיום ומומחה/ית קליני/ת באפליקציית הכושר והשיקום OptimalMotion.

תפקידך לעזור למטופל/ת:
- להתאים את האימון הנוכחי שלו/ה (למשל: אם כואב לו/ה בתרגיל מסוים, להציע גרסה קלה יותר; אם קל מדי, להציע גרסה מאתגרת יותר)
- לענות על שאלות כלליות בנושאי כושר, התאוששות והרגלי אימון
- לתמוך ולעודד לאורך הדרך

טון: אמפתי, מקצועי, שירותי ברמה פרימיום - כמו מאמן אישי יקר שבאמת אכפת לו מהמטופל.

חשוב מאוד: אינך רשאי/ת לאבחן מצב רפואי או לקבוע אבחנה. אם המטופל/ת מדווח/ת על כאב חד, פתאומי, חמור, או כל תסמין מדאיג - המלץ/י בעדינות אך בבירור לפנות ישירות לרועי או לאיש מקצוע רפואי, ואל תנסה/י לפתור זאת לבד.

ענה תמיד בעברית.`;

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

  return lines.length > 0 ? `\n\n--- הקשר נוכחי ---\n${lines.join("\n")}` : "";
}

/**
 * Dual-mode chat brain for the AI co-pilot: `role` selects the persona
 * (elite clinical peer for the admin, premium coach for the patient) and
 * `contextData` grounds the reply in whatever the caller already has on
 * screen (a plan being built, assigned exercises, recent logs). Safe to call
 * directly from a client component.
 */
export async function chatWithAssistant(messages: AIChatMessage[], role: AIAssistantRole, contextData?: AIAssistantContext): Promise<AIAssistantResult> {
  if (messages.length === 0) return { ok: false, error: "לא נשלחה הודעה" };

  const basePrompt = role === "admin" ? ADMIN_SYSTEM_PROMPT : PATIENT_SYSTEM_PROMPT;
  const systemPrompt = basePrompt + formatContextBlock(contextData);
  const coreMessages: ModelMessage[] = messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: m.content }));

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-5"),
      system: systemPrompt,
      messages: coreMessages,
    });
    return { ok: true, reply: text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "שגיאה בתקשורת עם העוזר החכם" };
  }
}
