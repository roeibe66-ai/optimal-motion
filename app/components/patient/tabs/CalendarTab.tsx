"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import type { HydratedPatientExercise } from "@/app/hooks/useWorkoutSession";
import type { WorkoutLog } from "@/app/types";

interface CalendarTabProps {
  patientExercises: HydratedPatientExercise[];
  workoutLogs: WorkoutLog[];
  patientId: string;
  // patients.created_at - the anchor used to compute which program week
  // (patient_exercises.week) falls on which real calendar date, since
  // there's no explicit "program start date" in the schema (confirmed
  // with Roei: created_at is an accepted approximation).
  programStartDate: string;
  onSelectDate: (week: number, dayId: string) => void;
}

const WEEKDAY_LABELS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"]; // Sunday first, matches DAYS_OF_WEEK/ProtocolBuilder convention

// A scheduled_days value is documented as a single DAYS_OF_WEEK id, but
// PlanTab defensively also accepts a comma-separated value or an empty
// value (meaning "every day") - matched here exactly for consistency.
function matchesScheduledDay(pe: HydratedPatientExercise, dayId: string): boolean {
  if (!pe.scheduled_days || pe.scheduled_days.trim() === "") return true;
  return pe.scheduled_days.split(",").includes(dayId);
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Month view of the patient's scheduled workouts (confirmed with Roei,
// claude/roadmap.md Tier 2 item 3). Deliberately thin: it computes which
// program week/day a given date falls on and which dates already have a
// completed workout, then hands off to the existing Plan tab (via
// onSelectDate) for the actual exercise list - no exercise-list rendering
// duplicated here.
export default function CalendarTab({ patientExercises, workoutLogs, patientId, programStartDate, onSelectDate }: CalendarTabProps) {
  const [viewedMonth, setViewedMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const availableWeeks = Array.from(new Set(patientExercises.map((ex) => ex.week || 1))).sort((a, b) => a - b);

  // programStartDate is always a valid ISO string - PatientShell falls back
  // to "now" there if loggedInPatient.created_at is ever missing, so this
  // component never needs to call Date.now() itself during render.
  const startDate = new Date(programStartDate);
  startDate.setHours(0, 0, 0, 0);

  // Program week for a given date, clamped to the range of weeks that
  // actually exist (same clamp-to-available approach usePlanSelection uses
  // for activePatientWeek) - a date before the program started, or with no
  // authored weeks at all, has no schedule to show.
  const getWeekForDate = (date: Date): number | null => {
    if (availableWeeks.length === 0) return null;
    const diffDays = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    const weekNum = Math.floor(diffDays / 7) + 1;
    return availableWeeks.includes(weekNum) ? weekNum : availableWeeks[availableWeeks.length - 1];
  };

  const completedDateKeys = new Set(
    workoutLogs.filter((l) => l.patient_id === patientId).map((l) => toDateKey(new Date(l.created_at)))
  );

  const today = new Date();

  const year = viewedMonth.getFullYear();
  const month = viewedMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay(); // Sunday-first grid

  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = viewedMonth.toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1.5 flex items-center gap-2">
          <CalendarDays size={26} className="text-teal-400" />
          לוח שנה
        </h2>
        <p className="text-stone-400 text-[13px] md:text-sm">תצוגת חודש של האימונים המתוזמנים שלך.</p>
      </div>

      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setViewedMonth(new Date(year, month - 1, 1))}
          className="w-9 h-9 rounded-full bg-[#1c1c1e] border border-stone-800 text-stone-300 flex items-center justify-center hover:border-stone-700 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
        <h3 className="font-extrabold text-white text-base">{monthLabel}</h3>
        <button
          onClick={() => setViewedMonth(new Date(year, month + 1, 1))}
          className="w-9 h-9 rounded-full bg-[#1c1c1e] border border-stone-800 text-stone-300 flex items-center justify-center hover:border-stone-700 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[11px] font-extrabold text-stone-500 py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} className="aspect-square" />;

          const week = getWeekForDate(date);
          const dayId = date.getDay().toString();
          const hasSchedule = week !== null && patientExercises.some((pe) => (pe.week || 1) === week && matchesScheduledDay(pe, dayId));
          const isCompleted = completedDateKeys.has(toDateKey(date));
          const isToday = isSameDay(date, today);
          const isClickable = hasSchedule && week !== null;

          return (
            <button
              key={idx}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onSelectDate(week as number, dayId)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 border transition-colors ${
                isClickable ? "bg-[#1c1c1e] border-stone-800 hover:border-teal-500/50 cursor-pointer" : "bg-transparent border-transparent"
              } ${isToday ? "ring-2 ring-teal-500/60" : ""}`}
            >
              <span className={`text-[12px] font-bold ${isClickable ? "text-white" : "text-stone-600"}`}>{date.getDate()}</span>
              <div className="flex items-center gap-0.5 h-2.5">
                {hasSchedule && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
                {isCompleted && <CheckCircle2 size={10} className="text-amber-400" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-6 text-[11px] text-stone-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          מתוזמן
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={11} className="text-amber-400" />
          הושלם
        </div>
      </div>
    </div>
  );
}
