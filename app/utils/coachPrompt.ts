import { AVAILABLE_MUSCLES, DIFFICULTY_LEVELS, EQUIPMENT_LIST } from "@/app/constants/catalog";
import { KNOWLEDGE_TAG_LABELS } from "@/app/constants/knowledgeTags";
import { TRAINING_EXPERIENCE, TRAINING_GOALS, TRAINING_LOCATIONS } from "@/app/constants/onboarding";
import { parsePerformance } from "@/app/utils/history";
import type { CuratedFact, Exercise, SessionPerformanceEntry, WorkoutLog } from "@/app/types";

// Text blocks shared by the patient coach (app/actions/coach.ts) and the
// admin assistants (aiAssistant.ts, workoutBuilderAssistant.ts): Roei's
// principles (coach_principles), the knowledge cards (curated_facts) and the
// exercise catalog. Pure formatting — loading lives in app/lib/coachKnowledge.ts.

const MUSCLE_LABEL = Object.fromEntries(AVAILABLE_MUSCLES.map((m) => [m.id, m.label]));
const EQUIPMENT_LABEL = Object.fromEntries(EQUIPMENT_LIST.map((e) => [e.id, e.label]));
const LEVEL_LABEL = Object.fromEntries(DIFFICULTY_LEVELS.map((l) => [l.id, l.label]));

const muscles = (ids: string[] | null | undefined) => (ids ?? []).map((id) => MUSCLE_LABEL[id] ?? id).join(", ");

export function formatPrinciplesBlock(principles: string | null): string {
  if (!principles) return "--- העקרונות של רועי ---\n(עדיין לא הוגדרו. עבוד לפי עקרונות אימון ושיקום מקובלים, בזהירות.)";
  return `--- העקרונות של רועי (גוברים על כל ידע כללי שלך) ---\n${principles}`;
}

// Only cards the admin left visible; hidden ones are untrusted.
export function formatKnowledgeCards(facts: CuratedFact[]): string {
  const visible = facts.filter((f) => !f.is_hidden);
  if (visible.length === 0) return "--- כרטיסי ידע (מחקרים) ---\n(אין עדיין. אל תצטט מחקרים.)";
  const lines = visible.map((f, i) => {
    const meta = [f.evidence_grade ? `רמת ראיות ${f.evidence_grade}` : null, f.year ? String(f.year) : null, (f.tags ?? []).map((t) => KNOWLEDGE_TAG_LABELS[t] ?? t).join("/") || null]
      .filter(Boolean)
      .join(" · ");
    return `[${i + 1}] ${f.did_you_know_he}${f.takeaway_he ? `\n    בשבילך: ${f.takeaway_he}` : ""}\n    סיכום: ${f.summary_he}\n    מקור: ${f.paper_title}${meta ? ` (${meta})` : ""}`;
  });
  return `--- כרטיסי ידע (המחקרים היחידים שמותר לצטט) ---\n${lines.join("\n")}`;
}

// One line per exercise. withIds: the id is only useful to callers that
// return exercise ids (none of the chat assistants do today).
export function formatExerciseCatalog(exercises: Exercise[], { withIds = false } = {}): string {
  const rows = [...exercises]
    .sort((a, b) => (a.name_he ?? "").localeCompare(b.name_he ?? "", "he"))
    .map((e) => {
      const parts = [
        withIds ? e.id : null,
        e.name_he || e.name_en || "",
        `עיקריים: ${muscles(e.prime_movers) || muscles(e.target_muscle ? e.target_muscle.split(",") : [])}`,
        e.synergists?.length ? `מסייעים: ${muscles(e.synergists)}` : null,
        e.equipment?.length ? `ציוד: ${e.equipment.map((q) => EQUIPMENT_LABEL[q] ?? q).join(", ")}` : null,
        e.difficulty_level ? `רמה: ${LEVEL_LABEL[e.difficulty_level] ?? e.difficulty_level}` : null,
        e.categories?.length ? e.categories.join(", ") : null,
      ];
      return parts.filter(Boolean).join(" | ");
    });
  return `--- ספריית התרגילים של האפליקציה (רק מהם מותר לבנות תוכנית) ---\n${rows.join("\n")}`;
}

// ---- Patient context ----

export interface CoachProgramRow {
  programName: string;
  weeklyTarget: number | null;
  exerciseName: string;
  block: string | null;
  sets: number | null;
  reps: number | null;
  repsMax: number | null;
  isTime: boolean;
  rir: number | null;
  weightKg: number | null;
  therapistNote: string | null;
  patientNote: string | null;
}

// Onboarding questionnaire answers (patients columns, OnboardingFlow).
export interface CoachPatientProfile {
  goals: string[];
  experience: string | null;
  days: number | null;
  minutes: number | null;
  location: string | null;
  homeEquipment: string[];
  addressForm: string | null;
  birthYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  limitationAreas: string[];
  recentSurgery: boolean | null;
}

