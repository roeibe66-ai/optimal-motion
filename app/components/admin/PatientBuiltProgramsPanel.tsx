"use client";

import { useEffect, useState } from "react";
import { Hammer } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import type { Exercise, SavedProgram } from "@/app/types";
import { getExerciseName } from "@/app/utils/format";

interface PatientBuiltProgramsPanelProps {
  patientId: string;
  exercises: Exercise[];
  lang: "he" | "en";
}

// Read-only: the programs the patient built themselves in the DIY builder
// (patient_saved_programs — RLS already lets the admin read them; nothing
// in the console showed them before).
export default function PatientBuiltProgramsPanel({ patientId, exercises, lang }: PatientBuiltProgramsPanelProps) {
  const [programs, setPrograms] = useState<SavedProgram[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("patient_saved_programs")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setPrograms((data ?? []) as SavedProgram[]);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const nameOf = (id: string) => {
    const ex = exercises.find((e) => e.id === id);
    return ex ? getExerciseName(ex, lang) : "תרגיל שהוסר";
  };

  if (programs === null) return null;

  return (
    <section className="space-y-4">
      <div className="border-b border-line pb-3">
        <h3 className="text-xl font-black text-fg flex items-center gap-2">
          <Hammer size={18} className="text-accent-fg" /> תוכניות שהמטופל בנה בעצמו
        </h3>
        <p className="text-xs font-bold text-muted mt-0.5">מבונה האימונים באפליקציה · לצפייה בלבד</p>
      </div>

      {programs.length === 0 ? (
        <p className="on-light text-sm text-muted bg-surface-alt rounded-2xl border border-line p-5">המטופל עדיין לא שמר תוכניות משלו.</p>
      ) : (
        programs.map((program) => (
          <div key={program.id} className="on-light border border-line p-5 rounded-2xl bg-surface-alt">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h4 className="text-lg font-black text-fg">{program.name}</h4>
              <span className="text-xs font-bold text-muted">נוצרה {new Date(program.created_at).toLocaleDateString("he-IL")}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[...program.days]
                .sort((a, b) => a.day_number - b.day_number)
                .map((day) => (
                  <div key={day.day_number} className="on-light bg-surface rounded-xl border border-line p-3">
                    <div className="text-xs font-extrabold text-accent-fg mb-2">יום {day.day_number}</div>
                    <ol className="space-y-1 text-sm">
                      {day.exercise_ids.map((id, idx) => {
                        const p = day.prescriptions?.[idx];
                        return (
                          <li key={`${id}-${idx}`} className="flex justify-between gap-3">
                            <span className="text-fg font-bold truncate">{nameOf(id)}</span>
                            {p && (
                              <span className="text-muted text-xs shrink-0 tabular-nums">
                                {p.sets}×{p.reps}
                                {p.is_time ? " שנ׳" : ""} · {p.rest_time_seconds} שנ׳ מנוחה
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
