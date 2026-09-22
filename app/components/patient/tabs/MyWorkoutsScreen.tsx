"use client";

import { ChevronRight, Dumbbell, Play, Plus, Trash2 } from "lucide-react";
import { DEFAULT_DIY_CATEGORY_STYLE, DIY_CATEGORY_STYLES } from "@/app/constants/catalog";
import type { Exercise, SavedProgram } from "@/app/types";

interface MyWorkoutsScreenProps {
  savedPrograms: SavedProgram[];
  exerciseCatalog: Exercise[];
  onBack: () => void;
  onStartProgramDay: (program: SavedProgram, dayNumber: number) => void;
  onEditProgram: (program: SavedProgram) => void;
  onDeleteProgram: (id: string) => void;
}

// Relative-time label matching the mockup's "נוצר לפני X" copy — this app has
// no i18n library, so it's a small hand-rolled Hebrew formatter rather than
// pulling in a dependency for one string.
function relativeCreatedLabel(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days <= 0) return "נוצר היום";
  if (days === 1) return "נוצר אתמול";
  if (days < 7) return `נוצר לפני ${days} ימים`;
  const weeks = Math.round(days / 7);
  if (weeks === 1) return "נוצר לפני שבוע";
  if (weeks < 4) return `נוצר לפני ${weeks} שבועות`;
  const months = Math.max(1, Math.round(days / 30));
  return months === 1 ? "נוצר לפני חודש" : `נוצר לפני ${months} חודשים`;
}

// Boutique-clinic light theme (white cards, soft shadow, emerald accent) —
// this screen originally assumed the app's old dark backdrop (text-white
// headings, bg-[#1c1c1e] cards), which the rest of the patient app has
// since moved off of; the page it actually renders on is #FDFBF7.
//
// Each program can hold several ordinal days (Day 1, Day 2, ...), so
// "start" is a row of day pills rather than one button — picking a pill
// starts that specific day's exercises as a live session.
export default function MyWorkoutsScreen({ savedPrograms, exerciseCatalog, onBack, onStartProgramDay, onEditProgram, onDeleteProgram }: MyWorkoutsScreenProps) {
  const handleDelete = (program: SavedProgram) => {
    if (confirm(`למחוק את "${program.name}"? לא ניתן לשחזר את הפעולה.`)) {
      onDeleteProgram(program.id);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-[38px] h-[38px] rounded-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-center shrink-0 hover:bg-stone-50 active:scale-90 transition-all duration-150 ease-out"
        >
          {/* ChevronRight, not Left: this is a "back" action, and in RTL that points right */}
          <ChevronRight size={16} className="text-stone-700" />
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-black text-stone-900 tracking-tight">התוכניות שלי</h2>
          <p className="text-xs text-stone-500 mt-0.5">{savedPrograms.length} תוכניות שבועיות שמורות</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {savedPrograms.length === 0 ? (
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-10 flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mb-1.5">
              <Dumbbell size={26} />
            </div>
            <h3 className="text-lg font-black text-stone-900">עדיין לא שמרת תוכניות אימון</h3>
            <p className="text-stone-500 text-sm max-w-xs">בנה תוכנית שבועית מהמאגר הפתוח ושמור אותה כאן לשימוש חוזר בכל זמן.</p>
            <button
              onClick={onBack}
              className="mt-4 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-[13px] px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={16} />
              בנה תוכנית חדשה
            </button>
          </div>
        ) : (
          <>
            {savedPrograms.map((program) => {
              const days = [...program.days].sort((a, b) => a.day_number - b.day_number);
              const hydratedByDay = days.map((d) => ({
                day_number: d.day_number,
                exercises: d.exercise_ids.map((id) => exerciseCatalog.find((ex) => ex.id === id)).filter((ex): ex is Exercise => !!ex),
              }));
              const totalExerciseCount = hydratedByDay.reduce((acc, d) => acc + d.exercises.length, 0);

              const categoryCounts = hydratedByDay
                .flatMap((d) => d.exercises)
                .reduce<Record<string, number>>((acc, ex) => {
                  ex.categories.forEach((cat) => {
                    acc[cat] = (acc[cat] ?? 0) + 1;
                  });
                  return acc;
                }, {});

              return (
                <div key={program.id} className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-4.5 flex flex-col gap-3.5">
                  <div className="flex justify-between items-start gap-2.5">
                    <div>
                      <div className="text-base font-black text-stone-900">{program.name}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {days.length} ימים · {totalExerciseCount} תרגילים · {relativeCreatedLabel(program.created_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(program)}
                      aria-label="מחק תוכנית"
                      className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(categoryCounts).map(([cat, count]) => {
                      const style = DIY_CATEGORY_STYLES[cat] ?? DEFAULT_DIY_CATEGORY_STYLE;
                      return (
                        <span
                          key={cat}
                          className="flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full"
                          style={{ color: style.text, background: style.bg }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: style.text }}></span>
                          {cat} · {count}
                        </span>
                      );
                    })}
                  </div>

                  {/* One "start" pill per day — a program with several days
                      has no single "start" action, so each day gets its own
                      button rather than picking one implicitly. */}
                  <div className="flex flex-wrap gap-2">
                    {hydratedByDay.map((d) => (
                      <button
                        key={d.day_number}
                        onClick={() => onStartProgramDay(program, d.day_number)}
                        className="flex items-center gap-1.5 bg-teal-500 text-stone-950 font-black text-[12px] py-2.5 px-3.5 rounded-2xl hover:bg-teal-400 transition-colors"
                      >
                        <Play size={12} fill="currentColor" />
                        יום {d.day_number} ({d.exercises.length})
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => onEditProgram(program)}
                    className="w-full bg-transparent border-[1.5px] border-stone-200 text-stone-600 font-bold text-[13px] py-3 rounded-2xl hover:bg-stone-50 transition-colors"
                  >
                    ערוך תוכנית
                  </button>
                </div>
              );
            })}

            <button
              onClick={onBack}
              className="w-full bg-teal-500/[0.08] border-[1.5px] border-dashed border-teal-500/35 text-teal-700 font-extrabold text-[13px] py-4 rounded-[1.25rem] flex items-center justify-center gap-2 hover:bg-teal-500/[0.12] transition-colors"
            >
              <Plus size={16} />
              בנה תוכנית חדשה
            </button>
          </>
        )}
      </div>
    </div>
  );
}
