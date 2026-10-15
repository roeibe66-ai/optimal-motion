"use client";

import { useState } from "react";
import { ChevronLeft, Folder, Pencil, Plus } from "lucide-react";
import ExerciseCatalogBrowser from "@/app/components/patient/tabs/ExerciseCatalogBrowser";
import type { Exercise } from "@/app/types";
import { countLabel } from "@/app/utils/format";
import { useAddress } from "@/app/hooks/useAddress";

interface DiyHubScreenProps {
  draftName: string;
  draftDayCount: number;
  draftExerciseCount: number;
  isEditingSavedProgram: boolean;
  onContinueDraft: () => void;
  onStartNew: () => void;
  savedProgramCount: number;
  onOpenMyWorkouts: () => void;
  exerciseCatalog: Exercise[];
  onViewExerciseInfo: (exercise: Exercise) => void;
}

// Root of the "בנה אימון" tab: the entry point into the full-screen builder
// (DiyBuilderTab) — a new workout, or the unfinished draft if there is one —
// a small folder button into "התוכניות שלי", and the whole exercise catalog
// underneath, read-only, for patients who just want to explore exercises.
export default function DiyHubScreen({
  draftName,
  draftDayCount,
  draftExerciseCount,
  isEditingSavedProgram,
  onContinueDraft,
  onStartNew,
  savedProgramCount,
  onOpenMyWorkouts,
  exerciseCatalog,
  onViewExerciseInfo,
}: DiyHubScreenProps) {
  const t = useAddress();
  const hasDraft = draftExerciseCount > 0 || isEditingSavedProgram;
  // The explore catalog keeps its own filters, separate from the builder
  // picker's, so browsing here never rearranges the picker.
  const [equipFilter, setEquipFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [bodyPartFilter, setBodyPartFilter] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-fg tracking-tight mb-1.5">{t("בנה אימון")}</h2>
          <p className="text-muted text-[0.8125rem] md:text-sm">{t("בנה תוכנית משלך או גלה תרגילים מהמאגר.")}</p>
        </div>
        <button
          onClick={onOpenMyWorkouts}
          className="shrink-0 mt-0.5 flex items-center gap-1.5 bg-elevated/90 backdrop-blur-md border border-line text-muted font-bold text-[0.6875rem] px-3 py-2.5 rounded-full whitespace-nowrap hover:border-accent/40 transition-ui duration-150 ease-out shadow-sm active:scale-[0.97]"
        >
          <Folder size={14} className="text-accent-fg" />
          התוכניות שלי
          {savedProgramCount > 0 && <span className="text-[0.6875rem] rounded-full px-1.5 py-0.5 bg-fg/10 text-muted tabular-nums">{savedProgramCount}</span>}
        </button>
      </div>

      <div className="flex flex-col gap-2.5 mb-8">
        {hasDraft && (
          <button
            onClick={onContinueDraft}
            className="on-light w-full bg-surface border border-accent/50 rounded-[1.25rem] p-3.5 flex items-center gap-3 text-start shadow-card hover:border-accent transition-ui duration-150 ease-out active:scale-[0.98]"
          >
            <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent-fg flex items-center justify-center shrink-0">
              <Pencil size={17} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[0.6875rem] font-bold text-accent-fg">{isEditingSavedProgram ? "ממשיך לערוך" : "המשך מאיפה שעצרת"}</span>
              <span className="block text-sm font-black text-fg truncate">{draftName || "תוכנית ללא שם"}</span>
              <span className="block text-[0.6875rem] text-muted">
                {countLabel(draftDayCount, "יום אחד", "ימים")} · {countLabel(draftExerciseCount, "תרגיל אחד", "תרגילים")}
              </span>
            </span>
            {/* ChevronLeft: "forward" in RTL */}
            <ChevronLeft size={18} className="text-muted shrink-0" />
          </button>
        )}

        <button
          onClick={onStartNew}
          className="w-full bg-btn-primary text-btn-primary-fg rounded-[1.25rem] p-4 flex items-center gap-3.5 text-start shadow-lg hover:bg-btn-primary-hover active:bg-btn-primary-active transition-ui duration-150 ease-out active:scale-[0.98]"
        >
          <span className="w-11 h-11 rounded-xl bg-btn-primary-fg/15 flex items-center justify-center shrink-0">
            <Plus size={22} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-base font-black">{hasDraft ? t("התחל אימון חדש") : t("בנה אימון חדש")}</span>
            <span className="block text-xs font-medium opacity-80 mt-0.5">{t("בחר תרגילים, סטים, חזרות ומנוחה")}</span>
          </span>
          <ChevronLeft size={20} className="shrink-0 opacity-80" />
        </button>
      </div>

      <div>
        <h3 className="text-lg font-black text-fg tracking-tight">מאגר התרגילים</h3>
        <p className="text-xs text-muted mt-0.5">{t("לחץ על תרגיל לצפייה בהדגמה ובדגשי ביצוע.")}</p>
        <ExerciseCatalogBrowser
          exerciseCatalog={exerciseCatalog}
          onViewExerciseInfo={onViewExerciseInfo}
          equipFilter={equipFilter}
          setEquipFilter={setEquipFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          bodyPartFilter={bodyPartFilter}
          setBodyPartFilter={setBodyPartFilter}
          stickyTopClassName="top-[env(safe-area-inset-top)]"
        />
      </div>
    </div>
  );
}
