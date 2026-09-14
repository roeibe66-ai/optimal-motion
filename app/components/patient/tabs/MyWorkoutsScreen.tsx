"use client";

import { ChevronRight, Dumbbell, Plus, Trash2 } from "lucide-react";
import { DAYS_OF_WEEK, DEFAULT_DIY_CATEGORY_STYLE, DIY_CATEGORY_STYLES } from "@/app/constants/catalog";
import type { Exercise, SavedWorkout } from "@/app/types";

interface MyWorkoutsScreenProps {
  savedWorkouts: SavedWorkout[];
  exerciseCatalog: Exercise[];
  onBack: () => void;
  onStartWorkout: (workout: SavedWorkout) => void;
  onEditWorkout: (workout: SavedWorkout) => void;
  onDeleteWorkout: (id: string) => void;
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
export default function MyWorkoutsScreen({ savedWorkouts, exerciseCatalog, onBack, onStartWorkout, onEditWorkout, onDeleteWorkout }: MyWorkoutsScreenProps) {
  const handleDelete = (workout: SavedWorkout) => {
    if (confirm(`למחוק את "${workout.name}"? לא ניתן לשחזר את הפעולה.`)) {
      onDeleteWorkout(workout.id);
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
          <h2 className="text-xl md:text-2xl font-black text-stone-900 tracking-tight">האימונים שלי</h2>
          <p className="text-xs text-stone-500 mt-0.5">{savedWorkouts.length} אימונים עצמאיים שמורים</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {savedWorkouts.length === 0 ? (
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-10 flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mb-1.5">
              <Dumbbell size={26} />
            </div>
            <h3 className="text-lg font-black text-stone-900">עדיין לא שמרת אימונים עצמאיים</h3>
            <p className="text-stone-500 text-sm max-w-xs">בנה אימון מהמאגר הפתוח ושמור אותו כאן לשימוש חוזר בכל זמן.</p>
            <button
              onClick={onBack}
              className="mt-4 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-[13px] px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={16} />
              בנה אימון חדש
            </button>
          </div>
        ) : (
          <>
            {savedWorkouts.map((workout) => {
              const hydrated = workout.exercise_ids
                .map((id) => exerciseCatalog.find((ex) => ex.id === id))
                .filter((ex): ex is Exercise => !!ex);

              const categoryCounts = hydrated.reduce<Record<string, number>>((acc, ex) => {
                acc[ex.category] = (acc[ex.category] ?? 0) + 1;
                return acc;
              }, {});

              const dayLabel = DAYS_OF_WEEK.find((d) => d.id === workout.scheduled_day)?.label;

              return (
                <div key={workout.id} className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-4.5 flex flex-col gap-3.5">
                  <div className="flex justify-between items-start gap-2.5">
                    <div>
                      <div className="text-base font-black text-stone-900">{workout.name}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {hydrated.length} תרגילים · {relativeCreatedLabel(workout.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {dayLabel && (
                        <span className="bg-stone-100 text-stone-600 text-[11px] font-extrabold px-3 py-1.5 rounded-full whitespace-nowrap">
                          {dayLabel}
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(workout)}
                        aria-label="מחק אימון"
                        className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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

                  <div className="flex gap-2.5">
                    <button
                      onClick={() => onStartWorkout(workout)}
                      className="flex-[1.4] bg-teal-500 text-stone-950 font-black text-[13px] py-3 rounded-2xl hover:bg-teal-400 transition-colors"
                    >
                      התחל אימון
                    </button>
                    <button
                      onClick={() => onEditWorkout(workout)}
                      className="flex-1 bg-transparent border-[1.5px] border-stone-200 text-stone-600 font-bold text-[13px] py-3 rounded-2xl hover:bg-stone-50 transition-colors"
                    >
                      ערוך
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={onBack}
              className="w-full bg-teal-500/[0.08] border-[1.5px] border-dashed border-teal-500/35 text-teal-700 font-extrabold text-[13px] py-4 rounded-[1.25rem] flex items-center justify-center gap-2 hover:bg-teal-500/[0.12] transition-colors"
            >
              <Plus size={16} />
              בנה אימון חדש
            </button>
          </>
        )}
      </div>
    </div>
  );
}
