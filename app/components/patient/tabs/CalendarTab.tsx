"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { toDateKey, type HydratedPatientExercise } from "@/app/hooks/useWorkoutSession";
import type { PatientProgram, WorkoutLog } from "@/app/types";
import { PROGRAM_TAG_STYLE } from "@/app/constants/catalog";
import { countLabel } from "@/app/utils/format";
import { getLastUsedWeights } from "@/app/utils/history";
import { blocksOf, buildWeekPlan, DAY_NAMES, dayNameOfKey, queueRefFor, sundayOf, type PlannedWorkout, type ProgramQueueEntry } from "@/app/utils/programQueue";
import QuickLogSheet from "@/app/components/patient/workout/QuickLogSheet";

interface CalendarTabProps {
  patientExercises: HydratedPatientExercise[];
  programs: PatientProgram[];
  workoutLogs: WorkoutLog[];
  patientId: string;
  onOpenPlanned: (entry: ProgramQueueEntry, item: PlannedWorkout) => void; // opens it on the Plan tab
  onLogged: () => void; // refetch after "mark as done"
  // Fitness patients only (Explore/builder exist for them): the empty state
  // points there instead of a dead end.
  onBrowsePrograms?: () => void;
}

const WEEKDAY_LABELS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"]; // Sunday first, matches DAYS_OF_WEEK

type DayItem = { entry: ProgramQueueEntry; item: PlannedWorkout };

