"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Building2, Check, Home, RefreshCw, RotateCcw } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import type { Exercise } from "@/app/types";
import Modal from "@/app/components/ui/Modal";
import { ExerciseThumb } from "@/app/components/ExerciseMedia";
import { AVAILABLE_MUSCLES, DIFFICULTY_LEVELS, EQUIPMENT_LIST } from "@/app/constants/catalog";
import { countLabel, getExerciseName } from "@/app/utils/format";
import { pageOf, rankSwapCandidates, SWAP_TIER_CYCLE, type SwapSetting, type SwapTier } from "@/app/utils/exerciseSwap";

interface SwapExerciseSheetProps {
  original: Exercise; // what the program prescribed for this slot
  current: Exercise; // what's on screen now (the original, or an earlier swap)
  catalog: Exercise[];
  excludeIds: Set<string>; // exercises already in this session
  setting: SwapSetting; // inferred from the workout unless the patient changed it
  isSettingInferred: boolean;
  onChangeSetting: (setting: SwapSetting) => void;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}

// Every accessory a patient might have at home (bodyweight is always assumed).
const HOME_GEAR = EQUIPMENT_LIST.filter((e) => e.id !== "bodyweight" && !e.gymOnly);

const TIER_LABEL: Record<SwapTier, string> = {
  same: "באותה רמה",
  harder: "קשים יותר",
  easier: "קלים יותר",
};
const TIER_EMPTY: Record<SwapTier, string> = {
  same: "לא נמצאו תרגילים חלופיים באותה רמה.",
  harder: "לא נמצאו תרגילים קשים יותר לאותו שריר.",
  easier: "לא נמצאו תרגילים קלים יותר לאותו שריר.",
};

