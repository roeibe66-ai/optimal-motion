"use client";

import type { Dispatch, SetStateAction } from "react";
import { Bookmark, ChevronDown, Folder, Plus, X } from "lucide-react";
import { AVAILABLE_MUSCLES, DAYS_OF_WEEK, DEFAULT_DIY_CATEGORY_STYLE, DIY_CATEGORY_STYLES, EQUIPMENT_LIST } from "@/app/constants/catalog";
import type { Exercise } from "@/app/types";

interface DiyBuilderTabProps {
  exerciseCatalog: Exercise[];
  diyMuscleFilter: string;
  setDiyMuscleFilter: (value: string) => void;
  diyEquipFilter: string;
  setDiyEquipFilter: (value: string) => void;
  diyCategoryFilter: string;
  setDiyCategoryFilter: (value: string) => void;
  diySelectedExercises: Exercise[];
  setDiySelectedExercises: Dispatch<SetStateAction<Exercise[]>>;
  diyScheduleDay: string;
  setDiyScheduleDay: (value: string) => void;
  diyWorkoutName: string;
  setDiyWorkoutName: (value: string) => void;
  onStartDiyWorkoutNow: () => void;
  onOpenMyWorkouts: () => void;
  onSaveDiyWorkout: () => void;
  isEditingSavedWorkout: boolean;
  onCancelEditSavedWorkout: () => void;
}

