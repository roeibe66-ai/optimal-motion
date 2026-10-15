"use server";

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { AVAILABLE_MUSCLES } from "@/app/constants/catalog";
import { verifyCaller } from "@/app/lib/serverAuth";

// "הצע לי נושאים" in the admin research tab: research questions worth a
// "Did you know?" card, grounded in what the app's patients actually train
// (muscles in their assigned exercises), where they report pain, and which
// facts already exist (so it doesn't repeat them).

const MODEL = "claude-sonnet-5-5";
const TOP_N = 8;

export interface ResearchTopicSuggestion {
  questionHe: string; // ready to paste into the search box
  whyHe: string; // why it's relevant to these patients
}

export type ResearchTopicsResult = { ok: true; topics: ResearchTopicSuggestion[] } | { ok: false; error: string };

const topicsSchema = z.object({
  topics: z
    .array(
      z.object({
        questionHe: z.string().describe("שאלת מחקר ספציפית בעברית, כמו שמקלידים בחיפוש: נושא + היבט ספציפי (למשל 'כמה זמן לנוח בין סטים לבניית שריר?'), עד 15 מילים"),
        whyHe: z.string().describe("משפט קצר: למה זה רלוונטי למתאמנים באפליקציה, לפי הנתונים"),
      })
    )
    .describe("8 נושאים שונים זה מזה"),
});

const MUSCLE_LABEL = Object.fromEntries(AVAILABLE_MUSCLES.map((m) => [m.id, m.label]));

const countTop = (values: string[], n: number) =>
  Object.entries(values.reduce<Record<string, number>>((acc, v) => ((acc[v] = (acc[v] ?? 0) + 1), acc), {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);

export async function suggestResearchTopics(accessToken: string): Promise<ResearchTopicsResult> {
  const caller = await verifyCaller(accessToken);
  if (!caller?.isAdmin) return { ok: false, error: "אין הרשאה" };

  const [assigned, exercises, logs, patients, facts] = await Promise.all([
    caller.client.from("patient_exercises").select("exercise_id"),
    caller.client.from("exercises").select("id, name_he, prime_movers, target_muscle"),
    caller.client.from("workout_logs").select("pain_areas, pain_after").order("created_at", { ascending: false }).limit(500),
    caller.client.from("patients").select("patient_type").neq("role", "admin"),
    caller.client.from("curated_facts").select("did_you_know_he"),
  ]);

  const exerciseById = new Map((exercises.data ?? []).map((e) => [e.id as string, e]));
  const assignedMuscles = (assigned.data ?? []).flatMap((r) => {
    const e = exerciseById.get(r.exercise_id as string);
    const ids = (e?.prime_movers as string[] | null)?.length ? (e!.prime_movers as string[]) : ((e?.target_muscle as string | null)?.split(",") ?? []);
    return ids.map((id) => MUSCLE_LABEL[id.trim()] ?? id.trim());
  });
  const assignedExercises = (assigned.data ?? []).map((r) => (exerciseById.get(r.exercise_id as string)?.name_he as string | undefined) ?? "").filter(Boolean);
  const painAreas = (logs.data ?? []).flatMap((l) => ((l.pain_areas as string | null) ?? "").split(",").map((a) => a.trim()).filter(Boolean));
  const types = (patients.data ?? []).map((p) => (p.patient_type === "clinical" ? "שיקומי" : "כושר"));

  const fmt = (pairs: [string, number][]) => (pairs.length ? pairs.map(([k, n]) => `${k} (${n})`).join(", ") : "אין נתונים");
  const prompt = `נתוני האפליקציה:
- מתאמנים לפי סוג: ${fmt(countTop(types, 3))}
- השרירים שהכי מתאמנים עליהם בתוכניות: ${fmt(countTop(assignedMuscles, 10))}
- התרגילים הנפוצים בתוכניות: ${fmt(countTop(assignedExercises, 12))}
- אזורי כאב שדווחו באימונים: ${fmt(countTop(painAreas, 8))}

עובדות "הידעת" שכבר קיימות (אל תחזור עליהן):
${(facts.data ?? []).map((f) => `- ${f.did_you_know_he}`).join("\n") || "- אין"}

הצע ${TOP_N} שאלות מחקר שעובדת "הידעת" עליהן תעניין את המתאמנים האלה ותעזור להם באימון: שילוב של עקרונות אימון (נפח, מנוחה, טווח תנועה, התקדמות), כאב ושיקום באזורים שדווחו, התאוששות ושינה, והתמדה. כל שאלה עם היבט ספציפי שאפשר למצוא עליו מחקר, לא נושא כללי.`;

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: topicsSchema,
      system: "את/ה פיזיותרפיסט/ית ספורט שמתכנן/ת תוכן מבוסס מחקר לאפליקציית כושר ושיקום. כתוב/י בעברית.",
      prompt,
    });
    return { ok: true, topics: object.topics.slice(0, TOP_N) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "שגיאה ביצירת הצעות" };
  }
}
