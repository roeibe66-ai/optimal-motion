"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Loader2, X } from "lucide-react";
import { DAYS_OF_WEEK } from "@/app/constants/catalog";
import { useDialog } from "@/app/hooks/useDialog";

export interface DaysSheetWorkout {
  label: string; // "אימון 1"
  preview: string; // first exercise names
  days: string[]; // DAYS_OF_WEEK ids ("0" = Sunday)
}

interface ProgramDaysSheetProps {
  programName: string;
  workouts: DaysSheetWorkout[];
  onSave: (daysPerWorkout: string[][]) => Promise<boolean>; // false = failed, stay open
  onClose: () => void;
}

// "Only the days": move which weekdays each workout of a program falls on,
// without opening the builder. Used by the patient (their assigned program)
// and the admin ("עריכת תוכניות"). A day holds one workout: picking a day
// another workout has moves it over. A lone workout may have no fixed days
// (= any day); with several, each needs at least one.
export default function ProgramDaysSheet({ programName, workouts, onSave, onClose }: ProgramDaysSheetProps) {
  const [days, setDays] = useState<string[][]>(() => workouts.map((w) => [...w.days]));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(panelRef, isMounted, onClose);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target exists only after the first client render
    setIsMounted(true);
  }, []);

  const owner = (day: string) => days.findIndex((d) => d.includes(day));

  const toggle = (workout: number, day: string) => {
    setError("");
    setDays((prev) =>
      prev.map((list, i) => {
        if (i === workout) return list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort();
        return list.filter((d) => d !== day); // the day moves to this workout
      })
    );
  };

  const save = async () => {
    if (workouts.length > 1 && days.some((d) => d.length === 0)) {
      setError("לכל אימון צריך לפחות יום אחד");
      return;
    }
    setIsSaving(true);
    const ok = await onSave(days);
    setIsSaving(false);
    if (ok) onClose();
  };

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-backdrop backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`שינוי ימים: ${programName}`}
        className="on-light animate-card-in relative w-full md:max-w-lg bg-surface rounded-t-[2rem] md:rounded-[2rem] shadow-elevated max-h-[88dvh] flex flex-col"
      >
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5 min-w-0">
            <CalendarDays size={20} className="text-accent-fg shrink-0" />
            <div className="min-w-0">
              <h2 className="font-black text-fg truncate">שינוי ימים</h2>
              <p className="text-xs text-muted truncate">{programName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="סגירה" className="p-2 text-muted hover:text-fg active:scale-90 transition-transform">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {workouts.map((w, i) => (
            <div key={i}>
              <p className="font-extrabold text-fg text-sm">{w.label}</p>
              <p className="text-xs text-muted mb-2 truncate">{w.preview}</p>
              <div className="flex gap-1.5" role="group" aria-label={`ימים ל${w.label}`}>
                {DAYS_OF_WEEK.map((day) => {
                  const mine = days[i].includes(day.id);
                  const otherOwner = owner(day.id);
                  const takenByOther = otherOwner !== -1 && otherOwner !== i;
                  return (
                    <button
                      key={day.id}
                      type="button"
                      aria-pressed={mine}
                      aria-label={`${day.label}${takenByOther ? ` (כרגע ${workouts[otherOwner].label})` : ""}`}
                      onClick={() => toggle(i, day.id)}
                      className={`flex-1 h-11 rounded-xl text-sm font-black border-2 transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.94] ${
                        mine ? "bg-accent text-on-accent border-transparent" : takenByOther ? "border-dashed border-line text-muted/60" : "border-line text-fg"
                      }`}
                    >
                      {day.he_short}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {workouts.length === 1 && days[0].length === 0 && <p className="text-xs text-muted">בלי ימים קבועים: האימון יופיע כ&quot;בימים שנוחים לך&quot;.</p>}
          <p className="text-[11px] text-muted">בחירה ביום של אימון אחר מעבירה אותו לכאן. התרגילים לא משתנים.</p>
        </div>

        <div className="px-6 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-line">
          {error && (
            <p role="alert" className="text-xs font-bold text-danger-fg mb-2">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            className="w-full min-h-12 rounded-2xl bg-btn-primary text-btn-primary-fg font-black flex items-center justify-center gap-2 hover:bg-btn-primary-hover active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out disabled:bg-disabled disabled:text-disabled-fg"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : "שמירה"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
