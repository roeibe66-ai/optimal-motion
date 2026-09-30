"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { getExerciseName } from "@/app/utils/format";
import type { Exercise, SavedProgram } from "@/app/types";

interface ExportPdfButtonProps {
  program: SavedProgram;
  exerciseCatalog: Exercise[];
}

// Splits a patient_cues/common_mistake column ("plain text, one point per
// line" per app/types/index.ts) into its display lines — same convention
// formatCueLines (app/utils/format.ts) uses for the ✅/❌ list elsewhere,
// duplicated here rather than imported since that helper returns react nodes
// pre-bound to one emoji, and this print sheet needs both lists side by side.
function cueLines(text: string | undefined): string[] {
  return (text ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
}

// Patient-facing PDF/print export for a saved DIY program (patient_saved_programs).
// Gated the same way as the admin's ProgramPdfExport, adapted to this app's
// real schema: there's no `profiles.account_type`/generic `program.created_by`
// — the equivalent fields are patients.patient_type ('clinical' | 'fitness')
// and SavedProgram.patient_id. Clinical patients can always export (their
// program is what a clinician needs on hand); fitness patients only for a
// program they themselves authored, i.e. this exact SavedProgram row already
// belongs to them (every row useSavedPrograms fetches is patient_id-scoped to
// the logged-in patient, so in practice this is never false today — the
// ownership check is kept anyway since it's the actual access rule asked
// for, not just the currently-reachable case).
//
// Printing goes through the browser's native print dialog (Save as PDF), not
// a PDF-generation library — same choice ProgramPdfExport.tsx made and for
// the same reason: this app is Hebrew/RTL, and the browser's own text engine
// gets bidi + the app's real font for free. Unlike that admin component
// (which hides the whole page and reveals one white overlay via inline
// CSS), this one uses plain Tailwind `print:` modifiers directly on the
// sheet below, since the patient app is already a light theme end to end —
// there's no dark chrome to strip, just shadows/rounded-card chrome that
// belongs on screen but not on paper.
export default function ExportPdfButton({ program, exerciseCatalog }: ExportPdfButtonProps) {
  const { loggedInPatient } = useAuth();
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!isPrinting) return;
    window.print();
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [isPrinting]);

  if (!loggedInPatient) return null;
  const canExport = loggedInPatient.patient_type === "clinical" || (loggedInPatient.patient_type === "fitness" && program.patient_id === loggedInPatient.id);
  if (!canExport) return null;

  const days = [...program.days].sort((a, b) => a.day_number - b.day_number);

  return (
    <>
      <button
        onClick={() => setIsPrinting(true)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-muted hover:text-accent-fg transition-colors print:hidden"
      >
        <Printer size={13} />
        ייצוא PDF
      </button>

      {isPrinting && (
        <div className="scheme-paper hidden print:block print:bg-surface print:text-fg fixed inset-0 z-[999] p-8" dir="rtl">
          <style>{`@page { margin: 14mm; }`}</style>

          <div className="flex items-start justify-between pb-4 border-b-2 border-fg print:shadow-none">
            <div>
              <h1 className="text-2xl font-black">{program.name}</h1>
              <p className="text-xs text-muted mt-1">{days.length} ימים</p>
            </div>
            <div className="text-left text-xs text-muted shrink-0">
              <div>הופק בתאריך</div>
              <div className="font-bold">{new Date().toLocaleDateString("he-IL")}</div>
            </div>
          </div>

          <div className="mt-6 space-y-8">
            {days.map((day) => {
              const dayExercises = day.exercise_ids.map((id) => exerciseCatalog.find((e) => e.id === id)).filter((e): e is Exercise => !!e);
              return (
                <div key={day.day_number} className="break-inside-avoid">
                  <h2 className="text-base font-extrabold border-b border-line pb-1.5 mb-3">יום {day.day_number}</h2>

                  {dayExercises.length === 0 ? (
                    <p className="text-sm text-muted">אין תרגילים ביום זה.</p>
                  ) : (
                    <div className="space-y-4">
                      {dayExercises.map((exercise) => {
                        const dos = cueLines(exercise.patient_cues);
                        const donts = cueLines(exercise.common_mistake);
                        return (
                          <div key={exercise.id} className="break-inside-avoid">
                            <h3 className="font-bold text-sm">{getExerciseName(exercise, "he")}</h3>
                            {exercise.description && <p className="text-xs text-muted mt-1">{exercise.description}</p>}

                            {(dos.length > 0 || donts.length > 0) && (
                              <div className="mt-1.5 grid grid-cols-2 gap-3">
                                {dos.length > 0 && (
                                  <ul className="space-y-0.5">
                                    {dos.map((line, i) => (
                                      <li key={i} className="text-xs flex items-start gap-1.5">
                                        <span aria-hidden>✅</span>
                                        <span>{line}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {donts.length > 0 && (
                                  <ul className="space-y-0.5">
                                    {donts.map((line, i) => (
                                      <li key={i} className="text-xs flex items-start gap-1.5">
                                        <span aria-hidden>❌</span>
                                        <span>{line}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
