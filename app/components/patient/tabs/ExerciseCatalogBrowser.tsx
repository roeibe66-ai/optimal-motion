"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Info, Search, X } from "lucide-react";
import {
  AVAILABLE_MUSCLES,
  BODY_PART_GROUPS,
  BODY_PART_STYLES,
  DEFAULT_BODY_PART_STYLE,
  DEFAULT_DIY_CATEGORY_STYLE,
  DIY_CATEGORY_STYLES,
  EQUIPMENT_LIST,
  MUSCLE_TO_BODY_PARTS,
} from "@/app/constants/catalog";
import { useAuth } from "@/app/context/AuthContext";
import { ECCO_CATEGORY_IMAGES, ECCO_MUSCLE_GROUPS_IMAGE, ECCO_REGION_IMAGES } from "@/app/constants/ecco";
import { MEDIA_STUDIO_BG } from "@/app/utils/media";
import { ExerciseThumb } from "@/app/components/ExerciseMedia";
import type { Exercise } from "@/app/types";
import { countLabel, getExerciseName } from "@/app/utils/format";

interface ExerciseCatalogBrowserProps {
  exerciseCatalog: Exercise[];
  onViewExerciseInfo: (exercise: Exercise) => void;
  equipFilter: string;
  setEquipFilter: (value: string) => void;
  categoryFilter: string | null;
  setCategoryFilter: (value: string | null) => void;
  bodyPartFilter: string | null;
  setBodyPartFilter: (value: string | null) => void;
  // Builder picker: the add/remove button at the end of each card, and
  // whether a card is already in the day (accent border). Without it the
  // browser is read-only — the whole card opens the exercise's info sheet.
  renderAction?: (exercise: Exercise) => ReactNode;
  isSelected?: (exercise: Exercise) => boolean;
  // Where the search bar sticks; the patient shell scrolls under the notch.
  stickyTopClassName?: string;
}

// The special first accordion tab: browse by body region across the whole
// catalog, with no category narrowing — distinct from the tabs below it,
// which are real values out of exercise.categories. Never shown to the user
// as a raw id (always rendered through topLevelTabs' own label).
const MUSCLE_GROUPS_TAB_ID = "__muscle_groups__";

const matchesEquip = (ex: Exercise, equipFilter: string) => equipFilter === "all" || (ex.equipment ?? []).includes(equipFilter);

const matchesCategory = (ex: Exercise, categoryId: string) => categoryId === MUSCLE_GROUPS_TAB_ID || ex.categories.includes(categoryId);

const matchesRegion = (ex: Exercise, regionId: string) => (ex.target_muscle ? MUSCLE_TO_BODY_PARTS[ex.target_muscle] : undefined)?.includes(regionId) ?? false;