export interface CoachPatientContext {
  firstName: string | null;
  patientType: string | null;
  profile: CoachPatientProfile | null;
  programs: CoachProgramRow[];
  logs: WorkoutLog[]; // newest first
  exerciseNames: Record<string, string>; // exercise id -> name, for performance_data
  today: string; // YYYY-MM-DD
}

function formatSets(sets: SessionPerformanceEntry[]): string {
  const weights = Array.from(new Set(sets.map((s) => Number(s.weight_kg) || 0).filter((w) => w > 0)));
  const reps = sets.map((s) => s.reps).join("/");
  const rirs = sets.some((s) => typeof s.rir === "number") ? `, RIR ${sets.map((s) => s.rir ?? "-").join("/")}` : "";
  return `${sets.length} סטים, חזרות ${reps}${rirs}${weights.length ? `, ${weights.join("/")} ק"ג` : ""}`;
}

export function formatPatientContext(ctx: CoachPatientContext): string {
  const lines: string[] = [`--- המתאמן/ת ---`, `היום: ${ctx.today}`];
  if (ctx.firstName) lines.push(`שם פרטי: ${ctx.firstName}`);
  // Only what they chose in the questionnaire; a name doesn't tell it.
  const form = ctx.profile?.addressForm;
  lines.push(
    form === "m"
      ? "לשון פנייה: זכר."
      : form === "f"
        ? "לשון פנייה: נקבה."
        : `לשון פנייה: לא ידועה. פנו בלשון רבים ("נסו", "כדאי לכם"), גם כשפונים בשם.`
  );
  const p = ctx.profile;
  if (p) {
    const level = TRAINING_EXPERIENCE.find((e) => e.id === p.experience);
    const profileLines = [
      p.goals.length ? `מטרות: ${p.goals.map((g) => TRAINING_GOALS.find((x) => x.id === g)?.label ?? g).join(", ")}` : null,
      level ? `ניסיון: ${level.label}${level.hint ? ` (${level.hint})` : ""}` : "ניסיון: לא צוין, להניח מתחילים",
      p.days ? `זמין ${p.days} ימים בשבוע` : null,
      p.minutes ? `כ-${p.minutes} דקות לאימון` : null,
      p.location ? `מתאמן ${TRAINING_LOCATIONS.find((l) => l.id === p.location)?.label ?? p.location}${p.location !== "gym" && p.homeEquipment.length ? `; בבית יש: ${p.homeEquipment.map((e) => EQUIPMENT_LABEL[e] ?? e).join(", ")}` : ""}` : null,
      p.birthYear ? `גיל: כ-${new Date().getFullYear() - p.birthYear}` : null,
      p.heightCm ? `גובה: ${p.heightCm} ס"מ` : null,
      p.weightKg ? `משקל: ${p.weightKg} ק"ג` : null,
      p.limitationAreas.length ? `אזורים רגישים או מגבלות שסימן בשאלון: ${p.limitationAreas.join(", ")}` : null,
      p.recentSurgery ? "עבר ניתוח בשנה האחרונה (להתייעץ עם רועי לפני התאמות)" : null,
    ].filter(Boolean);
    lines.push("", "משאלון ההיכרות:", ...profileLines.map((l) => `• ${l}`));
  }
  lines.push(`סוג: ${ctx.patientType === "clinical" ? "שיקומי (התוכנית של רועי קובעת, לא בונים תוכנית חדשה)" : "כושר"}`);

  if (ctx.programs.length === 0) {
    lines.push("", "תוכניות: אין עדיין.");
  } else {
    const byProgram = new Map<string, CoachProgramRow[]>();
    for (const row of ctx.programs) byProgram.set(row.programName, [...(byProgram.get(row.programName) ?? []), row]);
    lines.push("", "התוכניות שלו/ה:");
    for (const [name, rows] of byProgram) {
      const target = rows[0].weeklyTarget ? ` (יעד: ${rows[0].weeklyTarget} פעמים בשבוע)` : "";
      lines.push(`• ${name}${target}`);
      for (const r of [...rows].sort((a, b) => (a.block ?? "").localeCompare(b.block ?? ""))) {
        const reps = r.isTime ? `${r.reps} שניות` : r.repsMax && r.reps && r.repsMax > r.reps ? `${r.reps}-${r.repsMax}` : `${r.reps ?? "?"}`;
        const extras = [r.rir != null ? `RIR ${r.rir}` : null, r.weightKg ? `${r.weightKg} ק"ג` : null].filter(Boolean).join(", ");
        const notes = [r.therapistNote ? `הערת רועי: ${r.therapistNote}` : null, r.patientNote ? `הערה שלו/ה: ${r.patientNote}` : null].filter(Boolean).join(" · ");
        lines.push(`   ${r.block ?? "-"}. ${r.exerciseName}: ${r.sets ?? "?"}×${reps}${extras ? ` (${extras})` : ""}${notes ? ` — ${notes}` : ""}`);
      }
    }
  }

  if (ctx.logs.length === 0) {
    lines.push("", "אימונים אחרונים: אין עדיין.");
  } else {
    lines.push("", "אימונים אחרונים (החדש קודם). RPE 1-10: 2 קליל, 4 נוח, 6 מאתגר, 8 קשה מאוד, 10 נגמרתי:");
    for (const log of ctx.logs) {
      const head = [
        log.created_at.slice(0, 10),
        log.category,
        log.rpe != null ? `RPE ${log.rpe}` : "בלי דירוג",
        log.pain_before != null ? `כאב לפני ${log.pain_before}` : null,
        log.pain_after != null ? `כאב אחרי ${log.pain_after}` : null,
        log.pain_areas ? `אזורי כאב: ${log.pain_areas}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      lines.push(`• ${head}`);
      const byExercise = new Map<string, SessionPerformanceEntry[]>();
      for (const entry of parsePerformance(log)) byExercise.set(entry.exercise_id, [...(byExercise.get(entry.exercise_id) ?? []), entry]);
      for (const [exerciseId, sets] of byExercise) lines.push(`   ${ctx.exerciseNames[exerciseId] ?? "תרגיל"}: ${formatSets(sets)}`);
    }
  }
  return lines.join("\n");
}

// ---- The patient coach's own instructions ----

export const COACH_SYSTEM_PROMPT = `את/ה המאמן/ת האישי/ת באפליקציית האימון והשיקום Eccentric (Optimal Motion), ועובד/ת בשביל רועי, פיזיותרפיסט הספורט שבנה למתאמן/ת את התוכנית.

איך לעבוד:
- העקרונות של רועי למטה הם הבסיס לכל תשובה, והם גוברים על כל ידע כללי שלך. כשיש סתירה, סדר העדיפויות בסעיף 2 שלהם קובע.
- יש לך את התוכנית והאימונים האחרונים של המתאמן/ת. השתמש/י בהם כשהם רלוונטיים לשאלה: מספרים אמיתיים (משקל, חזרות, RIR) עדיפים על עצות כלליות. צטט/י מספר רק כפי שהוא מופיע בנתונים, בלי לעגל ובלי להכליל ("12 בכל הסטים" רק אם זה באמת כך בכל הסטים).
- ענה/י רק על מה שנשאל. אל תוסיף/י עצות על נושא אחר (למשל העלאת משקל בתשובה על תזונה), גם אם הנתונים מצדיקים אותן.
- אורך: 2-5 משפטים. רשימה או תוכנית מלאה רק כשביקשו תוכנית, אימון או חלופות.
- כשבונים או משנים אימון, רק תרגילים מספריית התרגילים למטה, בשמות שלהם בדיוק.
- מחקר מצטטים רק מכרטיסי הידע למטה. אסור להמציא מחקר, מספר או מקור.
- קפיצות משקל, כמו בהצעה האוטומטית של האפליקציה: קטלבל לגודל הבא (2 ק"ג עד 16, ואז 16, 20, 24, 28, 32); משקולות יד ומוט פלוס 2 ק"ג עד 20, פלוס 2.5 עד 60, ופלוס 5 מעל 60.
- ספירת נפח שבועי לשריר: לכל תרגיל בתוכנית, סטים × מספר האימונים בשבוע (היעד של התוכנית), סט שלם לשרירים העיקריים וחצי סט למסייעים. חשב/י קודם, ותן/י מספר אחד ברור, בלי להציג את ההתלבטות.
- לשון: אל תנחש/י מגדר לפי השם. אם המגדר לא ידוע, נסח/י בלי לפנות במין (למשל "כדאי", "אפשר", "נסו"), ובלי צורות עם לוכסן כמו "יכול/ה". על עצמך דבר/י בגוף ראשון בלי לציין מין ("אין לי אפשרות לענות" ולא "אני לא יכול").
- אין כרגע מנגנון שמתריע לרועי. אל תבטיח/י שהוא יקבל התראה או הודעה; כשצריך, המלץ/י למתאמן/ת לעדכן אותו.
- ענה/י בעברית, בטון שהעקרונות מגדירים.

פורמט התשובה (JSON):
- reply: התשובה למתאמן/ת.
- red_flag: "emergency" אם תואר אחד ממצבי החירום בסעיף הדגלים האדומים; "urgent" אם תואר מצב מרשימת "לפנות לרופא או לרועי עוד היום"; אחרת "none". כש-red_flag אינו "none", התשובה עוקבת אחרי סעיף הדגלים האדומים בלבד, בלי שום התאמת אימון.`;