// Mid-workout "swap this exercise" sheet: 5 alternatives for the same main
// muscle, ranked by shared assisting muscles and filtered by where the
// patient is training. Refresh cycles same level → harder → easier.
export default function SwapExerciseSheet({ original, current, catalog, excludeIds, setting, isSettingInferred, onChangeSetting, onPick, onClose }: SwapExerciseSheetProps) {
  const { lang } = useAuth();
  const [refreshCount, setRefreshCount] = useState(0);

  const tier = SWAP_TIER_CYCLE[refreshCount % SWAP_TIER_CYCLE.length];
  const batch = Math.floor(refreshCount / SWAP_TIER_CYCLE.length);

  const exclude = useMemo(() => {
    const ids = new Set(excludeIds);
    ids.add(current.id);
    return ids;
  }, [excludeIds, current.id]);

  const candidates = useMemo(
    () => pageOf(rankSwapCandidates(original, catalog, setting, tier, exclude), batch),
    [original, catalog, setting, tier, exclude, batch]
  );

  const muscleLabel = AVAILABLE_MUSCLES.find((m) => m.id === original.target_muscle)?.label ?? original.target_muscle;
  const originalLevel = DIFFICULTY_LEVELS.find((l) => l.id === original.difficulty_level)?.label;
  const isSwapped = current.id !== original.id;

  const changeSetting = (next: SwapSetting) => {
    onChangeSetting(next);
    setRefreshCount(0);
  };
  const toggleGear = (id: string) =>
    changeSetting({ mode: "home", gear: setting.gear.includes(id) ? setting.gear.filter((g) => g !== id) : [...setting.gear, id] });

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-[scale,background-color,color,border-color] duration-150 ease-out active:scale-95 ${
      active ? "bg-accent text-on-accent border-transparent" : "bg-transparent text-muted border-line hover:text-fg"
    }`;

  return (
    <Modal onClose={onClose} title="החלפת תרגיל" icon={<ArrowLeftRight size={20} className="text-accent-fg" />}>
      <p className="text-start text-sm text-muted mb-4">
        חלופות ל<span className="font-bold text-fg">{getExerciseName(original, lang)}</span>
        {muscleLabel && <> · שריר מרכזי: <span className="font-bold text-fg">{muscleLabel}</span></>}
        {originalLevel && <> · רמה: {originalLevel}</>}
      </p>

      {/* Where am I training — filters by equipment. */}
      {isSettingInferred && (
        <p className="text-start text-[0.6875rem] font-bold text-muted mb-1.5">זוהה לפי האימון ולפי מה שענית בשאלון — אפשר לשנות:</p>
      )}
      <div className="flex flex-wrap gap-2 mb-2">
        <button onClick={() => changeSetting({ ...setting, mode: "gym" })} aria-pressed={setting.mode === "gym"} className={chip(setting.mode === "gym")}>
          <Building2 size={13} /> במכון
        </button>
        <button onClick={() => changeSetting({ ...setting, mode: "home" })} aria-pressed={setting.mode === "home"} className={chip(setting.mode === "home")}>
          <Home size={13} /> בבית
        </button>
      </div>
      {setting.mode === "home" && (
        <div className="mb-4">
          <p className="text-start text-[0.6875rem] font-bold text-muted mb-1.5">אביזרים שיש לי (משקל גוף תמיד כלול):</p>
          <div className="flex flex-wrap gap-1.5">
            {HOME_GEAR.map((g) => {
              const on = setting.gear.includes(g.id);
              return (
                <button key={g.id} onClick={() => toggleGear(g.id)} aria-pressed={on} className={chip(on)}>
                  {on && <Check size={12} />} {g.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-5 mb-3">
        <span className="text-sm font-black text-fg">{TIER_LABEL[tier]}</span>
        <button
          onClick={() => setRefreshCount((n) => n + 1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-fg px-3 py-1.5 rounded-full bg-accent/15 active:scale-95 transition-transform duration-150 ease-out"
        >
          <RefreshCw size={13} /> רענון · {TIER_LABEL[SWAP_TIER_CYCLE[(refreshCount + 1) % SWAP_TIER_CYCLE.length]]}
        </button>
      </div>

      {candidates.length === 0 ? (
        <p className="text-center text-sm text-muted py-8">{TIER_EMPTY[tier]}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {candidates.map(({ exercise, sharedMuscles }) => {
            const level = DIFFICULTY_LEVELS.find((l) => l.id === exercise.difficulty_level)?.label;
            const gear = (exercise.equipment ?? [])
              .filter((id) => id !== "bodyweight")
              .map((id) => EQUIPMENT_LIST.find((e) => e.id === id)?.label ?? id);
            return (
              <li key={exercise.id}>
                <button
                  onClick={() => onPick(exercise)}
                  className="w-full flex items-center gap-3 p-2 rounded-2xl border border-line hover:border-muted bg-fg/[0.03] text-start active:scale-[0.98] transition-[scale,border-color] duration-150 ease-out"
                >
                  <ExerciseThumb exercise={exercise} alt={getExerciseName(exercise, lang)} className="w-14 h-14 shrink-0 rounded-xl bg-fg/10" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-fg text-sm leading-snug line-clamp-2 [overflow-wrap:anywhere]">{getExerciseName(exercise, lang)}</span>
                    <span className="block text-[0.6875rem] text-muted mt-0.5">
                      {[level ?? "רמה לא מוגדרת", gear.length > 0 ? gear.join(", ") : "משקל גוף", sharedMuscles > 0 ? countLabel(sharedMuscles, "שריר עזר משותף", "שרירי עזר משותפים") : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {isSwapped && (
        <button
          onClick={() => onPick(original)}
          className="mt-5 w-full inline-flex items-center justify-center gap-1.5 text-sm font-bold text-muted hover:text-fg py-3 rounded-full border border-line active:scale-[0.98] transition-[scale,color] duration-150 ease-out"
        >
          <RotateCcw size={14} /> חזרה לתרגיל המקורי
        </button>
      )}
    </Modal>
  );
}