const matchesQuery = (ex: Exercise, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [ex.name_he, ex.name_en].some((n) => n?.toLowerCase().includes(q));
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

// The exercise catalog: search + equipment (sticky at the top of whatever
// scrolls it), then either flat search results or the category -> body
// region accordion. Used by the builder's "add exercises" picker and,
// read-only, by the "בנה אימון" tab's home screen for just exploring.
//
// FIXED (kept from the original builder): the catalog used to also gate on
// `!loggedInPatient?.premium_tracks`, which is falsy for an *empty string*
// too — new fitness patients register with `premium_tracks: ""`, so that
// filter hid every exercise for them. For this MVP the catalog is shown in
// full, filtered only by search, equipment and the accordion's narrowing.
export default function ExerciseCatalogBrowser({
  exerciseCatalog,
  onViewExerciseInfo,
  equipFilter,
  setEquipFilter,
  categoryFilter,
  setCategoryFilter,
  bodyPartFilter,
  setBodyPartFilter,
  renderAction,
  isSelected,
  stickyTopClassName = "top-0",
}: ExerciseCatalogBrowserProps) {
  const { lang } = useAuth();
  const [query, setQuery] = useState("");

  // Category tabs are derived from whatever values actually exist in the
  // live catalog (not hardcoded), so an exercise tagged with a category
  // outside that set still gets a working tab instead of becoming
  // unreachable — it just falls back to DEFAULT_DIY_CATEGORY_STYLE's
  // neutral color and the muscle-groups Ecco art as its header image.
  const availableCategories = Array.from(new Set(exerciseCatalog.flatMap((ex) => ex.categories).filter(Boolean)));
  const topLevelTabs = [
    { id: MUSCLE_GROUPS_TAB_ID, label: "קבוצות שרירים", image: ECCO_MUSCLE_GROUPS_IMAGE },
    ...availableCategories.map((cat) => ({ id: cat, label: cat, image: ECCO_CATEGORY_IMAGES[cat] ?? ECCO_MUSCLE_GROUPS_IMAGE })),
  ];

  const toggleTab = (tabId: string) => {
    if (categoryFilter === tabId) {
      setCategoryFilter(null);
    } else {
      setCategoryFilter(tabId);
      setBodyPartFilter(null);
    }
  };

  const searchResults = query.trim() ? exerciseCatalog.filter((ex) => matchesQuery(ex, query) && matchesEquip(ex, equipFilter)) : null;

  const renderCard = (ex: Exercise) => {
    const style = DIY_CATEGORY_STYLES[ex.categories[0]] ?? DEFAULT_DIY_CATEGORY_STYLE;
    const selected = isSelected?.(ex) ?? false;
    const muscle = AVAILABLE_MUSCLES.find((m) => m.id === ex.target_muscle)?.label;
    const bodyPartId = getPrimaryBodyPart(ex.target_muscle);
    const bodyPartStyle = bodyPartId ? BODY_PART_STYLES[bodyPartId] ?? DEFAULT_BODY_PART_STYLE : null;
    const bodyPartLabel = bodyPartId ? BODY_PART_GROUPS.find((p) => p.id === bodyPartId)?.label : undefined;

    const body = (
      <div className="flex items-center gap-3 w-full overflow-hidden">
        <ExerciseThumb
          exercise={ex}
          alt={getExerciseName(ex, lang)}
          className="on-light w-[52px] h-[52px] rounded-2xl bg-surface-alt shrink-0"
          legacyFit="object-contain p-1"
          fallback={<div className="on-light w-[52px] h-[52px] rounded-2xl bg-surface-alt shrink-0" />}
        />
        <div className="overflow-hidden text-start">
          <h4 className="font-extrabold text-fg text-[0.8125rem] truncate">{getExerciseName(ex, lang)}</h4>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {muscle && <span className="text-[0.6875rem] text-muted truncate">{muscle}</span>}
            {ex.categories[0] && (
              <span className="text-[0.6875rem] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: style.bg, color: style.text }}>
                {/* First category + "+N": a nowrap pill of all of them was clipped by the card. */}
                {ex.categories[0]}
                {ex.categories.length > 1 && ` +${ex.categories.length - 1}`}
              </span>
            )}
            {bodyPartStyle && bodyPartLabel && (
              <span className="text-[0.6875rem] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: bodyPartStyle.bg, color: bodyPartStyle.text }}>
                {bodyPartLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    );

    const cardClass = `on-light bg-surface rounded-[1.25rem] p-3 border shadow-sm flex items-center justify-between gap-3 transition-colors ${
      selected ? "border-accent/60" : "border-line hover:border-line-input"
    }`;

    // Read-only: the whole card is one big target into the info sheet.
    if (!renderAction) {
      return (
        <button key={ex.id} onClick={() => onViewExerciseInfo(ex)} className={`${cardClass} w-full active:scale-[0.98] transition-ui duration-150 ease-out`}>
          {body}
          {/* ChevronLeft: "forward" in RTL */}
          <ChevronLeft size={18} className="shrink-0 text-muted" />
        </button>
      );
    }

    return (
      <div key={ex.id} className={cardClass}>
        {body}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onViewExerciseInfo(ex)}
            aria-label="מידע על התרגיל"
            className="on-light w-11 h-11 rounded-full bg-surface-alt text-muted flex items-center justify-center hover:bg-line hover:text-fg transition-ui duration-150 ease-out active:scale-[0.97]"
          >
            <Info size={16} />
          </button>
          {renderAction(ex)}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Sticky within the nearest scroll container; -mx/px so its
          background spans the column's gutters while content scrolls under. */}
      <div className={`sticky ${stickyTopClassName} z-10 -mx-4 px-4 py-3 bg-page/95 backdrop-blur-md flex items-center gap-2`}>
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש תרגיל"
            aria-label="חיפוש תרגיל"
            className="on-light w-full bg-surface border border-line text-fg rounded-full pr-10 pl-9 py-2.5 text-base md:text-sm font-bold outline-none focus:border-focus focus:ring-2 focus:ring-focus [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="נקה חיפוש" className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-muted hover:text-fg">
              <X size={14} />
            </button>
          )}
        </div>
        {/* Equipment — the one filter that isn't a category/body-region
            concept, so it stays a standalone control beside search. */}
        <div className="relative shrink-0">
          <select
            value={equipFilter}
            onChange={(e) => setEquipFilter(e.target.value)}
            aria-label="ציוד"
            className="on-light appearance-none bg-surface border border-line text-fg rounded-full pl-8 pr-3.5 py-2.5 outline-none font-bold text-xs focus:border-focus focus:ring-2 focus:ring-focus max-w-[9.5rem]"
          >
            <option value="all">כל הציוד</option>
            {EQUIPMENT_LIST.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.label}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        </div>
      </div>

      <div className="pt-1">
        {searchResults ? (
          searchResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5">{searchResults.map(renderCard)}</div>
          ) : (
            <p className="text-center text-sm font-bold text-muted py-12">לא נמצאו תרגילים עבור &quot;{query.trim()}&quot;</p>
          )
        ) : (
          // Accordion — one card per top-level tab. Expand/collapse
          // animates via grid-template-rows, no JS animation library.
          <div className="flex flex-col gap-3">
            {topLevelTabs.map((tab) => {
              const isExpanded = categoryFilter === tab.id;
              const tabStyle = tab.id === MUSCLE_GROUPS_TAB_ID ? null : DIY_CATEGORY_STYLES[tab.id] ?? DEFAULT_DIY_CATEGORY_STYLE;
              const selectedRegion = isExpanded ? bodyPartFilter : null;

              return (
                <div key={tab.id} className="on-light rounded-[1.75rem] overflow-hidden bg-surface border border-line shadow-sm">
                  <button onClick={() => toggleTab(tab.id)} aria-expanded={isExpanded} className="w-full flex items-center gap-3 p-3 pe-4.5 text-start transition-ui duration-150 ease-out active:scale-[0.99]">
                    {/* Ecco for this category. */}
                    <img src={tab.image} alt="" className="shrink-0 w-14 h-14 rounded-2xl object-cover" style={{ background: MEDIA_STUDIO_BG }} />
                    {tabStyle && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tabStyle.solid }} />}
                    <span className="flex-1 font-black text-base text-fg truncate">{tab.label}</span>
                    <ChevronDown size={18} className={`shrink-0 text-muted transition-transform duration-300 ease-out ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                      <div className="px-4.5 pb-4.5">
                        {selectedRegion === null ? (
                          // Body regions, each with a live count so an
                          // empty region never shows up as a dead end.
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {BODY_PART_GROUPS.map((region) => {
                              const count = exerciseCatalog.filter((ex) => matchesCategory(ex, tab.id) && matchesEquip(ex, equipFilter) && matchesRegion(ex, region.id)).length;
                              if (count === 0) return null;
                              const regionStyle = BODY_PART_STYLES[region.id] ?? DEFAULT_BODY_PART_STYLE;
                              return (
                                <button
                                  key={region.id}
                                  onClick={() => setBodyPartFilter(region.id)}
                                  className="on-light flex flex-col items-start gap-1 rounded-2xl p-1.5 pb-3 bg-surface-alt border border-line hover:bg-line transition-ui duration-150 ease-out text-start active:scale-[0.97]"
                                >
                                  {ECCO_REGION_IMAGES[region.id] && (
                                    <img src={ECCO_REGION_IMAGES[region.id]} alt="" className="w-full aspect-[3/2] object-cover rounded-xl mb-1" style={{ background: MEDIA_STUDIO_BG }} />
                                  )}
                                  <span className="font-extrabold text-sm px-2" style={{ color: regionStyle.text }}>
                                    {region.label}
                                  </span>
                                  <span className="text-[0.6875rem] font-bold text-muted px-2">{countLabel(count, "תרגיל אחד", "תרגילים")}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div>
                            <button
                              onClick={() => setBodyPartFilter(null)}
                              className="flex items-center gap-1 text-xs font-bold text-muted hover:text-fg mb-3.5 transition-ui duration-150 ease-out active:scale-[0.97]"
                            >
                              <ChevronRight size={14} />
                              {BODY_PART_GROUPS.find((r) => r.id === selectedRegion)?.label ?? selectedRegion}
                            </button>
                            <div className="grid grid-cols-1 gap-2.5">
                              {exerciseCatalog
                                .filter((ex) => matchesCategory(ex, tab.id) && matchesEquip(ex, equipFilter) && matchesRegion(ex, selectedRegion))
                                .map(renderCard)}
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
        )}
      </div>
    </div>
  );
}
