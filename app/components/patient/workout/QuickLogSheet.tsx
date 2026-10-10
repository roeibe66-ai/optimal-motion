"use client";

import { useState } from "react";
import { Check, ClipboardCheck, Loader2, Minus, Plus } from "lucide-react";
import Modal from "@/app/components/ui/Modal";
import { useAuth } from "@/app/context/AuthContext";
import { supabase } from "@/app/lib/supabase";
import { formatRepTarget, formatWeightKg, getExerciseName, parseWeightInput } from "@/app/utils/format";
import { getPainColor, getRPEColor } from "@/app/utils/scoring";
import type { SessionPerformanceEntry } from "@/app/types";
import type { SessionExercise } from "@/app/hooks/useWorkoutSession";

interface QuickLogSheetProps {
  title: string; // program name — logged as workout_logs.category, same as the player
  blocksMap: Record<string, SessionExercise[]>;
  blocksKeys: string[];
  isAmrap: boolean;
  previousWeights: Record<string, number>; // exercise id -> weight used last time (getLastUsedWeights)
  onClose: () => void;
  onLogged: () => void; // refetch logs so Home/Calendar update right away
}

interface SetDraft {
  reps: string;
  weight: string;
}

interface ExerciseDraft {
  done: boolean;
  sets: SetDraft[];
}

