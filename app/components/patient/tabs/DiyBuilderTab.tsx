"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, X } from "lucide-react";
import { AVAILABLE_MUSCLES, DAYS_OF_WEEK, EQUIPMENT_LIST } from "@/app/constants/catalog";
import type { Exercise } from "@/app/types";

interface DiyBuilderTabProps {
  exerciseCatalog: Exercise[];
  diyMuscleFilter: string;
  setDiyMuscleFilter: (value: string) => void;
  diyEquipFilter: string;
  setDiyEquipFilter: (value: string) => void;
  diySelectedExercises: Exercise[];
  setDiySelectedExercises: Dispatch<SetStateAction<Exercise[]>>;
  diyScheduleDay: string;
  setDiyScheduleDay: (value: string) => void;
  diyWorkoutName: string;
  setDiyWorkoutName: (value: string) => void;
  onStartDiyWorkoutNow: () => void;
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
  diySelectedExercises,
  setDiySelectedExercises,
  diyScheduleDay,
  setDiyScheduleDay,
  diyWorkoutName,
  setDiyWorkoutName,
  onStartDiyWorkoutNow,
}: DiyBuilderTabProps) {
  const availableExercises = exerciseCatalog.filter((ex) => {
    const matchMuscle = diyMuscleFilter === "all" || ex.target_muscle === diyMuscleFilter;
    const matchEquip =
      diyEquipFilter === "all" ||
      (ex.description && ex.description.includes(EQUIPMENT_LIST.find((e) => e.id === diyEquipFilter)?.label || "")) ||
      (ex.title && ex.title.includes(EQUIPMENT_LIST.find((e) => e.id === diyEquipFilter)?.label || ""));

    return matchMuscle && matchEquip;
  });

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-white tracking-tight mb-2">בנה אימון עצמאי</h2>
        <p className="text-stone-400 text-sm">בחר תרגילים מהמאגר הפתוח שלך כדי ליצור ולשמור אימונים מותאמים.</p>
      </div>

      {/* Filters for DIY */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-4">
        <select
          value={diyMuscleFilter}
          onChange={(e) => setDiyMuscleFilter(e.target.value)}
          className="bg-stone-900 border border-stone-700 text-stone-300 rounded-xl px-4 py-2 outline-none font-bold text-sm shrink-0 focus:border-teal-500"
        >
          <option value="all">כל השרירים</option>
          {AVAILABLE_MUSCLES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={diyEquipFilter}
          onChange={(e) => setDiyEquipFilter(e.target.value)}
          className="bg-stone-900 border border-stone-700 text-stone-300 rounded-xl px-4 py-2 outline-none font-bold text-sm shrink-0 focus:border-teal-500"
        >
          <option value="all">כל הציוד</option>
          {EQUIPMENT_LIST.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.label}
            </option>
          ))}
        </select>
      </div>

      {diySelectedExercises.length > 0 && (
        <div className="bg-teal-900/20 border border-teal-900/50 p-4 rounded-2xl mb-8 sticky top-20 z-30 backdrop-blur-xl shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-teal-400">האימון שייבנה ({diySelectedExercises.length} תרגילים)</h4>
            <button onClick={() => setDiySelectedExercises([])} className="text-xs text-stone-500 hover:text-stone-300">
              נקה הכל
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-4">
            {diySelectedExercises.map((ex, idx) => (
              <div key={idx} className="bg-[#1c1c1e] border border-stone-700 rounded-xl p-2 flex items-center gap-3 min-w-[150px] relative">
                <button
                  onClick={() => setDiySelectedExercises((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                >
                  <X size={10} />
                </button>
                {ex.gif_url ? (
                  ex.gif_url.toLowerCase().includes(".mp4") || ex.gif_url.toLowerCase().includes(".webm") ? (
                    <video src={ex.gif_url} className="w-10 h-10 rounded bg-black object-contain" />
                  ) : (
                    <img src={ex.gif_url} alt={ex.title} className="w-10 h-10 rounded bg-white object-contain p-0.5" />
                  )
                ) : (
                  <div className="w-10 h-10 rounded bg-stone-800" />
                )}
                <span className="text-xs font-bold text-stone-300 truncate w-full">{ex.title}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] font-bold text-teal-500 uppercase mb-1 block">יום בשבוע</label>
              <select
                value={diyScheduleDay}
                onChange={(e) => setDiyScheduleDay(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 text-white p-2 rounded-lg text-sm outline-none focus:border-teal-500"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-teal-500 uppercase mb-1 block">שם האימון</label>
              <input
                type="text"
                value={diyWorkoutName}
                onChange={(e) => setDiyWorkoutName(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 text-white p-2 rounded-lg text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <button onClick={onStartDiyWorkoutNow} className="w-full bg-teal-500 text-stone-900 font-black py-3 rounded-xl hover:bg-teal-400 transition-colors shadow-lg">
            התחל אימון עכשיו
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableExercises.map((ex) => (
          <div key={ex.id} className="bg-[#1c1c1e] rounded-2xl p-4 border border-stone-800 flex items-center justify-between gap-4 hover:border-stone-600 transition-colors">
            <div className="flex items-center gap-4 w-full overflow-hidden">
              {ex.gif_url ? (
                ex.gif_url.toLowerCase().includes(".mp4") || ex.gif_url.toLowerCase().includes(".webm") ? (
                  <video src={ex.gif_url} className="w-16 h-16 rounded-xl bg-black object-contain shrink-0" />
                ) : (
                  <img src={ex.gif_url} alt={ex.title} className="w-16 h-16 rounded-xl bg-white object-contain shrink-0 p-1" />
                )
              ) : (
                <div className="w-16 h-16 rounded-xl bg-stone-800 shrink-0" />
              )}

              <div className="overflow-hidden">
                <h4 className="font-bold text-white text-sm truncate pr-2">{ex.title}</h4>
                <p className="text-xs text-stone-500 truncate">{AVAILABLE_MUSCLES.find((m) => m.id === ex.target_muscle)?.label}</p>
              </div>
            </div>
            <button
              onClick={() => setDiySelectedExercises((prev) => [...prev, ex])}
              className="w-10 h-10 rounded-full bg-stone-800 text-teal-400 flex items-center justify-center shrink-0 hover:bg-stone-700 transition-colors shadow-sm"
            >
              <Plus size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
