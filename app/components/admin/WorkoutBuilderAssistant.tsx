"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Loader2, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { formatRepTarget, getExerciseName } from "@/app/utils/format";
import {
  askWorkoutBuilderAssistant,
  type BuilderCatalogEntry,
  type BuilderChatTurn,
  type BuilderProposal,
} from "@/app/actions/workoutBuilderAssistant";
import type { Exercise, Lang, WorkoutFormat, WorkoutItem } from "@/app/types";

export interface AssistantDraftView {
  title: string;
  description: string;
  format: WorkoutFormat;
  timeCapMinutes: string;
  items: WorkoutItem[];
}

interface ChatEntry {
  role: "user" | "assistant";
  text: string; // what's shown in the bubble
  proposal?: BuilderProposal | null;
}

const QUICK_PROMPTS = [
  "בנה לי אימון גוף מלא של 45 דקות",
  "תעבור על האימון ותגיד מה היית משנה",
  "הוסף חימום קצר בהתחלה",
  "תן טווחי חזרות במקום מספר קבוע",
];

// The draft as plain text, appended to each user message so the assistant
// always reasons about what's on screen right now.
function describeDraft(draft: AssistantDraftView, exerciseById: (id: string) => Exercise | undefined, lang: Lang): string {
  const isAmrap = draft.format === "amrap";
  const head = [
    `שם: ${draft.title.trim() || "(ללא שם)"}`,
    `סוג: ${isAmrap ? `AMRAP, ${draft.timeCapMinutes || "?"} דקות` : "רגיל (סטים וחזרות)"}`,
    draft.description.trim() ? `תיאור: ${draft.description.trim()}` : null,
  ].filter(Boolean);
  const items =
    draft.items.length === 0
      ? "(אין עדיין תרגילים)"
      : draft.items
          .map((it, i) => {
            const ex = exerciseById(it.exercise_id);
            const reps = it.is_time ? `${it.reps} שנ׳` : `${formatRepTarget(it.reps, it.reps_max)} חזרות`;
            const parts = isAmrap
              ? [reps]
              : [`בלוק ${it.block || "A"}`, `${it.sets ?? 3} סטים`, reps, it.rir != null ? `RIR ${it.rir}` : null, `מנוחה ${it.rest_time_seconds ?? 60} שנ׳`];
            if (it.weight_kg) parts.push(`${it.weight_kg} ק״ג`);
            return `${i + 1}. ${ex ? getExerciseName(ex, lang) : "תרגיל שנמחק"} [${it.exercise_id}] — ${parts.filter(Boolean).join(", ")}`;
          })
          .join("\n");
  return `--- הטיוטה הנוכחית ---\n${head.join("\n")}\nתרגילים:\n${items}`;
}

