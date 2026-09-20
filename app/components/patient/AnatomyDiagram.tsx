"use client";

import { CUSTOM_ANATOMY_REGIONS } from "@/app/components/patient/anatomy/customAnatomyRegions";
import { ANATOMY_TIER_COLORS, MUSCLE_TO_ANATOMY_REGIONS } from "@/app/constants/catalog";

type Tier = "primary" | "secondary";
type View = "front" | "back";

// Dev Mode: active whenever this isn't a production build. Lets you click
// any region in the diagram (in either usage — the exercise-info sheet or
// PlanTab's hero) and see its id/view/center logged to the console, which
// is how MUSCLE_TO_ANATOMY_REGIONS in catalog.ts gets filled in — there's
// no other way to identify which region is which, since the source SVG is
// an image trace with no per-muscle ids or labels. Also makes the diagram
// render even with nothing highlighted (production hides it in that case),
// since you need to see all 116 regions to click through them.
const isDevMode = process.env.NODE_ENV !== "production";

// The two figures (front, back) sit side by side in one shared 1342x894
// canvas in the source file — these are their measured bounding boxes
// (via getBBox() in a real browser, not estimated), each padded by ~10-20
// units so nothing touches the SVG edge.
const VIEW_BOX: Record<View, string> = { front: "140 10 445 875", back: "746 8 440 873" };

// One clean medical-chart look everywhere: solid white base fill, precise
// stone-800 stroke outlines. No "translucent/glass" treatment on any
// variant — a body diagram is a clinical illustration, not a photo-overlay
// effect, even where it sits on top of a photo (see the "overlay" variant's
// own opaque white card below, which is what gives it contrast against the
// photo instead).
const BASE_FILL = "#ffffff";
const STROKE_COLOR = "#292524"; // stone-800
// Tuned for this source's much larger coordinate space (viewBox ~445 units
// wide) — the previous body-muscles-based version used 0.25 for a ~35-unit
// viewBox; the equivalent visual weight here is roughly 13x that.
const STROKE_WIDTH = 3.2;

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

// Resolves our AVAILABLE_MUSCLES ids to this view's highlighted region ids
// (see MUSCLE_TO_ANATOMY_REGIONS in catalog.ts — currently empty, waiting
// to be filled in via Dev Mode). Secondary is applied first so a muscle
// tagged as both (shouldn't normally happen — the admin form excludes the
// primary pick from the secondary list, but this defends anyway) keeps only
// its primary, stronger color.
function buildHighlightMap(primaryMuscles: string[], secondaryMuscles: string[], view: View): Map<number, Tier> {
  const map = new Map<number, Tier>();
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

// Renders every region for this view — not just the highlighted ones — so
// the rest of the silhouette still draws as a clean line-art outline
// instead of leaving gaps in the body shape. `w-full h-auto` plus the
// per-view viewBox above is what makes this scale cleanly at any size (44px
// in PlanTab's hero, 130px in the exercise-info sheet) without clipping or
// losing line detail — the viewBox, not the rendered pixel size, defines
// what portion of the coordinate space is visible, and stroke width is
// defined in that same coordinate space so it stays proportionally crisp at
// any scale rather than needing per-size tuning.
function AnatomyView({ view, highlights }: { view: View; highlights: Map<number, Tier> }) {
  const regions = CUSTOM_ANATOMY_REGIONS.filter((r) => r.view === view);
  return (
    <svg viewBox={VIEW_BOX[view]} className="w-full h-auto" aria-hidden={!isDevMode}>
      {regions.map((region) => {
        const tier = highlights.get(region.id);
        const fill = tier === "primary" ? ANATOMY_TIER_COLORS.primary : tier === "secondary" ? ANATOMY_TIER_COLORS.secondary : BASE_FILL;
        return (
          <path
            key={region.id}
            d={region.d}
            fill={fill}
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            strokeLinejoin="round"
            {...(isDevMode
              ? {
                  onClick: () => console.log(`[AnatomyDiagram] ${view} region #${region.id} (center ${region.cx}, ${region.cy})`),
                  style: { cursor: "pointer" },
                }
              : {})}
          />
        );
      })}
    </svg>
  );
}

// Detailed front+back anatomical line-art muscle map, built from a custom-
// commissioned SVG (app/components/patient/anatomy/customAnatomyRegions.ts)
// rather than a library — see that file's header comment for what "region"
// means here (extraction order, not anatomy) and MUSCLE_TO_ANATOMY_REGIONS
// in catalog.ts for the (currently empty, in-progress) muscle-id mapping.
// Used both by the exercise-info sheet ("card" variant) and PlanTab's
// hero-photo overlay ("overlay" variant).
export default function AnatomyDiagram({ primaryMuscles, secondaryMuscles = [], variant = "card", size, className }: AnatomyDiagramProps) {
  const frontHighlights = buildHighlightMap(primaryMuscles, secondaryMuscles, "front");
  const backHighlights = buildHighlightMap(primaryMuscles, secondaryMuscles, "back");
  const hasHighlights = frontHighlights.size > 0 || backHighlights.size > 0;
  // Production stays hidden until a muscle actually resolves to a mapped
  // region (same as before). Dev Mode always renders — you need to see all
  // 116 regions to click through them and build that mapping in the first
  // place, so it can't wait on the mapping already being done.
  if (!hasHighlights && !isDevMode) return null;

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
