"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Bookmark, Check, ChevronRight, Dumbbell, Pencil, Plus, X } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { getExerciseName } from "@/app/utils/format";
import type { DiyExercise, DiyPrescription, Exercise } from "@/app/types";
import DiyDayList from "@/app/components/patient/tabs/DiyDayList";
import ExerciseCatalogBrowser from "@/app/components/patient/tabs/ExerciseCatalogBrowser";
import { MAX_CATALOG_TITLE_LENGTH } from "@/app/utils/validation";
import { countLabel } from "@/app/utils/format";
import { notify } from "@/app/components/ui/feedback";
import { tapHaptic } from "@/app/utils/haptics";

interface DiyBuilderTabProps {
  exerciseCatalog: Exercise[];
  onViewExerciseInfo: (exercise: Exercise) => void;
  diyEquipFilter: string;
  setDiyEquipFilter: (value: string) => void;
  diyCategoryFilter: string | null;
  setDiyCategoryFilter: (value: string | null) => void;
  diyBodyPartFilter: string | null;
  setDiyBodyPartFilter: (value: string | null) => void;
  // A full weekly program draft: ordinal builder day (1, 2, 3, ...) ->
  // that day's exercise list. diyActiveDay is whichever day tab is open;
  // every "add exercise" action below operates on that one day only.
  diyExercisesByDay: Record<number, DiyExercise[]>;
  setDiyExercisesByDay: Dispatch<SetStateAction<Record<number, DiyExercise[]>>>;
  diyActiveDay: number;
  setDiyActiveDay: (day: number) => void;
  onAddDiyDay: () => void;
  onRemoveDiyDay: (day: number) => void;
  diyProgramName: string;
  setDiyProgramName: (value: string) => void;
  onStartDiyWorkoutNow: () => void;
  onSaveDiyProgram: () => void | Promise<void>;
  isEditingSavedProgram: boolean;
  onCancelEditSavedProgram: () => void;
  onClose: () => void;
}

