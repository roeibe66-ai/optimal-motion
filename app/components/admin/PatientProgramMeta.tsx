"use client";

import { useState } from "react";
import { History, Loader2, UserPen } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import type { Exercise, PatientProgram } from "@/app/types";
import { getExerciseName } from "@/app/utils/format";
import { DAYS_OF_WEEK } from "@/app/constants/catalog";

interface PatientProgramMetaProps {
  program: PatientProgram;
  hasFixedDays: boolean; // its rows are on weekdays — the goal is then those days
  exercises: Exercise[];
  lang: "he" | "en";
  onChanged: () => void; // refetch the patient's programs/rows
}

type OriginalRow = { exercise_id: string; week: number | null; scheduled_days: string | null; sets: number; reps: number; is_time: boolean };

// Under a program's title in "עריכת תוכניות פעילות": for a program with no
// fixed days, its weekly goal (flexible — "3 times a week", any days); and,
// once the patient has edited it themselves, a badge with the original
// version and a one-click restore (admin_restore_program_original).
export default function PatientProgramMeta({ program, hasFixedDays, exercises, lang, onChanged }: PatientProgramMetaProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const setWeeklyTarget = async (value: string) => {
    setIsBusy(true);
    const { error } = await supabase
      .from("patient_programs")
      .update({ weekly_target: value === "" ? null : Number(value) })
      .eq("id", program.id);
    setIsBusy(false);
    if (error) alert("שגיאה בשמירת היעד השבועי: " + error.message);
    else onChanged();
  };

  const restore = async () => {
    if (!confirm(`להחזיר את "${program.name}" לגרסה ששייכת? השינויים שהמטופל עשה יימחקו.`)) return;
    setIsBusy(true);
    const { error } = await supabase.rpc("admin_restore_program_original", { p_program_id: program.id });
    setIsBusy(false);
    if (error) alert("שגיאה בשחזור: " + error.message);
    else onChanged();
  };

  const originalRows = (program.original_rows ?? []) as unknown as OriginalRow[];
  const exerciseName = (id: string) => {
    const ex = exercises.find((e) => e.id === id);
    return ex ? getExerciseName(ex, lang) : "תרגיל שהוסר";
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      {!hasFixedDays && (
      <label className="flex items-center gap-2 text-xs font-bold text-muted">
        בלי ימים קבועים — יעד שבועי:
        <select
          value={program.weekly_target ?? ""}
          disabled={isBusy}
          onChange={(e) => setWeeklyTarget(e.target.value)}
          className="on-light bg-surface-alt border border-line rounded-lg px-2 py-1 text-fg font-bold outline-none focus:border-focus focus:ring-2 focus:ring-focus"
        >
          <option value="">כל יום</option>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n === 1 ? "פעם בשבוע" : `${n} פעמים בשבוע`}
            </option>
          ))}
        </select>
        {isBusy && <Loader2 size={14} className="animate-spin" />}
      </label>
      )}

      {program.patient_edited_at && (
        <div className="on-light bg-warm/10 border border-warm/30 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-warm-fg">
              <UserPen size={14} />
              נערך ע״י המטופל · {new Date(program.patient_edited_at).toLocaleDateString("he-IL")}
            </span>
            <div className="flex gap-2">
              {originalRows.length > 0 && (
                <button onClick={() => setShowOriginal((v) => !v)} className="text-xs font-bold text-fg bg-surface border border-line px-3 py-1.5 rounded-lg hover:bg-line">
                  {showOriginal ? "הסתר מקור" : "הצג מה ששייכת"}
                </button>
              )}
              <button
                onClick={restore}
                disabled={isBusy}
                className="flex items-center gap-1.5 text-xs font-bold text-fg bg-surface border border-line px-3 py-1.5 rounded-lg hover:bg-line disabled:opacity-50"
              >
                <History size={13} /> שחזר למקור
              </button>
            </div>
          </div>
          {showOriginal && (
            <ul className="text-xs text-muted space-y-1">
              {originalRows.map((r, i) => (
                <li key={i}>
                  <strong className="text-fg">{exerciseName(r.exercise_id)}</strong> · {r.sets}×{r.reps}
                  {r.is_time ? " שנ׳" : ""}
                  {r.week != null ? ` · שבוע ${r.week}` : ""}
                  {r.scheduled_days
                    ? ` · ${r.scheduled_days
                        .split(",")
                        .map((d) => DAYS_OF_WEEK.find((s) => s.id === d)?.label)
                        .filter(Boolean)
                        .join(", ")}`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
