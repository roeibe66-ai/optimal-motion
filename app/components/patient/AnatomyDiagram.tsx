"use client";

import { FRONT_MUSCLES, BACK_MUSCLES } from "body-muscles";
import { ANATOMY_TIER_COLORS, MUSCLE_TO_ANATOMY_REGIONS } from "@/app/constants/catalog";

type Tier = "primary" | "secondary";
type View = "front" | "back";

// FRONT_MUSCLES and BACK_MUSCLES keep their original coordinates from a
// single shared coordinate space (the library's own side-by-side combined
// diagram) rather than each being independently normalized to start at
// (0,0) — front content spans roughly x:0-31.5, back roughly x:36.5-68.5,
// both y:0-92.5 (measured directly off the path data, not assumed). Using
// one "0 0 35 93" viewBox for both — the natural-looking guess — silently
// clips the entire back view off-canvas. Each view gets its own viewBox
// matching where its content actually lives.
const VIEW_BOX: Record<View, string> = { front: "-1 -1 34 95", back: "35 -1 35 95" };

// One clean medical-chart look everywhere: solid white base fill, precise
// stone-800 stroke outlines. No "translucent/glass" treatment on any
// variant — a body diagram is a clinical illustration, not a photo-overlay
// effect, even where it sits on top of a photo (see the "overlay" variant's
// own opaque white card below, which is what gives it contrast against the
// photo instead).
const BASE_FILL = "#ffffff";
const STROKE_COLOR = "#292524"; // stone-800

// Both variants render the exact same diagram (same fill/stroke/tier
// colors) — the only difference is the container chrome around it. "card":
// the exercise-info sheet's usage, a padded bg-stone-50 panel. "overlay":
// PlanTab's tiny hero-card usage, a small opaque white card sitting on top
// of the hero photo so the diagram pops with full contrast instead of
// blending into it.
type Variant = "card" | "overlay";

interface AnatomyDiagramProps {
  primaryMuscles: string[]; // AVAILABLE_MUSCLES ids (exercises.target_muscle, split on ",")
  secondaryMuscles?: string[]; // AVAILABLE_MUSCLES ids (exercises.secondary_muscles) — optional, PlanTab's hero overlay has no secondary-muscle concept
  variant?: Variant;
  size?: number; // px width per view — omit to fill the container (flex-1, capped at 130px)
  className?: string;
}

// Resolves our AVAILABLE_MUSCLES ids to this view's highlighted
// body-muscles-library region ids. Secondary is applied first so a muscle
// tagged as both (shouldn't normally happen — the admin form excludes the
// primary pick from the secondary list, but this defends anyway) keeps only
// its primary, stronger color.
function buildHighlightMap(primaryMuscles: string[], secondaryMuscles: string[], view: View): Map<string, Tier> {
  const map = new Map<string, Tier>();
  for (const id of secondaryMuscles) {
    const region = MUSCLE_TO_ANATOMY_REGIONS[id];
    if (region?.view === view) region.ids.forEach((rid) => map.set(rid, "secondary"));
  }
  for (const id of primaryMuscles) {
    const region = MUSCLE_TO_ANATOMY_REGIONS[id];
    if (region?.view === view) region.ids.forEach((rid) => map.set(rid, "primary"));
  }
  return map;
}

// Renders every region body-muscles ships for this view — not just the
// highlighted ones — so the rest of the silhouette (head, hands, spine,
// anything outside our own muscle vocabulary) still draws as a clean
// line-art outline instead of leaving gaps in the body shape. `w-full
// h-auto` plus the per-view viewBox above is what makes this scale cleanly
// at any size (44px in PlanTab's hero, 130px in the exercise-info sheet)
// without clipping or losing line detail — the viewBox, not the rendered
// pixel size, defines what portion of the coordinate space is visible, and
// stroke width is defined in that same coordinate space so it stays
// proportionally crisp at any scale rather than needing per-size tuning.
function AnatomyView({ view, highlights }: { view: View; highlights: Map<string, Tier> }) {
  const regions = view === "front" ? FRONT_MUSCLES : BACK_MUSCLES;
  return (
    <svg viewBox={VIEW_BOX[view]} className="w-full h-auto" aria-hidden="true">
      {regions.map((region) => {
        const tier = highlights.get(region.id);
        const fill = tier === "primary" ? ANATOMY_TIER_COLORS.primary : tier === "secondary" ? ANATOMY_TIER_COLORS.secondary : BASE_FILL;
        return <path key={region.id} d={region.path} fill={fill} stroke={STROKE_COLOR} strokeWidth={0.25} strokeLinejoin="round" />;
      })}
    </svg>
  );
}

// Detailed front+back anatomical line-art muscle map — replaces the old
// react-body-highlighter-based diagram (blocky ~21-region vocabulary, dark
// theme) with the `body-muscles` package's 70+-region dataset, rendered
// directly as our own <path> elements so every region's fill is under our
// own light-theme, multi-tier control rather than the package's own
// (intensity-scale, dark-friendly) runtime styling.
export default function AnatomyDiagram({ primaryMuscles, secondaryMuscles = [], variant = "card", size, className }: AnatomyDiagramProps) {
  const frontHighlights = buildHighlightMap(primaryMuscles, secondaryMuscles, "front");
  const backHighlights = buildHighlightMap(primaryMuscles, secondaryMuscles, "back");
  if (frontHighlights.size === 0 && backHighlights.size === 0) return null;

  const viewWrapperStyle = size ? { width: `${size}px` } : undefined;
  const viewWrapperClassName = size ? undefined : "flex-1 max-w-[130px]";
  const containerClassName =
    variant === "card"
      ? `flex items-center justify-center gap-3 bg-stone-50 rounded-2xl py-3 ${className ?? ""}`
      : `flex items-center gap-0.5 bg-white rounded-2xl p-1.5 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.35)] ${className ?? ""}`;

  return (
    <div className={containerClassName} dir="ltr">
      <div className={viewWrapperClassName} style={viewWrapperStyle}>
        <AnatomyView view="front" highlights={frontHighlights} />
      </div>
      <div className={viewWrapperClassName} style={viewWrapperStyle}>
        <AnatomyView view="back" highlights={backHighlights} />
      </div>
    </div>
  );
}
