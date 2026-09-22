"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Bookmark, Check, ChevronDown, ChevronRight, Folder, Info, Plus, X } from "lucide-react";
import Toast from "@/app/components/ui/Toast";
import {
  AVAILABLE_MUSCLES,
  BODY_PART_GROUPS,
  BODY_PART_STYLES,
  CATEGORY_IMAGES,
  DEFAULT_BODY_PART_STYLE,
  DEFAULT_COURSE_IMG,
  DEFAULT_DIY_CATEGORY_STYLE,
  DIY_CATEGORY_STYLES,
  EQUIPMENT_LIST,
  MUSCLE_TO_BODY_PARTS,
} from "@/app/constants/catalog";
import { useAuth } from "@/app/context/AuthContext";
import { getExerciseName } from "@/app/utils/format";
import type { Exercise } from "@/app/types";

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
  // every "add exercise"/tray action below operates on that one day only.
  diyExercisesByDay: Record<number, Exercise[]>;
  setDiyExercisesByDay: Dispatch<SetStateAction<Record<number, Exercise[]>>>;
  diyActiveDay: number;
  setDiyActiveDay: (day: number) => void;
  onAddDiyDay: () => void;
  onRemoveDiyDay: (day: number) => void;
  diyProgramName: string;
  setDiyProgramName: (value: string) => void;
  onStartDiyWorkoutNow: () => void;
  onOpenMyWorkouts: () => void;
  onSaveDiyProgram: () => void | Promise<void>;
  isEditingSavedProgram: boolean;
  onCancelEditSavedProgram: () => void;
}

// The special first accordion tab: browse by body region across the whole
// catalog, with no category narrowing — distinct from the tabs below it,
// which are real values out of exercise.categories. Never shown to the user
// as a raw id (always rendered through TOP_LEVEL_TABS' own label).
const MUSCLE_GROUPS_TAB_ID = "__muscle_groups__";

const matchesEquip = (ex: Exercise, equipFilter: string) => equipFilter === "all" || (ex.equipment ?? []).includes(equipFilter);

const matchesCategory = (ex: Exercise, categoryId: string) => categoryId === MUSCLE_GROUPS_TAB_ID || ex.categories.includes(categoryId);

const matchesRegion = (ex: Exercise, regionId: string) => (ex.target_muscle ? MUSCLE_TO_BODY_PARTS[ex.target_muscle] : undefined)?.includes(regionId) ?? false;

