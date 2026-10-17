"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { buildSessions } from "@/app/utils/programQueue";
import { getExerciseName } from "@/app/utils/format";
import ProgramDaysSheet from "@/app/components/ProgramDaysSheet";
import type { HydratedPatientExercise } from "@/app/hooks/useWorkoutSession";
import type { Lang } from "@/app/types";

interface AdminProgramDaysButtonProps {
  programName: string;
  rows: HydratedPatientExercise[]; // every patient_exercises row of the program, all weeks
  lang: Lang;
  onChanged: () => void;
}

const daysKey = (value: string | null | undefined) => (value ?? "").split(",").map((d) => d.trim()).filter(Boolean).sort().join(",");

// "עריכת תוכניות" → "ימים": move a patient's program workouts between
// weekdays only (ProgramDaysSheet). The workouts come from the latest week;
// the new days apply to every week — any row that was on a workout's old
// days moves to its new ones — so a program repeating the same week
// structure stays consistent. Admins update patient_exercises directly.
export default function AdminProgramDaysButton({ programName, rows, lang, onChanged }: AdminProgramDaysButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const latestWeek = Math.max(0, ...rows.map((r) => Number(r.week) || 0));
  const weekRows = rows.filter((r) => (Number(r.week) || 0) === latestWeek);
  const sessions = buildSessions(weekRows);

  const save = async (daysPerWorkout: string[][]) => {
    // old days (as stored) -> new days, from each workout's latest-week rows
    const remap = new Map<string, string | null>();
    sessions.forEach((session, i) => {
      const next = daysPerWorkout[i].length > 0 ? [...daysPerWorkout[i]].sort().join(",") : null;
      for (const r of session.rows) remap.set(daysKey(r.scheduled_days), next);
    });
    const idsByTarget = new Map<string, string[]>();
    for (const r of rows) {
      const key = daysKey(r.scheduled_days);
      if (!remap.has(key)) continue;
      const target = remap.get(key) ?? "";
      if (key === (target ?? "")) continue;
      idsByTarget.set(target, [...(idsByTarget.get(target) ?? []), String(r.id)]);
    }
    for (const [target, ids] of idsByTarget) {
      const { error } = await supabase.from("patient_exercises").update({ scheduled_days: target || null }).in("id", ids);
      if (error) {
        alert("שגיאה בשמירה: " + error.message);
        return false;
      }
    }
    onChanged();
    return true;
  };

  if (sessions.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-surface-alt border border-line text-fg px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-line transition-ui duration-150 ease-out active:scale-[0.98]"
      >
        <CalendarDays size={14} /> ימים
      </button>
      {isOpen && (
        <ProgramDaysSheet
          programName={programName}
          workouts={sessions.map((s, i) => ({
            label: `אימון ${i + 1}`,
            preview: s.rows
              .slice(0, 3)
              .map((r) => (r.exercise ? getExerciseName(r.exercise, lang) : ""))
              .filter(Boolean)
              .join(" · "),
            days: s.slotKeys,
          }))}
          onSave={save}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