// The "build your own workout" picker: filter the catalog by muscle/
// equipment, collect exercises, then hand off to the session as a DIY workout.
//
// FIXED: this used to also gate on `!loggedInPatient?.premium_tracks`, which
// is falsy for an *empty string* too — new fitness patients register with
// `premium_tracks: ""`, so that filter hid every exercise for them. The
// gate it was guarding for (`hasAccess`) was hardcoded `true` and never
// actually restricted anything, so for this MVP the catalog is simply
// shown in full, filtered only by the muscle/equipment pickers below.
export default function DiyBuilderTab({
  exerciseCatalog,
  diyMuscleFilter,
  setDiyMuscleFilter,
  diyEquipFilter,
  setDiyEquipFilter,
  diyCategoryFilter,
  setDiyCategoryFilter,
  diySelectedExercises,
  setDiySelectedExercises,
  diyScheduleDay,
  setDiyScheduleDay,
  diyWorkoutName,
  setDiyWorkoutName,
  onStartDiyWorkoutNow,
  onOpenMyWorkouts,
  onSaveDiyWorkout,
  isEditingSavedWorkout,
  onCancelEditSavedWorkout,
}: DiyBuilderTabProps) {
  // Category chips are derived from whatever values actually exist in the
  // live catalog (not hardcoded to the mockup's 4), so an exercise tagged
  // with a category outside that set (e.g. a legacy value) still gets a
  // working filter chip instead of becoming unreachable — it just falls
  // back to DEFAULT_DIY_CATEGORY_STYLE's neutral color.
  const availableCategories = Array.from(new Set(exerciseCatalog.map((ex) => ex.category).filter(Boolean)));

  const availableExercises = exerciseCatalog.filter((ex) => {
    const matchMuscle = diyMuscleFilter === "all" || ex.target_muscle === diyMuscleFilter;
    const matchEquip =
      diyEquipFilter === "all" ||
      (ex.description && ex.description.includes(EQUIPMENT_LIST.find((e) => e.id === diyEquipFilter)?.label || "")) ||
      (ex.title && ex.title.includes(EQUIPMENT_LIST.find((e) => e.id === diyEquipFilter)?.label || ""));
    const matchCategory = diyCategoryFilter === "all" || ex.category === diyCategoryFilter;

    return matchMuscle && matchEquip && matchCategory;
  });

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1.5">בנה אימון עצמאי</h2>
          <p className="text-stone-400 text-[13px] md:text-sm">בחר תרגילים מהמאגר הפתוח שלך כדי ליצור אימון מותאם.</p>
        </div>
        <button
          onClick={onOpenMyWorkouts}
          className="shrink-0 mt-0.5 flex items-center gap-1.5 bg-[#1c1c1e] border border-stone-800 text-stone-300 font-bold text-[11px] px-3 py-2.5 rounded-full whitespace-nowrap hover:border-stone-700 transition-colors"
        >
          <Folder size={14} className="text-teal-400" />
          האימונים שלי
        </button>
      </div>

      {/* Filters for DIY */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-2">
        <div className="relative shrink-0">
          <select
            value={diyMuscleFilter}
            onChange={(e) => setDiyMuscleFilter(e.target.value)}
            className="appearance-none bg-[#1c1c1e] border border-stone-800 text-stone-300 rounded-full pl-8 pr-4 py-2.5 outline-none font-bold text-xs focus:border-teal-500"
          >
            <option value="all">כל השרירים</option>
            {AVAILABLE_MUSCLES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        </div>

        <div className="relative shrink-0">
          <select
            value={diyEquipFilter}
            onChange={(e) => setDiyEquipFilter(e.target.value)}
            className="appearance-none bg-[#1c1c1e] border border-stone-800 text-stone-300 rounded-full pl-8 pr-4 py-2.5 outline-none font-bold text-xs focus:border-teal-500"
          >
            <option value="all">כל הציוד</option>
            {EQUIPMENT_LIST.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.label}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-4">
        <button
          onClick={() => setDiyCategoryFilter("all")}
          className={`shrink-0 whitespace-nowrap font-black text-xs px-4 py-2 rounded-full transition-colors ${
            diyCategoryFilter === "all" ? "bg-teal-500 text-stone-950" : "bg-[#1c1c1e] border border-stone-800 text-stone-400"
          }`}
        >
          הכל
        </button>
        {availableCategories.map((cat) => {
          const style = DIY_CATEGORY_STYLES[cat] ?? DEFAULT_DIY_CATEGORY_STYLE;
          const isSelected = diyCategoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setDiyCategoryFilter(cat)}
              className="shrink-0 whitespace-nowrap font-extrabold text-xs px-4 py-2 rounded-full transition-colors"
              style={
                isSelected
                  ? { background: style.text, color: "#0c0a09" }
                  : { background: style.bg, border: `1px solid ${style.border}`, color: style.text }
              }
            >
              {cat}
            </button>
          );
        })}
      </div>

      {diySelectedExercises.length > 0 && (
        <div className="bg-teal-500/[0.08] border border-teal-500/25 p-4 rounded-3xl mb-8 flex flex-col gap-3.5 sticky top-20 z-30 backdrop-blur-xl shadow-2xl">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-teal-400 text-[13px]">
              {isEditingSavedWorkout ? "עריכת אימון שמור" : "האימון שייבנה"} ({diySelectedExercises.length} תרגילים)
            </h4>
            <div className="flex items-center gap-3">
              {isEditingSavedWorkout && (
                <button onClick={onCancelEditSavedWorkout} className="text-[11px] font-bold text-stone-400 hover:text-stone-300">
                  ביטול עריכה
                </button>
              )}
              <button onClick={() => setDiySelectedExercises([])} className="text-[11px] font-bold text-stone-400 hover:text-stone-300">
                נקה הכל
              </button>
            </div>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
            {diySelectedExercises.map((ex, idx) => (
              <div key={idx} className="bg-[#1c1c1e] border border-stone-800 rounded-2xl p-2 flex items-center gap-2 min-w-[140px] relative">
                <button
                  onClick={() => setDiySelectedExercises((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md"
                >
                  <X size={8} strokeWidth={3} />
                </button>
                {ex.gif_url ? (
                  ex.gif_url.toLowerCase().includes(".mp4") || ex.gif_url.toLowerCase().includes(".webm") ? (
                    <video src={ex.gif_url} className="w-9 h-9 rounded-[10px] bg-black object-contain" />
                  ) : (
                    <img src={ex.gif_url} alt={ex.title} className="w-9 h-9 rounded-[10px] bg-white object-contain p-0.5" />
                  )
                ) : (
                  <div className="w-9 h-9 rounded-[10px] bg-stone-800" />
                )}
                <span className="text-[11px] font-bold text-stone-300 truncate w-full">{ex.title}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="text-[10px] font-extrabold text-teal-400 uppercase mb-1.5">יום בשבוע</div>
              <select
                value={diyScheduleDay}
                onChange={(e) => setDiyScheduleDay(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 text-white p-2.5 rounded-xl text-xs font-bold outline-none focus:border-teal-500"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[10px] font-extrabold text-teal-400 uppercase mb-1.5">שם האימון</div>
              <input
                type="text"
                value={diyWorkoutName}
                onChange={(e) => setDiyWorkoutName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 text-white p-2.5 rounded-xl text-xs font-bold outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={onSaveDiyWorkout}
              className="flex-1 bg-transparent border-[1.5px] border-teal-500/40 text-teal-400 font-extrabold text-[13px] py-3.5 rounded-2xl flex items-center justify-center gap-1.5 hover:bg-teal-500/10 transition-colors"
            >
              <Bookmark size={15} />
              {isEditingSavedWorkout ? "עדכן אימון" : "שמור אימון"}
            </button>
            <button
              onClick={onStartDiyWorkoutNow}
              className="flex-[1.5] bg-teal-500 text-stone-950 font-black text-sm py-3.5 rounded-2xl hover:bg-teal-400 transition-colors shadow-lg"
            >
              התחל אימון עכשיו
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {availableExercises.map((ex) => {
          const style = DIY_CATEGORY_STYLES[ex.category] ?? DEFAULT_DIY_CATEGORY_STYLE;
          return (
            <div key={ex.id} className="bg-[#1c1c1e] rounded-[1.25rem] p-3 border border-stone-800 flex items-center justify-between gap-3 hover:border-stone-700 transition-colors">
              <div className="flex items-center gap-3 w-full overflow-hidden">
                {ex.gif_url ? (
                  ex.gif_url.toLowerCase().includes(".mp4") || ex.gif_url.toLowerCase().includes(".webm") ? (
                    <video src={ex.gif_url} className="w-[52px] h-[52px] rounded-2xl bg-black object-contain shrink-0" />
                  ) : (
                    <img src={ex.gif_url} alt={ex.title} className="w-[52px] h-[52px] rounded-2xl bg-white object-contain shrink-0 p-1" />
                  )
                ) : (
                  <div className="w-[52px] h-[52px] rounded-2xl bg-stone-800 shrink-0" />
                )}

                <div className="overflow-hidden">
                  <h4 className="font-extrabold text-white text-[13px] truncate">{ex.title}</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[11px] text-stone-400 truncate">{AVAILABLE_MUSCLES.find((m) => m.id === ex.target_muscle)?.label}</span>
                    <span className="w-[3px] h-[3px] rounded-full bg-stone-700 shrink-0"></span>
                    <span
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: style.bg, color: style.text }}
                    >
                      {ex.category}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDiySelectedExercises((prev) => [...prev, ex])}
                className="w-9 h-9 rounded-full bg-stone-800 text-teal-400 flex items-center justify-center shrink-0 hover:bg-stone-700 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
