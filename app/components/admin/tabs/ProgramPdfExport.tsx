"use client";

import { Printer, X } from "lucide-react";
import { DAYS_OF_WEEK } from "@/app/constants/catalog";
import { getExerciseName } from "@/app/utils/format";
import type { Exercise, Package, PackageExercise } from "@/app/types";

interface ProgramPdfExportProps {
  pkg: Package;
  packageExercises: PackageExercise[];
  exerciseCatalog: Exercise[];
  onClose: () => void;
}

const BRAND = "var(--accent-fg)";

type HydratedRow = PackageExercise & { exercise: Exercise };

const dayLabel = (dayId: string) => DAYS_OF_WEEK.find((d) => d.id === dayId)?.label;

const formatTempo = (row: PackageExercise) => {
  const { tempo_eccentric: e, tempo_pause: p, tempo_concentric: c } = row;
  if (e == null && p == null && c == null) return "—";
  return `${e ?? "-"}-${p ?? "-"}-${c ?? "-"}`;
};

// Admin Program Library's PDF export: a "Print-Friendly Light Mode" document
// — pure white background, dark text, emerald accents — rendered regardless
// of the console's own dark theme, then handed to the browser's native print
// dialog (Save as PDF) rather than a PDF-generation library. Chosen over
// @react-pdf/renderer specifically because this app is Hebrew/RTL: the
// browser's own text engine gets bidi and the app's actual font for free,
// where react-pdf would need manual glyph/font handling for Hebrew. The
// print-only visibility trick below (hide everything, then reveal just this
// subtree) means the printed page never includes the admin chrome behind it.
export default function ProgramPdfExport({ pkg, packageExercises, exerciseCatalog, onClose }: ProgramPdfExportProps) {
  const rows: HydratedRow[] = packageExercises
    .map((pe) => {
      const exercise = exerciseCatalog.find((e) => e.id === pe.exercise_id);
      return exercise ? { ...pe, exercise } : null;
    })
    .filter((r): r is HydratedRow => r !== null);

  const weeks = Array.from(new Set(rows.map((r) => r.week || 1))).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-[300] bg-scrim/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-10 print:p-0 print:bg-surface print:block print:static print:overflow-visible">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #om-pdf-export, #om-pdf-export * { visibility: visible; }
          #om-pdf-export { position: absolute; inset: 0; box-shadow: none !important; border: none !important; border-radius: 0 !important; }
          @page { margin: 14mm; }
        }
      `}</style>

      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-end gap-2 mb-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-btn-primary text-btn-primary-fg text-sm font-extrabold hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors"
          >
            <Printer size={16} /> הדפס / שמור כ-PDF
          </button>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-fg/10 text-fg flex items-center justify-center hover:bg-fg/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div id="om-pdf-export" className="scheme-paper bg-surface text-fg rounded-2xl shadow-elevated p-10 md:p-14" dir="rtl">
          <div className="flex items-start justify-between pb-6 border-b-2" style={{ borderColor: BRAND }}>
            <div>
              <div className="text-xs font-black tracking-[0.3em] uppercase" style={{ color: BRAND }}>
                Optimal<span className="text-fg">Motion</span>
              </div>
              <h1 className="text-3xl font-black text-fg mt-3">{pkg.title}</h1>
              {pkg.description && <p className="text-muted mt-1.5 max-w-lg">{pkg.description}</p>}
            </div>
            <div className="text-left text-xs text-muted shrink-0">
              <div>הופק בתאריך</div>
              <div className="font-bold text-muted">{new Date().toLocaleDateString("he-IL")}</div>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="text-muted text-center py-14">לתבנית הזו עדיין אין תרגילים.</p>
          ) : (
            <div className="mt-8 space-y-10">
              {weeks.map((week) => {
                const weekRows = rows.filter((r) => (r.week || 1) === week);
                const dayIds = Array.from(new Set(weekRows.map((r) => r.scheduled_days || "all"))).sort();

                return (
                  <div key={week} className="break-inside-avoid">
                    {weeks.length > 1 && (
                      <h2 className="text-lg font-black mb-4" style={{ color: BRAND }}>
                        שבוע {week}
                      </h2>
                    )}
                    <div className="space-y-6">
                      {dayIds.map((dayId) => {
                        const dayRows = weekRows
                          .filter((r) => (r.scheduled_days || "all") === dayId)
                          .sort((a, b) => (a.block || "A").localeCompare(b.block || "A"));

                        return (
                          <div key={dayId} className="break-inside-avoid">
                            <h3 className="text-sm font-extrabold text-fg mb-2 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BRAND }} />
                              {dayLabel(dayId) ? `יום ${dayLabel(dayId)}` : "כל השבוע"}
                            </h3>
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="border-b-2" style={{ borderColor: BRAND }}>
                                  <th className="text-right py-2 font-extrabold text-muted text-xs uppercase tracking-wide">תרגיל</th>
                                  <th className="text-center py-2 font-extrabold text-muted text-xs uppercase tracking-wide">סטים</th>
                                  <th className="text-center py-2 font-extrabold text-muted text-xs uppercase tracking-wide">יעד</th>
                                  <th className="text-center py-2 font-extrabold text-muted text-xs uppercase tracking-wide">RIR</th>
                                  <th className="text-center py-2 font-extrabold text-muted text-xs uppercase tracking-wide">טמפו</th>
                                  <th className="text-center py-2 font-extrabold text-muted text-xs uppercase tracking-wide">מנוחה</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dayRows.map((row) => (
                                  <tr key={row.id} className="border-b border-line">
                                    <td className="py-2.5 font-bold text-fg">
                                      {getExerciseName(row.exercise, "he")}
                                      {row.block && row.block !== "A" && <span className="text-muted font-medium mr-1.5">· בלוק {row.block}</span>}
                                    </td>
                                    <td className="py-2.5 text-center text-fg tabular-nums">{row.sets}</td>
                                    <td className="py-2.5 text-center text-fg tabular-nums">
                                      {row.reps} {row.is_time ? "שנ׳" : "חז׳"}
                                    </td>
                                    <td className="py-2.5 text-center text-fg tabular-nums">{row.rir ?? "—"}</td>
                                    <td className="py-2.5 text-center text-fg tabular-nums">{formatTempo(row)}</td>
                                    <td className="py-2.5 text-center text-fg tabular-nums">{row.rest_time_seconds ?? 60}s</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-line text-center text-[10px] text-muted tracking-wide">
            נבנה באמצעות OptimalMotion · תוכנית אישית מבוססת ראיות
          </div>
        </div>
      </div>
    </div>
  );
}
