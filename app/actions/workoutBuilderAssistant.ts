"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import type { WorkoutFormat, WorkoutItem } from "@/app/types";

// AI co-pilot for the admin workout builder (WorkoutBuilderTab): answers
// questions about the workout being built and, when asked to build or change
// it, returns a full proposed workout drawn only from the exercise catalog —
// the editor shows it with an "apply" button, nothing is saved here.

const MODEL = "claude-opus-5-5";

export interface BuilderCatalogEntry {
  id: string;
  name_he: string;
  name_en: string;
  categories: string[];
  equipment: string[];
  target: string;
}

// One past turn. `content` is the exact text that was sent/received, so the
// history replays byte-for-byte (keeps the prompt cache warm).
export interface BuilderChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface BuilderProposal {
  title: string;
  format: WorkoutFormat;
  timeCapMinutes: number | null;
  items: WorkoutItem[];
}

export type BuilderAssistantResult = { ok: true; reply: string; proposal: BuilderProposal | null } | { ok: false; error: string };

const SYSTEM_PROMPT = `את/ה עמית/ה בכיר/ה - פיזיותרפיסט/ית ספורט ומאמן/ת כוח - ושותף/ה של רועי, הפיזיותרפיסט שמנהל את האפליקציה Eccentric (Optimal Motion), בבניית אימונים בודדים במסך "יצירת אימונים".

כל הודעה של רועי מגיעה עם מצב הטיוטה הנוכחית של האימון. עזור לו לבנות, לשפר ולבדוק אותו: בחירת תרגילים, סדר, חלוקה לבלוקים וסופר-סטים, נפח, טווחי חזרות, RIR ומנוחות.

כללים:
- ענה בעברית, עמית לעמית, קצר ולעניין. אפשר מונחים מקצועיים.
- ממלא/ת את proposal.has_workout = true רק כשרועי ביקש לבנות, לשנות, להוסיף או להחליף משהו באימון. אז proposal הוא האימון המלא אחרי השינוי (לא רק התוספת), כולל התרגילים שנשארים. בשאלה או בבקשת חוות דעת בלבד - has_workout = false, וב-reply כתוב את התשובה.
- השתמש רק בתרגילים מהקטלוג למטה, עם ה-id המדויק שלהם. אם אין תרגיל מתאים, אמור זאת ב-reply והצע חלופה מהקטלוג.
- בלוקים: אות אחת (A, B, C...). תרגילים עם אותה אות הם סופר-סט - מבוצעים ברצף, והמנוחה היא אחרי התרגיל האחרון בבלוק.
- reps הוא היעד או הקצה התחתון של טווח. לטווח (למשל 8-12) שים reps=8 ו-reps_max=12; בלי טווח reps_max=0. לתרגיל לפי זמן is_time=true, reps הוא מספר השניות ו-reps_max=0.
- rir: מספר שלם, או -1 כשלא רלוונטי. rest_time_seconds במספר שניות.
- ב-AMRAP: format="amrap", time_cap_minutes הוא משך האימון, ו-sets/rir/rest/block לא בשימוש (שים 1, -1, 0, "A"). באימון רגיל time_cap_minutes=0.
- ב-reply לאחר הצעת אימון: משפט או שניים על ההיגיון (לא לפרט שוב כל תרגיל).`;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "proposal"],
  properties: {
    reply: { type: "string" },
    proposal: {
      type: "object",
      additionalProperties: false,
      required: ["has_workout", "title", "format", "time_cap_minutes", "items"],
      properties: {
        has_workout: { type: "boolean" },
        title: { type: "string" },
        format: { type: "string", enum: ["standard", "amrap"] },
        time_cap_minutes: { type: "integer" },
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["exercise_id", "block", "sets", "reps", "reps_max", "is_time", "rir", "rest_time_seconds"],
            properties: {
              exercise_id: { type: "string" },
              block: { type: "string" },
              sets: { type: "integer" },
              reps: { type: "integer" },
              reps_max: { type: "integer" },
              is_time: { type: "boolean" },
              rir: { type: "integer" },
              rest_time_seconds: { type: "integer" },
            },
          },
        },
      },
    },
  },
} as const;

