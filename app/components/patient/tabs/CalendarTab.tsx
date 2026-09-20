"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import type { HydratedPatientExercise } from "@/app/hooks/useWorkoutSession";
import type { WorkoutLog } from "@/app/types";
import { ADMIN_CATEGORY_STYLES, DEFAULT_ADMIN_CATEGORY_STYLE } from "@/app/constants/catalog";

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

  // Which day's workouts the sheet below the grid is showing. Presentation
  // state only — reads the exact same getWeekForDate/matchesScheduledDay
  // logic below as everything else in this file, it just decides what's
  // expanded rather than navigating away immediately on tap (that jump now
  // happens from a card inside the sheet instead, via the same onSelectDate
  // prop). Defaults to today so the sheet isn't empty on first load.
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());

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

  const handleChangeMonth = (delta: number) => {
    setViewedMonth(new Date(year, month + delta, 1));
    // A selection from the previous month has no meaning here — the sheet
    // prompts for a new pick instead of silently showing stale data.
    setSelectedDate(null);
  };

  // Workouts (one card per distinct category) scheduled on the selected
  // date — same week/day computation the grid itself uses per-cell below.
  const selectedWeek = selectedDate ? getWeekForDate(selectedDate) : null;
  const selectedDayId = selectedDate ? selectedDate.getDay().toString() : null;
  const selectedDayExercises =
    selectedWeek !== null && selectedDayId !== null
      ? patientExercises.filter((pe) => (pe.week || 1) === selectedWeek && matchesScheduledDay(pe, selectedDayId))
      : [];
  const selectedDayCategories = Array.from(new Set(selectedDayExercises.flatMap((pe) => pe.exercise.categories)));

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-xl md:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2 mb-6">
        <CalendarDays size={22} className="text-emerald-800" />
        לוח שנה
      </h2>

      {/* Month switcher — minimal glyph arrows, no button chrome, matching
          the reference's understated header. */}
      <div className="flex items-center justify-between mb-7">
        <button
          onClick={() => handleChangeMonth(-1)}
          aria-label="חודש קודם"
          className="text-stone-500 hover:text-stone-900 active:scale-90 transition-all duration-150 ease-out p-2 -m-2"
        >
          <ChevronRight size={22} />
        </button>
        <h3 className="font-black text-2xl md:text-3xl text-stone-900 tracking-tight">{monthLabel}</h3>
        <button
          onClick={() => handleChangeMonth(1)}
          aria-label="חודש הבא"
          className="text-stone-500 hover:text-stone-900 active:scale-90 transition-all duration-150 ease-out p-2 -m-2"
        >
          <ChevronLeft size={22} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-4">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[11px] font-bold text-stone-500 tracking-wide">
            {label}
          </div>
        ))}
      </div>

      {/* Minimal grid — no per-cell card/border, just a number, an optional
          glowing selection ring, and tiny colored dots for what's scheduled
          (one dot per category, real info rather than decoration). */}
      <div className="grid grid-cols-7 gap-y-4">
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} />;

          const week = getWeekForDate(date);
          const dayId = date.getDay().toString();
          const scheduledCategories =
            week === null
              ? []
              : Array.from(new Set(patientExercises.filter((pe) => (pe.week || 1) === week && matchesScheduledDay(pe, dayId)).flatMap((pe) => pe.exercise.categories)));
          const isCompleted = completedDateKeys.has(toDateKey(date));
          const isClickable = scheduledCategories.length > 0 && week !== null;
          const isSelected = selectedDate !== null && isSameDay(date, selectedDate);

          return (
            <button
              key={idx}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && setSelectedDate(date)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span
                className={`relative w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold tabular-nums transition-all duration-200 ease-out ${
                  isSelected
                    ? "bg-emerald-800 text-white shadow-[0_4px_14px_-2px_rgba(6,78,59,0.5)]"
                    : isClickable
                      ? "text-stone-900 group-hover:bg-stone-100 group-active:scale-90"
                      : "text-stone-500"
                }`}
              >
                {date.getDate()}
                {isCompleted && <CheckCircle2 size={11} className="absolute -top-1 -right-1 text-amber-600 bg-white rounded-full" />}
              </span>
              <div className="flex items-center gap-1 h-1.5">
                {scheduledCategories.slice(0, 3).map((cat) => (
                  <span
                    key={cat}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: (ADMIN_CATEGORY_STYLES[cat] ?? DEFAULT_ADMIN_CATEGORY_STYLE).text }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-6 mb-8 text-[11px] text-stone-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: ADMIN_CATEGORY_STYLES["קליסטניקס"].text }} />
          נקודה צבעונית = קטגוריית אימון מתוזמנת
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={11} className="text-amber-600" />
          הושלם
        </div>
      </div>

      {/* "Bottom sheet" — visually a sheet (distinct surface, rounded top
          corners, drag-handle pill) sitting under the calendar. Kept in
          normal document flow rather than position:fixed so a long workout
          list can never overlap PatientShell's sticky header or bottom nav —
          it just grows and the page scrolls, which is the safer choice for
          a list whose length varies with how many categories are scheduled. */}
      <div className="-mx-4 md:-mx-8 bg-white rounded-t-[2rem] px-5 pt-3 pb-10 shadow-[0_-8px_30px_-8px_rgba(0,0,0,0.1)]">
        <div className="w-10 h-1.5 rounded-full bg-stone-200 mx-auto mb-5"></div>

        <div className="flex items-center justify-between mb-4">
          <h4 className="font-black text-stone-900 text-base">
            {selectedDayCategories.length} {selectedDayCategories.length === 1 ? "אימון" : "אימונים"}
          </h4>
          {selectedDate && (
            <span className="text-[12px] font-bold text-stone-500">
              {selectedDate.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          )}
        </div>

        {!selectedDate ? (
          <p className="text-stone-500 text-sm text-center py-6">בחר יום כדי לראות את האימונים שלו.</p>
        ) : selectedDayCategories.length === 0 ? (
          <p className="text-stone-500 text-sm text-center py-6">אין אימונים מתוזמנים ביום הזה.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedDayCategories.map((cat) => {
              const style = ADMIN_CATEGORY_STYLES[cat] ?? DEFAULT_ADMIN_CATEGORY_STYLE;
              const catExercises = selectedDayExercises.filter((pe) => pe.exercise.categories.includes(cat));
              const thumbUrl = catExercises.find((pe) => pe.exercise.gif_url && !/\.(mp4|webm)$/i.test(pe.exercise.gif_url))?.exercise.gif_url;

              return (
                <button
                  key={cat}
                  onClick={() => selectedWeek !== null && selectedDayId !== null && onSelectDate(selectedWeek, selectedDayId)}
                  className="w-full flex items-center gap-3.5 text-right hover:bg-stone-50 active:scale-[0.98] rounded-2xl p-1.5 transition-all duration-150 ease-out"
                >
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0" style={{ background: style.bg }}>
                    {thumbUrl && <img src={thumbUrl} alt="" className="w-full h-full object-cover" />}
                    <div className="absolute bottom-0 inset-x-0 h-[3px]" style={{ background: style.text }}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-black text-stone-900 text-[15px] truncate">{cat}</h5>
                    <p className="text-stone-500 text-[12px] font-semibold mt-0.5">
                      שבוע {selectedWeek} · {catExercises.length} תרגילים
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