// "Quick log": record a workout the patient already did (e.g. at the gym,
// without the app running) — reps per set and an optional weight, then RPE —
// straight from the plan's detail screen, without going through the full
// player. Writes the same workout_logs row shape the player does
// (performance_data = SessionPerformanceEntry[]), flagged is_quick_log, so
// history charts and the therapist's view read it the same way.
export default function QuickLogSheet({ title, blocksMap, blocksKeys, isAmrap, previousWeights, onClose, onLogged }: QuickLogSheetProps) {
  const { loggedInPatient, lang } = useAuth();
  const isClinical = loggedInPatient?.patient_type !== "fitness";
  const exercises = blocksKeys.flatMap((k) => blocksMap[k] ?? []);

  const [drafts, setDrafts] = useState<Record<string, ExerciseDraft>>(() =>
    Object.fromEntries(
      exercises.map((se) => {
        // Prefill: last time's weight, else the therapist's target, else empty.
        const prescribedWeight = previousWeights[se.exercise.id] ?? Number(se.weight_kg);
        const setCount = isAmrap ? 1 : Math.max(1, Number(se.sets) || 1);
        return [
          se.id,
          {
            done: true,
            sets: Array.from({ length: setCount }, () => ({
              reps: String(Number(se.reps) || 0),
              weight: prescribedWeight > 0 ? String(prescribedWeight) : "",
            })),
          },
        ];
      })
    )
  );
  const [rounds, setRounds] = useState("");
  const [extraReps, setExtraReps] = useState("");
  const [rpe, setRpe] = useState<number | null>(null);
  const [painAfter, setPainAfter] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const updateSet = (id: string, idx: number, patch: Partial<SetDraft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], sets: prev[id].sets.map((s, i) => (i === idx ? { ...s, ...patch } : s)) } }));

  const addSet = (id: string) =>
    setDrafts((prev) => {
      const last = prev[id].sets[prev[id].sets.length - 1] ?? { reps: "0", weight: "" };
      return { ...prev, [id]: { ...prev[id], sets: [...prev[id].sets, { ...last }] } };
    });

  const removeSet = (id: string) =>
    setDrafts((prev) => (prev[id].sets.length <= 1 ? prev : { ...prev, [id]: { ...prev[id], sets: prev[id].sets.slice(0, -1) } }));

  const toggleDone = (id: string) => setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], done: !prev[id].done } }));

  const anyDone = exercises.some((se) => drafts[se.id]?.done);
  const canSubmit = anyDone && rpe !== null && !isSaving;

  const submit = async () => {
    if (!loggedInPatient || !canSubmit) return;

    const performance: SessionPerformanceEntry[] = [];
    if (!isAmrap) {
      exercises.forEach((se) => {
        const draft = drafts[se.id];
        if (!draft?.done) return;
        draft.sets.forEach((s, idx) => {
          const weight = parseWeightInput(s.weight);
          performance.push({
            exercise_id: se.exercise.id,
            set_number: idx + 1,
            reps: Math.max(0, parseInt(s.reps) || 0),
            ...(weight !== null && weight > 0 ? { weight_kg: weight } : {}),
          });
        });
      });
    }

    setIsSaving(true);
    const { error } = await supabase.from("workout_logs").insert([
      {
        patient_id: loggedInPatient.id,
        category: title,
        rpe,
        pain_before: null,
        pain_after: isClinical ? painAfter : null,
        performance_data: performance.length > 0 ? JSON.stringify(performance) : null,
        result_rounds: isAmrap && rounds !== "" ? Math.max(0, parseInt(rounds) || 0) : null,
        result_extra_reps: isAmrap && extraReps !== "" ? Math.max(0, parseInt(extraReps) || 0) : null,
        is_quick_log: true,
      },
    ]);
    setIsSaving(false);

    if (error) {
      console.error(error);
      alert(`שגיאה: ${error.message}`);
      return;
    }
    setIsDone(true);
    onLogged();
  };

  if (isDone) {
    return (
      <Modal onClose={onClose} title="תיעוד אימון" icon={<ClipboardCheck size={20} className="text-accent-fg" />}>
        <div className="flex flex-col items-center text-center gap-3 py-8">
          <div className="w-16 h-16 rounded-full bg-accent/15 text-accent-fg flex items-center justify-center">
            <Check size={32} />
          </div>
          <h4 className="text-2xl font-black text-fg">האימון נשמר!</h4>
          <p className="text-muted text-sm">הנתונים נוספו למעקב שלך.</p>
          <button
            onClick={onClose}
            className="mt-4 bg-btn-primary text-btn-primary-fg hover:bg-btn-primary-hover active:bg-btn-primary-active px-10 py-3.5 rounded-full font-black"
          >
            סגירה
          </button>
        </div>
      </Modal>
    );
  }

  const inputClass =
    "w-full bg-surface border border-line-input rounded-xl px-2 py-2 text-center text-sm font-bold text-fg tabular-nums outline-none focus:border-focus focus:ring-2 focus:ring-focus placeholder:text-muted";

  return (
    <Modal onClose={onClose} title="תיעוד אימון שביצעתי" icon={<ClipboardCheck size={20} className="text-accent-fg" />}>
      <p className="text-muted text-sm mb-5">
        ביצעת את <strong className="text-fg">{title}</strong> בלי להפעיל את האימון באפליקציה? רשום כאן מה עשית וזה ייכנס למעקב שלך. משקל — רק אם רלוונטי.
      </p>

      {isAmrap && (
        <div className="on-light bg-surface-alt rounded-2xl p-4 mb-5 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold text-muted">סבבים מלאים</span>
            <input type="number" inputMode="numeric" min={0} value={rounds} onChange={(e) => setRounds(e.target.value)} placeholder="0" className={inputClass} dir="ltr" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold text-muted">חזרות נוספות</span>
            <input type="number" inputMode="numeric" min={0} value={extraReps} onChange={(e) => setExtraReps(e.target.value)} placeholder="0" className={inputClass} dir="ltr" />
          </label>
        </div>
      )}

      <div className="flex flex-col gap-3 mb-6">
        {exercises.map((se) => {
          const draft = drafts[se.id];
          if (!draft) return null;
          const prescribedWeight = formatWeightKg(se.weight_kg);
          const previousWeight = formatWeightKg(previousWeights[se.exercise.id]);
          const unit = se.is_time ? "שניות" : "חזרות";
          return (
            <div key={se.id} className={`on-light rounded-2xl border p-4 transition-colors ${draft.done ? "bg-surface border-line" : "bg-surface-alt border-line opacity-60"}`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleDone(se.id)}
                  aria-pressed={draft.done}
                  aria-label={draft.done ? "סמן כלא בוצע" : "סמן כבוצע"}
                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center border transition-colors ${
                    draft.done ? "bg-accent border-accent text-on-accent" : "border-line-input text-transparent"
                  }`}
                >
                  <Check size={15} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-fg truncate">{getExerciseName(se.exercise, lang)}</div>
                  <div className="text-[11px] font-bold text-muted">
                    {isAmrap ? "בכל סבב: " : `יעד: ${se.sets} × `}
                    {se.is_time ? se.reps : formatRepTarget(se.reps, se.reps_max)} {unit}
                    {prescribedWeight && ` · ${prescribedWeight}`}
                    {previousWeight && ` · פעם קודמת: ${previousWeight}`}
                  </div>
                </div>
              </div>

              {/* Set inputs fold open/closed with the done toggle (the same
                  grid-template-rows 0fr -> 1fr trick as PlanTab's
                  CuratedFactCard) instead of popping in and making the list
                  jump. Always mounted so it can animate out; inert while
                  folded so its inputs aren't focusable. -mx-1/px-1 and pb-1
                  leave room for the inputs' focus ring inside the clip. */}
              {!isAmrap && (
                <div
                  inert={!draft.done}
                  className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out-strong motion-reduce:transition-opacity ${
                    draft.done ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                <div className="overflow-hidden -mx-1 px-1">
                <div className="pt-3.5 pb-1 flex flex-col gap-2">
                  <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-2 text-[10px] font-extrabold text-muted px-0.5">
                    <span>סט</span>
                    <span className="text-center">{unit}</span>
                    {!se.is_time && <span className="text-center">משקל (ק״ג)</span>}
                  </div>
                  {draft.sets.map((s, idx) => (
                    <div key={idx} className="grid grid-cols-[2.5rem_1fr_1fr] gap-2 items-center">
                      <span className="text-sm font-black text-muted tabular-nums">{idx + 1}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={s.reps}
                        onChange={(e) => updateSet(se.id, idx, { reps: e.target.value })}
                        aria-label={`${unit} בסט ${idx + 1}`}
                        className={inputClass}
                        dir="ltr"
                      />
                      {!se.is_time && (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={s.weight}
                          onChange={(e) => updateSet(se.id, idx, { weight: e.target.value })}
                          placeholder="—"
                          aria-label={`משקל בסט ${idx + 1} (לא חובה)`}
                          className={inputClass}
                          dir="ltr"
                        />
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => addSet(se.id)} className="flex items-center gap-1 text-accent-fg text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-accent/10">
                      <Plus size={13} /> סט
                    </button>
                    {draft.sets.length > 1 && (
                      <button onClick={() => removeSet(se.id)} className="flex items-center gap-1 text-muted text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-line">
                        <Minus size={13} /> סט
                      </button>
                    )}
                  </div>
                </div>
                </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-5">
        <div className="text-sm font-black text-fg mb-2.5">עד כמה קשה היה האימון? (RPE)</div>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => setRpe(n)}
              aria-pressed={rpe === n}
              className={`h-11 rounded-xl text-base font-black transition-all ${getRPEColor(n)} ${rpe === n ? "ring-4 ring-focus scale-105" : rpe !== null ? "opacity-50" : ""}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {isClinical && (
        <div className="mb-6">
          <div className="text-sm font-black text-fg mb-2.5">רמת כאב אחרי האימון (לא חובה)</div>
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => setPainAfter(painAfter === n ? null : n)}
                aria-pressed={painAfter === n}
                className={`h-10 rounded-xl text-sm font-black transition-all ${getPainColor(n)} ${painAfter === n ? "ring-4 ring-focus scale-105" : painAfter !== null ? "opacity-50" : ""}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 bg-btn-primary text-btn-primary-fg hover:bg-btn-primary-hover active:bg-btn-primary-active font-black text-lg py-4 rounded-full disabled:bg-disabled disabled:text-disabled-fg disabled:pointer-events-none"
      >
        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <ClipboardCheck size={18} />}
        שמור למעקב
      </button>
      {rpe === null && <p className="text-center text-xs text-muted mt-2">בחר RPE כדי לשמור</p>}
    </Modal>
  );
}