// The "build your own workout" workspace — a full-screen screen of its own
// (fixed over the patient shell and its bottom nav, like WorkoutPlayer)
// instead of the old inline tab, where the draft tray sat stuck to the top
// of a long scrolling page above the catalog. Two views:
//
// - "plan": the program itself — name, day tabs, and the active day's
//   exercises as a roomy vertical list, with save/start pinned to the bottom.
// - "picker": the catalog (ExerciseCatalogBrowser), adding into the active day, with a live count of the
//   day pinned to the bottom so adding is visible without the tray.
export default function DiyBuilderTab({
  exerciseCatalog,
  onViewExerciseInfo,
  diyEquipFilter,
  setDiyEquipFilter,
  diyCategoryFilter,
  setDiyCategoryFilter,
  diyBodyPartFilter,
  setDiyBodyPartFilter,
  diyExercisesByDay,
  setDiyExercisesByDay,
  diyActiveDay,
  setDiyActiveDay,
  onAddDiyDay,
  onRemoveDiyDay,
  diyProgramName,
  setDiyProgramName,
  onStartDiyWorkoutNow,
  onSaveDiyProgram,
  isEditingSavedProgram,
  onCancelEditSavedProgram,
  onClose,
}: DiyBuilderTabProps) {
  const { lang } = useAuth();
  const [view, setView] = useState<"plan" | "picker">("plan");
  // Direction of the last plan <-> picker move, for the push animation.
  const [nav, setNav] = useState<"forward" | "back" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dayNumbers = Object.keys(diyExercisesByDay).map(Number).sort((a, b) => a - b);
  const activeDayExercises = diyExercisesByDay[diyActiveDay] ?? [];
  const totalExerciseCount = Object.values(diyExercisesByDay).reduce((acc, exs) => acc + exs.length, 0);

  const openPicker = () => {
    setNav("forward");
    setView("picker");
  };
  const closePicker = () => {
    setNav("back");
    setView("plan");
  };

  // Escape steps back one level: picker -> plan -> close the builder.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector(".sheet-panel")) return;
      if (view === "picker") closePicker();
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, onClose]);

  const countInActiveDay = (ex: Exercise) => activeDayExercises.filter((e) => e.id === ex.id).length;

  const addExerciseToActiveDay = (ex: Exercise) => {
    setDiyExercisesByDay((prev) => ({ ...prev, [diyActiveDay]: [...(prev[diyActiveDay] ?? []), ex] }));
  };

  const removeExerciseAt = (idx: number) => {
    setDiyExercisesByDay((prev) => ({ ...prev, [diyActiveDay]: (prev[diyActiveDay] ?? []).filter((_, i) => i !== idx) }));
  };

  const updatePrescription = (idx: number, prescription: DiyPrescription) => {
    setDiyExercisesByDay((prev) => ({
      ...prev,
      [diyActiveDay]: (prev[diyActiveDay] ?? []).map((ex, i) => (i === idx ? { ...ex, prescription } : ex)),
    }));
  };

  const reorderActiveDay = (from: number, to: number) => {
    setDiyExercisesByDay((prev) => {
      const list = [...(prev[diyActiveDay] ?? [])];
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return { ...prev, [diyActiveDay]: list };
    });
  };

  // In the picker, an added exercise's button turns into a check; tapping it
  // again takes that exercise back out (its last occurrence in the day).
  const toggleExercise = (ex: Exercise) => {
    tapHaptic();
    const lastIdx = activeDayExercises.map((e) => e.id).lastIndexOf(ex.id);
    if (lastIdx === -1) addExerciseToActiveDay(ex);
    else removeExerciseAt(lastIdx);
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSaveDiyProgram();
      setJustSaved(true);
      notify(isEditingSavedProgram ? "התוכנית עודכנה בהצלחה!" : "התוכנית נשמרה בהצלחה!");
      setTimeout(() => setJustSaved(false), 1800);
    } finally {
      setIsSaving(false);
    }
  };

  // Removing or clearing a day is recoverable, so it happens at once with
  // an undo on the toast (Apple's "forgiveness": undo for slips, a
  // confirmation only for what can't be taken back).
  const removeDay = (day: number) => {
    const snapshot = diyExercisesByDay[day] ?? [];
    onRemoveDiyDay(day);
    notify(`יום ${day} הוסר`, "info", {
      action: { label: "ביטול", onClick: () => setDiyExercisesByDay((prev) => ({ ...prev, [day]: snapshot })) },
    });
  };

  const clearActiveDay = () => {
    const day = diyActiveDay;
    const snapshot = diyExercisesByDay[day] ?? [];
    setDiyExercisesByDay((prev) => ({ ...prev, [day]: [] }));
    notify(`יום ${day} נוקה`, "info", {
      action: { label: "ביטול", onClick: () => setDiyExercisesByDay((prev) => ({ ...prev, [day]: snapshot })) },
    });
  };

  const removeExerciseWithUndo = (idx: number) => {
    const day = diyActiveDay;
    const snapshot = diyExercisesByDay[day] ?? [];
    const removed = snapshot[idx];
    removeExerciseAt(idx);
    if (removed) {
      notify(`"${getExerciseName(removed, lang)}" הוסר`, "info", {
        action: { label: "ביטול", onClick: () => setDiyExercisesByDay((prev) => ({ ...prev, [day]: snapshot })) },
      });
    }
  };

  const iconButton =
    "w-10 h-10 rounded-full bg-elevated shadow-card flex items-center justify-center shrink-0 text-fg hover:bg-line active:scale-90 transition-ui duration-150 ease-out";

  // Day tabs — always visible, independent of whether the active day has
  // any exercises yet, so a newly-added empty day can still be switched to
  // and filled. A day can only be removed once a second day exists.
  const dayTabs = (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3.5 pb-1 -mx-4 px-4">
      {dayNumbers.map((day) => {
        const isActive = diyActiveDay === day;
        const count = diyExercisesByDay[day]?.length ?? 0;
        return (
          <div key={day} className="relative shrink-0">
            <button
              onClick={() => setDiyActiveDay(day)}
              className={`flex items-center gap-1.5 pl-3 pr-4 py-2.5 rounded-full font-extrabold text-xs transition-ui duration-150 ease-out border ${
                isActive ? "bg-accent text-on-accent border-accent" : "bg-elevated/90 backdrop-blur-md text-muted border-line hover:border-accent/40"
              } active:scale-[0.97]`}
            >
              יום {day}
              {count > 0 && <span className={`text-[0.6875rem] rounded-full px-1.5 py-0.5 ${isActive ? "bg-on-accent/15" : "bg-fg/10 text-muted"}`}>{count}</span>}
            </button>
            {dayNumbers.length > 1 && (
              <button
                onClick={() => removeDay(day)}
                aria-label={`הסר יום ${day}`}
                className="group absolute -top-3.5 -left-3.5 w-8 h-8 flex items-center justify-center transition-ui duration-150 ease-out active:scale-[0.97]"
              >
                <span className="w-4 h-4 bg-line text-fg group-hover:bg-danger group-hover:text-on-danger rounded-full flex items-center justify-center shadow-md transition-colors">
                  <X size={8} strokeWidth={3} />
                </span>
              </button>
            )}
          </div>
        );
      })}
      <button
        onClick={onAddDiyDay}
        className="shrink-0 flex items-center gap-1 pl-3 pr-3.5 py-2.5 rounded-full font-extrabold text-xs bg-accent/15 text-accent-fg border border-dashed border-accent/50 hover:bg-accent/25 transition-ui duration-150 ease-out active:scale-[0.97]"
      >
        <Plus size={14} />
        הוסף יום
      </button>
    </div>
  );

  const shell = "fixed inset-0 z-[120] bg-page text-fg flex flex-col overflow-hidden animate-screen-up print:hidden";
  const column = "max-w-2xl w-full mx-auto px-4";
  const header = "shrink-0 bg-page/95 backdrop-blur-md border-b border-line pt-[max(0.75rem,env(safe-area-inset-top))] pb-3";
  const footer = "shrink-0 bg-elevated/95 backdrop-blur-md border-t border-line pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]";

  if (view === "picker") {
    return (
      <div data-toast-top role="dialog" aria-modal="true" aria-label="הוספת תרגילים" className={shell}>
        <header className={header}>
          <div className={column}>
            <div className="flex items-center gap-3">
              <button onClick={closePicker} aria-label="חזרה לתוכנית" className={iconButton}>
                {/* ChevronRight, not Left: "back" in RTL points right */}
                <ChevronRight size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black tracking-tight truncate">הוספת תרגילים</h2>
                <p className="text-[0.6875rem] font-bold text-muted">ליום {diyActiveDay}</p>
              </div>
            </div>

          </div>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div key="picker" className={`${column} pb-4 ${nav === "forward" ? "animate-step-in" : ""}`}>
            <ExerciseCatalogBrowser
              exerciseCatalog={exerciseCatalog}
              onViewExerciseInfo={onViewExerciseInfo}
              equipFilter={diyEquipFilter}
              setEquipFilter={setDiyEquipFilter}
              categoryFilter={diyCategoryFilter}
              setCategoryFilter={setDiyCategoryFilter}
              bodyPartFilter={diyBodyPartFilter}
              setBodyPartFilter={setDiyBodyPartFilter}
              isSelected={(ex) => countInActiveDay(ex) > 0}
              renderAction={(ex) => {
                const added = countInActiveDay(ex);
                return (
                  <button
                    onClick={() => toggleExercise(ex)}
                    aria-label={added > 0 ? "הסר מהאימון" : "הוסף לאימון"}
                    aria-pressed={added > 0}
                    className={`relative w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-ui duration-150 ease-out ${
                      added > 0 ? "bg-accent text-on-accent" : "bg-accent/15 text-accent-fg hover:bg-accent/25"
                    }`}
                  >
                    {added > 0 ? <Check size={18} strokeWidth={3} /> : <Plus size={18} />}
                    {added > 1 && (
                      <span className="absolute -top-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-fg text-page text-[0.625rem] font-black flex items-center justify-center">{added}</span>
                    )}
                  </button>
                );
              }}
            />
          </div>
        </main>

        <footer className={footer}>
          <div className={`${column} flex items-center gap-3`}>
            <div className="flex-1 min-w-0">
              <div className="text-[0.6875rem] font-bold text-muted">יום {diyActiveDay}</div>
              <div className="text-sm font-black text-fg truncate">
                {activeDayExercises.length > 0 ? countLabel(activeDayExercises.length, "תרגיל אחד נבחר", "תרגילים נבחרו") : "עדיין לא נבחרו תרגילים"}
              </div>
            </div>
            <button
              onClick={closePicker}
              className="shrink-0 bg-btn-primary text-btn-primary-fg font-black text-sm px-7 py-3.5 rounded-2xl hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors shadow-lg"
            >
              סיום
            </button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div data-toast-top role="dialog" aria-modal="true" aria-label="בניית אימון" className={shell}>
      <header className={header}>
        <div className={column}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} aria-label="סגור את בניית האימון" className={iconButton}>
              <X size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[0.6875rem] font-bold text-muted">{isEditingSavedProgram ? "עריכת תוכנית שמורה" : "בניית אימון"}</p>
              <label className="relative flex items-center gap-2">
                <span className="sr-only">שם התוכנית</span>
                <input
                  type="text"
                  value={diyProgramName}
                  onChange={(e) => setDiyProgramName(e.target.value)}
                  maxLength={MAX_CATALOG_TITLE_LENGTH}
                  placeholder="שם התוכנית"
                  className="field-sizing-content min-w-[6ch] max-w-full bg-transparent text-xl font-black tracking-tight text-fg outline-none rounded-lg -mx-1 px-1 py-0.5 focus:bg-elevated focus:ring-2 focus:ring-focus placeholder:text-muted"
                />
                <Pencil size={14} className="shrink-0 text-muted pointer-events-none" />
              </label>
            </div>
            {isEditingSavedProgram && (
              <button onClick={onCancelEditSavedProgram} className="shrink-0 text-[0.6875rem] font-bold text-muted hover:text-fg transition-ui duration-150 ease-out active:scale-[0.97]">
                שמור כחדשה
              </button>
            )}
          </div>
          {dayTabs}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div key="plan" className={`${column} py-5 ${nav === "back" ? "animate-step-back" : ""}`}>
          {activeDayExercises.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-sm text-fg">
                  יום {diyActiveDay} · {countLabel(activeDayExercises.length, "תרגיל אחד", "תרגילים")}
                </h3>
                <button onClick={clearActiveDay} className="text-[0.6875rem] font-bold text-muted hover:text-fg transition-ui duration-150 ease-out active:scale-[0.97]">
                  נקה יום זה
                </button>
              </div>

              <DiyDayList
                exercises={activeDayExercises}
                onChangePrescription={updatePrescription}
                onReorder={reorderActiveDay}
                onRemove={removeExerciseWithUndo}
                onViewExerciseInfo={onViewExerciseInfo}
              />

              <button
                onClick={openPicker}
                className="mt-3.5 w-full bg-accent/8 border-[1.5px] border-dashed border-accent/40 text-accent-fg font-extrabold text-sm py-4 rounded-[1.25rem] flex items-center justify-center gap-2 hover:bg-accent/12 transition-ui duration-150 ease-out active:scale-[0.98]"
              >
                <Plus size={17} />
                הוסף תרגילים
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center text-center pt-14 pb-8 gap-2">
              <div className="w-16 h-16 rounded-full bg-accent/15 text-accent-fg flex items-center justify-center mb-2">
                <Dumbbell size={28} />
              </div>
              <h3 className="text-lg font-black text-fg">יום {diyActiveDay} עדיין ריק</h3>
              <p className="text-muted text-sm max-w-xs">בחר תרגילים מהמאגר — אפשר לחפש לפי שם או לעבור לפי קטגוריה ואזור בגוף.</p>
              <button
                onClick={openPicker}
                className="mt-5 bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg font-black text-sm px-7 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <Plus size={17} />
                הוסף תרגילים
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className={footer}>
        <div className={`${column} flex gap-2.5`}>
          <button
            onClick={handleSaveClick}
            disabled={isSaving || totalExerciseCount === 0}
            className={`flex-1 border-[1.5px] font-extrabold text-[0.8125rem] py-3.5 rounded-2xl flex items-center justify-center gap-1.5 transition-ui duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none ${
              justSaved ? "bg-accent border-accent text-on-accent" : "bg-transparent border-btn-secondary text-accent-fg hover:bg-btn-secondary-hover"
            } active:scale-[0.97]`}
          >
            {justSaved ? <Check size={15} /> : <Bookmark size={15} />}
            {justSaved ? "נשמר!" : isEditingSavedProgram ? "עדכן תוכנית" : "שמור תוכנית"}
          </button>
          <button
            onClick={onStartDiyWorkoutNow}
            disabled={activeDayExercises.length === 0}
            className="flex-[1.5] bg-btn-primary text-btn-primary-fg font-black text-sm py-3.5 rounded-2xl hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors shadow-lg disabled:bg-disabled disabled:text-disabled-fg disabled:shadow-none disabled:pointer-events-none"
          >
            התחל את יום {diyActiveDay}
          </button>
        </div>
      </footer>
    </div>
  );
}