// The "build your own workout" picker: a vertical accordion of top-level
// tabs (browse-everything "קבוצות שרירים" plus one per real exercise
// category), each expanding into a body-region sub-list before finally
// showing exercise cards — replaces the old flat horizontal chip filters
// (muscle/equipment/category/body-part all at once), which got cluttered
// fast and didn't scale past a handful of categories.
//
// FIXED (kept from the original): this used to also gate on
// `!loggedInPatient?.premium_tracks`, which is falsy for an *empty string*
// too — new fitness patients register with `premium_tracks: ""`, so that
// filter hid every exercise for them. The gate it was guarding for
// (`hasAccess`) was hardcoded `true` and never actually restricted
// anything, so for this MVP the catalog is simply shown in full, filtered
// only by the equipment picker and the accordion's own category/region
// narrowing.
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
  onOpenMyWorkouts,
  onSaveDiyProgram,
  isEditingSavedProgram,
  onCancelEditSavedProgram,
}: DiyBuilderTabProps) {
  const { lang } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dayNumbers = Object.keys(diyExercisesByDay).map(Number).sort((a, b) => a - b);
  const activeDayExercises = diyExercisesByDay[diyActiveDay] ?? [];
  const totalExerciseCount = Object.values(diyExercisesByDay).reduce((acc, exs) => acc + exs.length, 0);

  const addExerciseToActiveDay = (ex: Exercise) => {
    setDiyExercisesByDay((prev) => ({ ...prev, [diyActiveDay]: [...(prev[diyActiveDay] ?? []), ex] }));
  };

  const removeExerciseFromActiveDay = (idx: number) => {
    setDiyExercisesByDay((prev) => ({ ...prev, [diyActiveDay]: (prev[diyActiveDay] ?? []).filter((_, i) => i !== idx) }));
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSaveDiyProgram();
      setJustSaved(true);
      setToastMessage(isEditingSavedProgram ? "התוכנית עודכנה בהצלחה!" : "התוכנית נשמרה בהצלחה!");
      setTimeout(() => setJustSaved(false), 1800);
    } finally {
      setIsSaving(false);
    }
  };

  // Category tabs are derived from whatever values actually exist in the
  // live catalog (not hardcoded), so an exercise tagged with a category
  // outside that set still gets a working tab instead of becoming
  // unreachable — it just falls back to DEFAULT_DIY_CATEGORY_STYLE's
  // neutral color and DEFAULT_COURSE_IMG's header image.
  const availableCategories = Array.from(new Set(exerciseCatalog.flatMap((ex) => ex.categories).filter(Boolean)));
  const topLevelTabs = [
    { id: MUSCLE_GROUPS_TAB_ID, label: "קבוצות שרירים", image: DEFAULT_COURSE_IMG },
    ...availableCategories.map((cat) => ({ id: cat, label: cat, image: CATEGORY_IMAGES[cat] ?? DEFAULT_COURSE_IMG })),
  ];

  const toggleTab = (tabId: string) => {
    if (diyCategoryFilter === tabId) {
      setDiyCategoryFilter(null);
    } else {
      setDiyCategoryFilter(tabId);
      setDiyBodyPartFilter(null);
    }
  };

  // The card only ever shows one body-part pill - the most specific tag a
  // muscle has (chest/back/shoulders/arms/core/legs), falling back to the
  // upper-/lower-body umbrella only for muscles with no more specific tag.
  // No muscle data at all -> no tag, per spec.
  const getPrimaryBodyPart = (targetMuscle?: string) => {
    if (!targetMuscle) return undefined;
    const parts = MUSCLE_TO_BODY_PARTS[targetMuscle];
    if (!parts || parts.length === 0) return undefined;
    return parts.find((p) => p !== "upper-body" && p !== "lower-body") ?? parts[0];
  };

  return (
    <div className="animate-in fade-in duration-500">
      {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />}

      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight mb-1.5">בנה תוכנית שבועית</h2>
          <p className="text-stone-500 text-[13px] md:text-sm">הוסף ימי אימון ובחר תרגילים לכל יום מהמאגר הפתוח שלך.</p>
        </div>
        <button
          onClick={onOpenMyWorkouts}
          className="shrink-0 mt-0.5 flex items-center gap-1.5 bg-white/70 backdrop-blur-md border border-stone-200 text-stone-600 font-bold text-[11px] px-3 py-2.5 rounded-full whitespace-nowrap hover:border-stone-300 transition-colors shadow-sm"
        >
          <Folder size={14} className="text-emerald-700" />
          התוכניות שלי
        </button>
      </div>

      {/* Day tabs — always visible, independent of whether the active day
          has any exercises yet, so a newly-added empty day can still be
          switched to and filled. A day can only be removed once a second
          day exists (never leaves the program with zero days). */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar">
        {dayNumbers.map((day) => {
          const isActive = diyActiveDay === day;
          const count = diyExercisesByDay[day]?.length ?? 0;
          return (
            <div key={day} className="relative shrink-0">
              <button
                onClick={() => setDiyActiveDay(day)}
                className={`flex items-center gap-1.5 pl-3 pr-4 py-2.5 rounded-full font-extrabold text-xs transition-colors border ${
                  isActive ? "bg-emerald-800 text-white border-emerald-800" : "bg-white/70 backdrop-blur-md text-stone-600 border-stone-200 hover:border-stone-300"
                }`}
              >
                יום {day}
                {count > 0 && (
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20" : "bg-stone-100 text-stone-500"}`}>{count}</span>
                )}
              </button>
              {dayNumbers.length > 1 && (
                <button
                  onClick={() => onRemoveDiyDay(day)}
                  aria-label={`הסר יום ${day}`}
                  className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-stone-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                >
                  <X size={8} strokeWidth={3} />
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={onAddDiyDay}
          className="shrink-0 flex items-center gap-1 pl-3 pr-3.5 py-2.5 rounded-full font-extrabold text-xs bg-emerald-50 text-emerald-700 border border-dashed border-emerald-300 hover:bg-emerald-100 transition-colors"
        >
          <Plus size={14} />
          הוסף יום
        </button>
      </div>

      {/* Equipment — the one filter that isn't a category/body-region
          concept, so it stays a simple standalone control above the
          accordion rather than folded into it. */}
      <div className="relative shrink-0 mb-5 w-fit">
        <select
          value={diyEquipFilter}
          onChange={(e) => setDiyEquipFilter(e.target.value)}
          className="appearance-none bg-white/70 backdrop-blur-md border border-stone-200 text-stone-700 rounded-full pl-9 pr-4 py-2.5 outline-none font-bold text-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 shadow-sm"
        >
          <option value="all">כל הציוד</option>
          {EQUIPMENT_LIST.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.label}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
      </div>

      {totalExerciseCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl mb-8 flex flex-col gap-3.5 sticky top-4 z-30 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-emerald-800 text-[13px]">
              יום {diyActiveDay} ({activeDayExercises.length} תרגילים)
            </h4>
            <div className="flex items-center gap-3">
              {isEditingSavedProgram && (
                <button onClick={onCancelEditSavedProgram} className="text-[11px] font-bold text-stone-500 hover:text-stone-700">
                  ביטול עריכה
                </button>
              )}
              {activeDayExercises.length > 0 && (
                <button
                  onClick={() => setDiyExercisesByDay((prev) => ({ ...prev, [diyActiveDay]: [] }))}
                  className="text-[11px] font-bold text-stone-500 hover:text-stone-700"
                >
                  נקה יום זה
                </button>
              )}
            </div>
          </div>

          {activeDayExercises.length > 0 ? (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
              {activeDayExercises.map((ex, idx) => (
                <div key={idx} className="bg-white border border-stone-200 rounded-2xl p-2 flex items-center gap-2 min-w-[140px] relative">
                  <button
                    onClick={() => removeExerciseFromActiveDay(idx)}
                    aria-label="הסר תרגיל"
                    className="absolute -top-3.5 -right-3.5 w-8 h-8 flex items-center justify-center"
                  >
                    <span className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md">
                      <X size={8} strokeWidth={3} />
                    </span>
                  </button>
                  {ex.gif_url ? (
                    ex.gif_url.toLowerCase().includes(".mp4") || ex.gif_url.toLowerCase().includes(".webm") ? (
                      <video src={ex.gif_url} className="w-9 h-9 rounded-[10px] bg-stone-100 object-contain" />
                    ) : (
                      <img src={ex.gif_url} alt={getExerciseName(ex, lang)} className="w-9 h-9 rounded-[10px] bg-stone-100 object-contain p-0.5" />
                    )
                  ) : (
                    <div className="w-9 h-9 rounded-[10px] bg-stone-100" />
                  )}
                  <span className="text-[11px] font-bold text-stone-700 truncate w-full">{getExerciseName(ex, lang)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] font-medium text-emerald-800/70">עדיין לא נבחרו תרגילים ליום {diyActiveDay}. בחר תרגילים מהרשימה למטה.</p>
          )}

          <div>
            <label htmlFor="diy-program-name" className="block text-[10px] font-extrabold text-emerald-800 uppercase mb-1.5">
              שם התוכנית
            </label>
            <input
              id="diy-program-name"
              type="text"
              value={diyProgramName}
              onChange={(e) => setDiyProgramName(e.target.value)}
              className="w-full bg-white border border-stone-200 text-stone-900 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30"
            />
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={handleSaveClick}
              disabled={isSaving}
              className={`flex-1 border-[1.5px] font-extrabold text-[13px] py-3.5 rounded-2xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-70 ${
                justSaved ? "bg-emerald-700 border-emerald-700 text-white" : "bg-white border-emerald-700/40 text-emerald-800 hover:bg-emerald-50"
              }`}
            >
              {justSaved ? <Check size={15} /> : <Bookmark size={15} />}
              {justSaved ? "נשמר!" : isEditingSavedProgram ? "עדכן תוכנית" : "שמור תוכנית"}
            </button>
            <button
              onClick={onStartDiyWorkoutNow}
              disabled={activeDayExercises.length === 0}
              className="flex-[1.5] bg-emerald-800 text-white font-black text-sm py-3.5 rounded-2xl hover:bg-emerald-900 transition-colors shadow-lg disabled:opacity-40 disabled:pointer-events-none"
            >
              התחל את יום {diyActiveDay} עכשיו
            </button>
          </div>
        </div>
      )}

      {/* Accordion stack — glassmorphism cards, one per top-level tab.
          Expand/collapse and the header-image fade both animate via plain
          CSS transitions (grid-template-rows for height, opacity+width for
          the image) rather than a JS animation library — this app has no
          Framer Motion dependency, and the effect doesn't need one. */}
      <div className="flex flex-col gap-3.5">
        {topLevelTabs.map((tab) => {
          const isExpanded = diyCategoryFilter === tab.id;
          const tabStyle = tab.id === MUSCLE_GROUPS_TAB_ID ? null : DIY_CATEGORY_STYLES[tab.id] ?? DEFAULT_DIY_CATEGORY_STYLE;
          const selectedRegion = isExpanded ? diyBodyPartFilter : null;

          return (
            <div key={tab.id} className="rounded-[1.75rem] overflow-hidden bg-white/60 backdrop-blur-lg border border-white/40 shadow-sm">
              <button onClick={() => toggleTab(tab.id)} className="w-full flex items-center gap-3 p-5 text-start">
                {tabStyle && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tabStyle.solid }} />}
                <span className="flex-1 font-black text-lg text-stone-900 truncate">{tab.label}</span>

                {/* Dynamic header image — grows in from 0 width with a fade,
                    cropped cleanly inside its own rounded thumbnail rather
                    than bleeding across the card. */}
                <div
                  className={`shrink-0 overflow-hidden rounded-2xl shadow-md transition-all duration-500 ease-out ${
                    isExpanded ? "w-14 h-14 opacity-100" : "w-0 h-14 opacity-0"
                  }`}
                >
                  <img src={tab.image} alt="" className="w-14 h-14 object-cover" />
                </div>

                <ChevronDown size={18} className={`shrink-0 text-stone-500 transition-transform duration-300 ease-out ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div className="px-5 pb-5">
                    {selectedRegion === null ? (
                      // Sub-category regions — broad body areas, not individual
                      // muscles, each with a live count so an empty region
                      // never shows up as a dead end.
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {BODY_PART_GROUPS.map((region) => {
                          const count = exerciseCatalog.filter(
                            (ex) => matchesCategory(ex, tab.id) && matchesEquip(ex, diyEquipFilter) && matchesRegion(ex, region.id)
                          ).length;
                          if (count === 0) return null;
                          const regionStyle = BODY_PART_STYLES[region.id] ?? DEFAULT_BODY_PART_STYLE;
                          return (
                            <button
                              key={region.id}
                              onClick={() => setDiyBodyPartFilter(region.id)}
                              className="flex flex-col items-start gap-1 rounded-2xl p-3.5 bg-white/70 border border-white/60 hover:bg-white transition-colors text-start"
                            >
                              <span className="font-extrabold text-sm" style={{ color: regionStyle.text }}>
                                {region.label}
                              </span>
                              <span className="text-[11px] font-bold text-stone-500">{count} תרגילים</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div>
                        <button
                          onClick={() => setDiyBodyPartFilter(null)}
                          className="flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-800 mb-3.5 transition-colors"
                        >
                          <ChevronRight size={14} />
                          {BODY_PART_GROUPS.find((r) => r.id === selectedRegion)?.label ?? selectedRegion}
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {exerciseCatalog
                            .filter((ex) => matchesCategory(ex, tab.id) && matchesEquip(ex, diyEquipFilter) && matchesRegion(ex, selectedRegion))
                            .map((ex) => {
                              const style = DIY_CATEGORY_STYLES[ex.categories[0]] ?? DEFAULT_DIY_CATEGORY_STYLE;
                              return (
                                <div
                                  key={ex.id}
                                  className="bg-white rounded-[1.25rem] p-3 border border-stone-100 shadow-sm flex items-center justify-between gap-3 hover:border-stone-200 transition-colors"
                                >
                                  <div className="flex items-center gap-3 w-full overflow-hidden">
                                    {ex.gif_url ? (
                                      ex.gif_url.toLowerCase().includes(".mp4") || ex.gif_url.toLowerCase().includes(".webm") ? (
                                        <video src={ex.gif_url} className="w-[52px] h-[52px] rounded-2xl bg-stone-100 object-contain shrink-0" />
                                      ) : (
                                        <img
                                          src={ex.gif_url}
                                          alt={getExerciseName(ex, lang)}
                                          className="w-[52px] h-[52px] rounded-2xl bg-stone-50 object-contain shrink-0 p-1"
                                        />
                                      )
                                    ) : (
                                      <div className="w-[52px] h-[52px] rounded-2xl bg-stone-100 shrink-0" />
                                    )}

                                    <div className="overflow-hidden">
                                      <h4 className="font-extrabold text-stone-900 text-[13px] truncate">{getExerciseName(ex, lang)}</h4>
                                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        <span className="text-[11px] text-stone-500 truncate">
                                          {AVAILABLE_MUSCLES.find((m) => m.id === ex.target_muscle)?.label}
                                        </span>
                                        <span className="w-[3px] h-[3px] rounded-full bg-stone-300 shrink-0"></span>
                                        <span
                                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap"
                                          style={{ background: style.bg, color: style.text }}
                                        >
                                          {ex.categories.join(" / ")}
                                        </span>
                                        {(() => {
                                          const bodyPartId = getPrimaryBodyPart(ex.target_muscle);
                                          if (!bodyPartId) return null;
                                          const bodyPartStyle = BODY_PART_STYLES[bodyPartId] ?? DEFAULT_BODY_PART_STYLE;
                                          const bodyPartLabel = BODY_PART_GROUPS.find((p) => p.id === bodyPartId)?.label;
                                          return (
                                            <span
                                              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap"
                                              style={{ background: bodyPartStyle.bg, color: bodyPartStyle.text }}
                                            >
                                              {bodyPartLabel}
                                            </span>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => onViewExerciseInfo(ex)}
                                      aria-label="מידע על התרגיל"
                                      className="w-9 h-9 rounded-full bg-stone-50 text-stone-500 flex items-center justify-center hover:bg-stone-100 hover:text-stone-700 transition-colors"
                                    >
                                      <Info size={16} />
                                    </button>
                                    <button
                                      onClick={() => addExerciseToActiveDay(ex)}
                                      aria-label="הוסף לאימון"
                                      className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                                    >
                                      <Plus size={18} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