// Month view of the patient's plan: the workouts the therapist set on their
// days, each done / done on another day / not done / upcoming, plus what was
// actually trained on each date. A planned workout can be marked done from
// here (the quick log), and logging it on another day still completes its
// own planned day (app/utils/programQueue.ts).
export default function CalendarTab({ patientExercises, programs, workoutLogs, patientId, onOpenPlanned, onLogged, onBrowsePrograms }: CalendarTabProps) {
  const [viewedMonth, setViewedMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [quickLogFor, setQuickLogFor] = useState<DayItem | null>(null);

  const ownLogs = useMemo(() => workoutLogs.filter((l) => l.patient_id === patientId), [workoutLogs, patientId]);

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

  // The plan of every week the grid shows, keyed by date.
  const itemsByDate = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    for (let row = 0; row < cells.length / 7; row++) {
      const weekStart = sundayOf(new Date(year, month, row * 7 - leadingBlanks + 1));
      for (const entry of buildWeekPlan(patientExercises, programs, ownLogs, weekStart)) {
        for (const item of entry.planned) {
          if (!item.date) continue;
          map.set(item.date, [...(map.get(item.date) ?? []), { entry, item }]);
        }
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cells derive from year/month
  }, [patientExercises, programs, ownLogs, year, month, leadingBlanks]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, WorkoutLog[]>();
    for (const log of ownLogs) {
      const key = toDateKey(new Date(log.created_at));
      map.set(key, [...(map.get(key) ?? []), log]);
    }
    return map;
  }, [ownLogs]);

  const monthLabel = viewedMonth.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
  const todayKey = toDateKey(new Date());

  const handleChangeMonth = (delta: number) => {
    setViewedMonth(new Date(year, month + delta, 1));
    setSelectedDate(null);
  };

  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;
  const selectedItems = selectedKey ? (itemsByDate.get(selectedKey) ?? []) : [];
  const selectedLogs = selectedKey ? (logsByDate.get(selectedKey) ?? []) : [];
  const monthLogCount = ownLogs.filter((l) => {
    const d = new Date(l.created_at);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  const statusOf = ({ item }: DayItem) => {
    if (item.doneLog) return item.doneOn !== item.date ? `בוצע ביום ${dayNameOfKey(item.doneOn!)}` : "בוצע";
    if (item.date! < todayKey) return "לא בוצע";
    if (item.date === todayKey) return "להיום";
    return "מתוכנן";
  };

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-black text-fg tracking-tight flex items-center gap-2 mb-6">
        <CalendarDays size={22} className="text-accent-fg" />
        לוח שנה
      </h2>

      {/* Month switcher — minimal glyph arrows, no button chrome. */}
      <div className="flex items-center justify-between mb-7">
        <button onClick={() => handleChangeMonth(-1)} aria-label="חודש קודם" className="text-muted hover:text-fg active:scale-90 transition-ui duration-150 ease-out p-2 -m-2">
          <ChevronRight size={22} />
        </button>
        <h3 className="font-black text-2xl md:text-3xl text-fg tracking-tight">{monthLabel}</h3>
        <button onClick={() => handleChangeMonth(1)} aria-label="חודש הבא" className="text-muted hover:text-fg active:scale-90 transition-ui duration-150 ease-out p-2 -m-2">
          <ChevronLeft size={22} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-4">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[0.6875rem] font-bold text-muted">
            {label}
          </div>
        ))}
      </div>

      {/* Minimal grid: the date, a check when they trained that day, and one
          marker per planned workout — filled = done, hollow warm = missed,
          dot = still to come. */}
      <div className="grid grid-cols-7 gap-y-4">
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} />;
          const key = toDateKey(date);
          const items = itemsByDate.get(key) ?? [];
          const trained = (logsByDate.get(key) ?? []).length > 0;
          const isSelected = selectedDate !== null && key === toDateKey(selectedDate);
          const isToday = key === todayKey;

          return (
            <button key={idx} type="button" onClick={() => setSelectedDate(date)} className="flex flex-col items-center gap-1.5 group">
              <span
                className={`relative w-9 h-9 rounded-full flex items-center justify-center text-[0.8125rem] font-bold tabular-nums transition-ui duration-200 ease-out ${
                  isSelected
                    ? "bg-accent text-on-accent shadow-[0_4px_14px_-2px_color-mix(in_srgb,var(--accent)_50%,transparent)]"
                    : items.length > 0 || trained || isToday
                      ? "text-fg group-hover:bg-line group-active:scale-90"
                      : "text-muted group-hover:bg-line"
                } ${isToday && !isSelected ? "ring-1 ring-accent" : ""}`}
              >
                {date.getDate()}
                {trained && <CheckCircle2 size={11} className="absolute -top-1 -right-1 text-success bg-page rounded-full" />}
              </span>
              <div className="flex items-center gap-1 h-1.5">
                {items.slice(0, 3).map(({ item }) =>
                  item.doneLog ? (
                    <span key={item.id} className="w-1.5 h-1.5 rounded-full bg-success" />
                  ) : key < todayKey ? (
                    <span key={item.id} className="w-1.5 h-1.5 rounded-full border border-warm" />
                  ) : (
                    <span key={item.id} className="w-1.5 h-1.5 rounded-full" style={{ background: PROGRAM_TAG_STYLE.text }} />
                  )
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-6 mb-8 text-[0.6875rem] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: PROGRAM_TAG_STYLE.text }} /> מתוכנן
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success" /> בוצע
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full border border-warm" /> לא בוצע
        </span>
        <span className="ms-auto font-bold tabular-nums">{countLabel(monthLogCount, "אימון אחד החודש", "אימונים החודש")}</span>
      </div>

      {/* The selected day: its planned workouts with their status, and what
          was trained on it. A raised surface in normal document flow (not
          position:fixed), so a long list just grows and the page scrolls. */}
      <div className="on-light -mx-4 md:-mx-8 bg-surface rounded-t-[2rem] px-5 pt-5 pb-10 shadow-[0_-8px_30px_-8px_color-mix(in_srgb,var(--shadow-ink)_10%,transparent)]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-black text-fg text-base">{selectedDate ? (selectedKey === todayKey ? "היום" : `יום ${DAY_NAMES[selectedDate.getDay()]}`) : "בחר יום"}</h4>
          {selectedDate && <span className="text-xs font-bold text-muted">{selectedDate.toLocaleDateString("he-IL", { day: "numeric", month: "long" })}</span>}
        </div>

        {patientExercises.length === 0 && ownLogs.length === 0 ? (
          <div className="text-center py-6 flex flex-col items-center gap-3">
            <p className="text-muted text-sm">עדיין אין לך תוכנית אימון — כשתוסיף אחת, הימים שלה יופיעו כאן.</p>
            {onBrowsePrograms && (
              <button onClick={onBrowsePrograms} className="text-accent-fg font-bold text-sm px-4 py-2 rounded-full bg-accent/10 hover:bg-accent/15 active:scale-95 transition-ui duration-150 ease-out">
                גלה תוכניות
              </button>
            )}
          </div>
        ) : !selectedDate ? (
          <p className="text-muted text-sm text-center py-6">בחר יום כדי לראות את האימונים שלו.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedItems.map((dayItem) => {
              const { entry, item } = dayItem;
              const canMarkDone = !item.doneLog && item.date! <= todayKey;
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl p-1.5">
                  <button
                    onClick={() => onOpenPlanned(entry, item)}
                    className="flex-1 min-w-0 flex items-center gap-3.5 text-right hover:bg-surface-alt active:scale-[0.98] rounded-2xl transition-ui duration-150 ease-out"
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center ${item.doneLog ? "bg-success/15 text-fg" : ""}`}
                      style={item.doneLog ? undefined : { background: PROGRAM_TAG_STYLE.bg, color: PROGRAM_TAG_STYLE.text }}
                    >
                      {item.doneLog ? <CheckCircle2 size={20} /> : <CalendarDays size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-black text-fg text-[0.9375rem] leading-snug line-clamp-2 [overflow-wrap:anywhere]">{entry.name}</h5>
                      <p className={`text-xs font-semibold mt-0.5 ${!item.doneLog && item.date! < todayKey ? "text-warm-fg" : "text-muted"}`}>
                        {statusOf(dayItem)} · {countLabel(item.session.rows.length, "תרגיל אחד", "תרגילים")}
                      </p>
                    </div>
                  </button>
                  {canMarkDone && (
                    <button
                      onClick={() => setQuickLogFor(dayItem)}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-accent-fg bg-accent/10 hover:bg-accent/15 px-3 py-2 rounded-full active:scale-95 transition-ui duration-150 ease-out"
                    >
                      <ClipboardCheck size={14} /> סמן כבוצע
                    </button>
                  )}
                </div>
              );
            })}

            {/* What was trained that day — including workouts planned for
                another day ("של יום ראשון"). */}
            {selectedLogs.map((log) => {
              const forOtherDay = log.session_key && /^[0-6]$/.test(log.session_key) && Number(log.session_key) !== selectedDate.getDay();
              return (
                <div key={log.id} className="flex items-center gap-3.5 rounded-2xl p-1.5">
                  <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-success/15 text-fg">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-black text-fg text-[0.9375rem] leading-snug line-clamp-2 [overflow-wrap:anywhere]">
                      התאמנת: {log.category || "אימון"}
                    </h5>
                    <p className="text-muted text-xs font-semibold mt-0.5">
                      {new Date(log.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                      {forOtherDay ? ` · האימון של יום ${DAY_NAMES[Number(log.session_key)]}` : ""}
                      {log.rpe != null ? ` · מאמץ ${log.rpe}/10` : ""}
                    </p>
                  </div>
                </div>
              );
            })}

            {selectedItems.length === 0 && selectedLogs.length === 0 && (
              <p className="text-muted text-sm text-center py-6">{selectedKey === todayKey ? "אין אימון מתוכנן להיום." : "אין אימונים ביום הזה."}</p>
            )}
          </div>
        )}
      </div>

      {quickLogFor && (
        <QuickLogSheet
          title={quickLogFor.entry.name}
          {...blocksOf(quickLogFor.item.session.rows)}
          isAmrap={quickLogFor.entry.isAmrap}
          previousWeights={getLastUsedWeights(workoutLogs)}
          onClose={() => setQuickLogFor(null)}
          onLogged={onLogged}
          queueLogRef={queueRefFor(quickLogFor.entry, quickLogFor.item)}
        />
      )}
    </div>
  );
}