// Side panel inside the workout editor: chat with the AI co-pilot about the
// draft, and apply a workout it proposes straight into the editor (with undo).
export default function WorkoutBuilderAssistant({
  draft,
  exercises,
  exerciseById,
  lang,
  onApply,
  onClose,
}: {
  draft: AssistantDraftView;
  exercises: Exercise[];
  exerciseById: (id: string) => Exercise | undefined;
  lang: Lang;
  onApply: (proposal: BuilderProposal) => () => void; // returns an undo
  onClose?: () => void;
}) {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [turns, setTurns] = useState<BuilderChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ index: number; undo: () => void } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, isLoading]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || isLoading) return;
    setError(null);
    setInput("");
    const userTurn: BuilderChatTurn = { role: "user", content: `${message}\n\n${describeDraft(draft, exerciseById, lang)}` };
    const nextTurns = [...turns, userTurn];
    setEntries((e) => [...e, { role: "user", text: message }]);
    setIsLoading(true);

    const { data } = await supabase.auth.getSession();
    const catalog: BuilderCatalogEntry[] = exercises.map((e) => ({
      id: e.id,
      name_he: e.name_he ?? "",
      name_en: e.name_en ?? "",
      categories: e.categories ?? [],
      equipment: e.equipment ?? [],
      target: e.target_muscle ?? "",
    }));
    const result = await askWorkoutBuilderAssistant(data.session?.access_token ?? "", nextTurns, catalog);
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error);
      setEntries((e) => e.slice(0, -1)); // drop the unanswered bubble, keep the text to retry
      setInput(message);
      return;
    }
    setTurns([...nextTurns, { role: "assistant", content: result.reply }]);
    setEntries((e) => [...e, { role: "assistant", text: result.reply, proposal: result.proposal }]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-elevated">
      <div className="p-4 border-b border-line flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent-fg flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-black text-fg text-sm">עוזר AI לבניית האימון</h3>
            <p className="text-[10px] text-muted font-bold">רואה את הטיוטה ויכול לבנות או לשנות אותה</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="xl:hidden p-2 text-muted hover:text-fg transition-colors" aria-label="סגור עוזר">
            <X size={18} />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {entries.length === 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-xs text-muted font-medium leading-relaxed mb-1">
              תאר את האימון שאתה רוצה, או בקש חוות דעת על מה שכבר בנית. כשהעוזר מציע אימון, אפשר להחיל אותו על הטיוטה בלחיצה.
            </p>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                className="text-start text-[13px] font-bold text-fg bg-line/60 hover:bg-line rounded-xl px-3 py-2.5 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {entries.map((m, i) => (
          <div key={i} className={`flex flex-col gap-2 ${m.role === "user" ? "items-start" : "items-end"}`}>
            <div
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "bg-line text-fg" : "bg-accent/10 border border-accent/20 text-fg"
              }`}
            >
              {m.text}
            </div>
            {m.proposal && (
              <div className="w-[92%] rounded-2xl border border-accent/30 bg-page/40 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-fg truncate">{m.proposal.title || "אימון מוצע"}</span>
                  <span className="text-[10px] font-bold text-muted shrink-0">
                    {m.proposal.format === "amrap" ? `AMRAP · ${m.proposal.timeCapMinutes} דק׳` : `${m.proposal.items.length} תרגילים`}
                  </span>
                </div>
                <ol className="flex flex-col gap-1 text-[11px] text-muted font-bold">
                  {m.proposal.items.map((it, j) => {
                    const ex = exerciseById(it.exercise_id);
                    const reps = it.is_time ? `${it.reps} שנ׳` : `${formatRepTarget(it.reps, it.reps_max)} חז׳`;
                    return (
                      <li key={j} className="flex gap-1.5">
                        {m.proposal!.format !== "amrap" && <span className="text-accent-fg w-3 shrink-0">{it.block}</span>}
                        <span className="text-fg truncate flex-1">{ex ? getExerciseName(ex, lang) : it.exercise_id}</span>
                        <span className="shrink-0 tabular-nums" dir="ltr">
                          {m.proposal!.format === "amrap" ? reps : `${it.sets}×${reps}`}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {applied?.index === i ? (
                  <button
                    type="button"
                    onClick={() => {
                      applied.undo();
                      setApplied(null);
                    }}
                    className="flex items-center justify-center gap-1.5 text-xs font-bold text-fg bg-line hover:bg-line/70 rounded-xl py-2 transition-colors"
                  >
                    <RotateCcw size={13} /> הוחל על הטיוטה · בטל
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setApplied({ index: i, undo: onApply(m.proposal!) })}
                    className="flex items-center justify-center gap-1.5 text-xs font-black bg-btn-primary text-btn-primary-fg hover:bg-btn-primary-hover rounded-xl py-2 transition-colors"
                  >
                    <Check size={14} /> החל על האימון
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-end">
            <div className="bg-accent/10 border border-accent/20 rounded-2xl px-3.5 py-2.5 text-accent-fg text-xs font-bold flex items-center gap-2">
              <Loader2 size={13} className="animate-spin" /> חושב...
            </div>
          </div>
        )}
        {error && <div className="bg-danger/10 border border-danger/20 text-danger-fg text-xs font-bold px-3.5 py-2.5 rounded-2xl">{error}</div>}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-line flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="למשל: תחליף את הסקוואט במשהו בלי ציוד"
          className="on-light flex-1 min-w-0 bg-surface border border-line rounded-2xl px-4 py-3 text-fg text-sm placeholder:text-muted outline-none focus:border-focus focus:ring-2 focus:ring-focus"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-btn-primary text-btn-primary-fg w-11 h-11 rounded-2xl flex items-center justify-center hover:bg-btn-primary-hover active:bg-btn-primary-active disabled:bg-disabled disabled:text-disabled-fg disabled:cursor-not-allowed transition-colors shrink-0"
          aria-label="שלח"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
