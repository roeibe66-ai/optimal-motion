"use client";

import { AVAILABLE_MUSCLES, ANATOMY_TIER_COLORS } from "@/app/constants/catalog";
import AnatomyDiagram from "@/app/components/patient/AnatomyDiagram";
import type { Exercise } from "@/app/types";

interface ExerciseMuscleMapProps {
  exercise: Exercise;
}

function muscleLabel(id: string): string {
  return AVAILABLE_MUSCLES.find((m) => m.id === id)?.label ?? id;
}

// Front+back muscle activation map for the exercise info sheet. Built
// entirely from fields the admin form already collects — exercise.target_muscle
// (primary agonist) and exercise.secondary_muscles (stabilizers/synergists,
// comma-separated ids) — no new table or admin UI needed.
//
// The diagram itself (AnatomyDiagram) draws from the `body-muscles` package's
// 70+-region dataset rather than react-body-highlighter's ~21 fixed regions;
// see MUSCLE_TO_ANATOMY_REGIONS in catalog.ts for which of our muscle ids
// have no equivalent there and are dropped from the picture (never
// approximated). The text legend below always lists every tagged muscle by
// its real Hebrew name, including ones the diagram itself couldn't draw, so
// nothing tagged is silently lost from the exercise's info screen — only
// from the picture.
export default function ExerciseMuscleMap({ exercise }: ExerciseMuscleMapProps) {
  // target_muscle is typed/labeled everywhere as a single muscle, but real
  // data doesn't always respect that (found live: "chin up" has
  // "lower-back,biceps,chest" crammed into this one field — arguably
  // correct content, since a chin-up genuinely has more than one primary
  // mover, just entered around the single-select admin UI). Split
  // defensively so it renders correctly either way, same as
  // secondary_muscles already does.
  const primaryIds = exercise.target_muscle
    ? exercise.target_muscle.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const secondaryIds = exercise.secondary_muscles
    ? exercise.secondary_muscles.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  if (primaryIds.length === 0 && secondaryIds.length === 0) return null;

  return (
    <div className="mb-4">
      <AnatomyDiagram primaryMuscles={primaryIds} secondaryMuscles={secondaryIds} />
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[11px] font-bold">
        {primaryIds.length > 0 && (
          <span className="flex items-center gap-1.5 text-stone-700">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ANATOMY_TIER_COLORS.primary }} />
            {primaryIds.map(muscleLabel).join(", ")}
          </span>
        )}
        {secondaryIds.length > 0 && (
          <span className="flex items-center gap-1.5 text-stone-500">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ANATOMY_TIER_COLORS.secondary }} />
            {secondaryIds.map(muscleLabel).join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}