interface RawOutput {
  reply: string;
  proposal: {
    has_workout: boolean;
    title: string;
    format: WorkoutFormat;
    time_cap_minutes: number;
    items: {
      exercise_id: string;
      block: string;
      sets: number;
      reps: number;
      reps_max: number;
      is_time: boolean;
      rir: number;
      rest_time_seconds: number;
    }[];
  };
}

function formatCatalog(catalog: BuilderCatalogEntry[]): string {
  // Sorted by id so the cached system prompt is byte-identical between calls.
  return [...catalog]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => `${e.id} | ${e.name_he} | ${e.name_en} | ${e.categories.join(",")} | ${e.equipment.join(",")} | ${e.target}`)
    .join("\n");
}

// Server actions are public endpoints: confirm the caller is a signed-in
// admin (is_admin() checks patients.role for auth.uid()) before spending
// API credits.
async function callerIsAdmin(accessToken: string): Promise<boolean> {
  if (!accessToken) return false;
  const userClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await userClient.rpc("is_admin");
  return !error && data === true;
}

export async function askWorkoutBuilderAssistant(
  accessToken: string,
  history: BuilderChatTurn[],
  catalog: BuilderCatalogEntry[],
): Promise<BuilderAssistantResult> {
  if (history.length === 0 || history[history.length - 1].role !== "user") return { ok: false, error: "לא נשלחה הודעה" };
  if (!(await callerIsAdmin(accessToken))) return { ok: false, error: "אין הרשאה" };

  const catalogIds = new Set(catalog.map((e) => e.id));
  const client = new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      system: [
        { type: "text", text: SYSTEM_PROMPT },
        // Catalog last in system so the whole stable prefix is cached.
        { type: "text", text: `--- קטלוג התרגילים (id | עברית | English | קטגוריות | ציוד | שריר מטרה) ---\n${formatCatalog(catalog)}`, cache_control: { type: "ephemeral" } },
      ],
      messages: history.slice(-20).map((t) => ({ role: t.role, content: t.content })),
    });

    if (response.stop_reason === "refusal") return { ok: false, error: "העוזר סירב לבקשה. נסה לנסח אחרת." };
    if (response.stop_reason === "max_tokens") return { ok: false, error: "התשובה נקטעה. נסה לבקש פחות בבת אחת." };

    const text = response.content.find((b) => b.type === "text")?.text;
    if (!text) return { ok: false, error: "לא התקבלה תשובה מהעוזר" };
    const out = JSON.parse(text) as RawOutput;

    let proposal: BuilderProposal | null = null;
    if (out.proposal.has_workout) {
      const isAmrap = out.proposal.format === "amrap";
      const items: WorkoutItem[] = out.proposal.items
        .filter((it) => catalogIds.has(it.exercise_id)) // never trust an id the catalog doesn't have
        .map((it) => {
          const reps = Math.max(1, it.reps);
          const repsMax = !it.is_time && it.reps_max > reps ? it.reps_max : null;
          return isAmrap
            ? { exercise_id: it.exercise_id, reps, reps_max: repsMax, is_time: it.is_time }
            : {
                exercise_id: it.exercise_id,
                block: (it.block || "A").toUpperCase().slice(0, 1),
                sets: Math.max(1, it.sets),
                reps,
                reps_max: repsMax,
                is_time: it.is_time,
                rir: it.rir >= 0 ? it.rir : null,
                rest_time_seconds: Math.max(0, it.rest_time_seconds),
              };
        });
      if (items.length > 0) {
        proposal = {
          title: out.proposal.title,
          format: out.proposal.format,
          timeCapMinutes: isAmrap ? Math.max(1, out.proposal.time_cap_minutes) : null,
          items,
        };
      }
    }
    return { ok: true, reply: out.reply, proposal };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "העוזר עמוס כרגע. נסה שוב בעוד רגע." };
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, error: "מפתח ה-API של Anthropic לא תקין או חסר" };
    if (err instanceof Anthropic.APIError) return { ok: false, error: `שגיאת API (${err.status}): ${err.message}` };
    if (err instanceof SyntaxError) return { ok: false, error: "התשובה של העוזר לא הייתה בפורמט תקין" };
    return { ok: false, error: err instanceof Error ? err.message : "שגיאה בתקשורת עם העוזר" };
  }
}
