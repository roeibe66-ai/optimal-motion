"use client";

import { useState } from "react";
import { Check, Loader2, Search, Send, X } from "lucide-react";
import { DAYS_OF_WEEK } from "@/app/constants/catalog";
import { toDateKey } from "@/app/hooks/useWorkoutSession";
import type { Patient } from "@/app/types";
import { MAX_CATALOG_TITLE_LENGTH } from "@/app/utils/validation";

// When an assigned single workout shows up in the patient's plan: on fixed
// weekdays every week, or once on a specific date. Program templates carry
// their own week/day layout, so they don't ask for this.
export type AssignSchedule = { kind: "weekdays"; days: string[] } | { kind: "date"; date: string };

export interface AssignResult {
  failed: { patientName: string; message: string }[];
}

interface AssignToPatientsModalProps {
  heading: string;
  subtitle: string;
  defaultProgramName: string;
  patients: Patient[];
  askSchedule: boolean;
  onClose: () => void;
  onAssign: (patientIds: string[], programName: string, schedule: AssignSchedule | null) => Promise<AssignResult>;
}

// Assign a copy of a program template or single workout to one or more
// specific patients — the private alternative to publishing it to everyone
// in the Explore tab. Each selected patient gets their own named
// patient_programs row (+ patient_exercises), exactly like a single assign.
export default function AssignToPatientsModal({ heading, subtitle, defaultProgramName, patients, askSchedule, onClose, onAssign }: AssignToPatientsModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [programName, setProgramName] = useState(defaultProgramName);
  const [scheduleKind, setScheduleKind] = useState<"weekdays" | "date">("weekdays");
  const [days, setDays] = useState<string[]>([String(new Date().getDay())]);
  const [date, setDate] = useState(toDateKey(new Date()));
  const [isSaving, setIsSaving] = useState(false);

  const assignable = patients.filter((p) => p.role !== "admin");
  const normalized = query.trim().toLowerCase();
  const visible = normalized
    ? assignable.filter((p) => (p.full_name ?? "").toLowerCase().includes(normalized) || (p.email ?? "").toLowerCase().includes(normalized))
    : assignable;
  const allVisibleSelected = visible.length > 0 && visible.every((p) => selectedIds.includes(String(p.id)));

  const togglePatient = (id: string) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAllVisible = () => {
    const ids = visible.map((p) => String(p.id));
    setSelectedIds((prev) => (allVisibleSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))));
  };
  const toggleDay = (id: string) => setDays((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id].sort()));

  const scheduleValid = !askSchedule || (scheduleKind === "weekdays" ? days.length > 0 : Boolean(date));
  const canSubmit = selectedIds.length > 0 && programName.trim() !== "" && scheduleValid && !isSaving;

  const submit = async () => {
    if (!canSubmit) return;
    const schedule: AssignSchedule | null = askSchedule ? (scheduleKind === "weekdays" ? { kind: "weekdays", days } : { kind: "date", date }) : null;
    setIsSaving(true);
    const { failed } = await onAssign(selectedIds, programName.trim(), schedule);
    setIsSaving(false);
    const succeeded = selectedIds.length - failed.length;
    if (failed.length === 0) {
      alert(succeeded === 1 ? "שויך בהצלחה למטופל!" : `שויך בהצלחה ל-${succeeded} מטופלים!`);
      onClose();
    } else {
      alert(`שויך ל-${succeeded} מתוך ${selectedIds.length}.\nנכשל עבור:\n${failed.map((f) => `• ${f.patientName}: ${f.message}`).join("\n")}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] bg-scrim/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-elevated border border-line rounded-[1.75rem] p-7 w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5 shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-fg">{heading}</h3>
            <p className="text-sm text-muted mt-1 truncate">{subtitle}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-fg" aria-label="סגור">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto -mx-1 px-1 flex flex-col gap-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider">בחר מטופלים ({selectedIds.length} נבחרו)</span>
              {visible.length > 0 && (
                <button onClick={toggleAllVisible} className="text-[11px] font-bold text-accent-fg hover:underline">
                  {allVisibleSelected ? "נקה הכל" : "בחר הכל"}
                </button>
              )}
            </div>
            <div className="relative mb-2">
              <Search size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש לפי שם או אימייל"
                className="on-light w-full bg-surface border border-line-input rounded-xl pr-9 pl-3 py-2 text-sm font-medium text-fg outline-none focus:border-focus focus:ring-2 focus:ring-focus"
              />
            </div>
            <div className="on-light bg-surface border border-line rounded-xl max-h-56 overflow-y-auto divide-y divide-line">
              {visible.length === 0 ? (
                <p className="p-4 text-sm text-muted text-center">לא נמצאו מטופלים</p>
              ) : (
                visible.map((p) => {
                  const id = String(p.id);
                  const isSelected = selectedIds.includes(id);
                  return (
                    <button key={id} type="button" onClick={() => togglePatient(id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-start hover:bg-surface-alt transition-colors">
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? "bg-accent border-accent text-on-accent" : "border-line-input text-transparent"}`}
                      >
                        <Check size={13} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-fg truncate">{p.full_name}</span>
                        {p.email && <span className="block text-[11px] text-muted truncate">{p.email}</span>}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <label className="block">
            <span className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">שם התוכנית (מה שהמטופל יראה)</span>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              maxLength={MAX_CATALOG_TITLE_LENGTH}
              className="on-light w-full border-b-2 border-line p-2 outline-none font-bold text-fg bg-surface focus:border-focus focus:ring-2 focus:ring-focus"
            />
          </label>

          {askSchedule && (
            <div>
              <span className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">מתי האימון יופיע אצל המטופל</span>
              <div className="flex bg-surface-alt p-1 rounded-xl border border-line mb-3">
                {(
                  [
                    ["weekdays", "ימים קבועים בכל שבוע"],
                    ["date", "פעם אחת בתאריך"],
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setScheduleKind(kind)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${scheduleKind === kind ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {scheduleKind === "weekdays" ? (
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      aria-pressed={days.includes(day.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${days.includes(day.id) ? "bg-accent text-on-accent" : "bg-surface-alt text-muted border border-line"}`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="date"
                  value={date}
                  min={toDateKey(new Date())}
                  onChange={(e) => setDate(e.target.value)}
                  className="on-light w-full bg-surface border border-line-input rounded-xl px-3 py-2 text-sm font-bold text-fg outline-none focus:border-focus focus:ring-2 focus:ring-focus"
                />
              )}
            </div>
          )}
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="mt-6 shrink-0 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-btn-primary text-btn-primary-fg hover:bg-btn-primary-hover active:bg-btn-primary-active font-extrabold disabled:bg-disabled disabled:text-disabled-fg disabled:hover:bg-disabled"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {selectedIds.length > 1 ? `שגר ל-${selectedIds.length} מטופלים` : "שגר למטופל"}
        </button>
      </div>
    </div>
  );
}
