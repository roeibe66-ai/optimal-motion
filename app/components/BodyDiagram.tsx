"use client";

import dynamic from "next/dynamic";

const BodyModel = dynamic(() => import("react-body-highlighter"), { ssr: false });

interface BodyDiagramProps {
  highlightedMuscles: string[];
  onMuscleClick: (muscle: string) => void;
  view?: "anterior" | "posterior"; // front (default) or back
  width?: number; // px of the figure
  // false when the caller renders BodyAreaButtons itself (e.g. one merged
  // list under a front + back pair, as onboarding does).
  showButtons?: boolean;
}

// The areas react-body-highlighter draws in each view (its MuscleType ids),
// in patient words rather than anatomy-catalog names.
const AREAS: Record<"anterior" | "posterior", { id: string; label: string }[]> = {
  anterior: [
    { id: "head", label: "ראש" },
    { id: "neck", label: "צוואר" },
    { id: "front-deltoids", label: "כתף" },
    { id: "chest", label: "חזה" },
    { id: "biceps", label: "יד קדמית" },
    { id: "triceps", label: "יד אחורית" },
    { id: "forearm", label: "אמה" },
    { id: "abs", label: "בטן" },
    { id: "obliques", label: "צד הבטן" },
    { id: "abductors", label: "ירך חיצונית" },
    { id: "quadriceps", label: "ירך קדמית" },
    { id: "knees", label: "ברך" },
    { id: "calves", label: "שוק" },
  ],
  posterior: [
    { id: "head", label: "ראש" },
    { id: "trapezius", label: "טרפז" },
    { id: "back-deltoids", label: "כתף אחורית" },
    { id: "upper-back", label: "גב עליון" },
    { id: "lower-back", label: "גב תחתון" },
    { id: "triceps", label: "יד אחורית" },
    { id: "forearm", label: "אמה" },
    { id: "gluteal", label: "ישבן" },
    { id: "adductor", label: "ירך פנימית" },
    { id: "hamstring", label: "ירך אחורית" },
    { id: "calves", label: "שוק" },
  ],
};

// Thin wrapper around react-body-highlighter's client-only body model,
// used for the pain-area check-in on the pre-workout screen. The library
// applies these via inline `style.fill`, so CSS variables work. Selected
// pain areas use --warning (not --danger, which is reserved for errors,
// and not the teal muscle-primary, which means "muscles this exercise works").
//
// The SVG is pointer-only (no keyboard, no names), so the same areas are also
// toggle buttons below it — the accessible way to pick (IS 5568 / WCAG
// 2.1.1), and an easier tap target than a 150px figure. The figure itself is
// hidden from screen readers since the buttons say everything it does.
export default function BodyDiagram({ highlightedMuscles, onMuscleClick, view = "anterior", width = 150, showButtons = true }: BodyDiagramProps) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div aria-hidden="true" style={{ width: `${width}px` }}>
        <BodyModel
          type={view}
          data={[{ name: "Pain Areas", muscles: highlightedMuscles as never }]}
          onClick={({ muscle }: { muscle: string }) => onMuscleClick(muscle)}
          bodyColor="var(--muscle-inactive)"
          highlightedColors={["var(--warning)"]}
        />
      </div>
      {showButtons && <BodyAreaButtons views={[view]} selected={highlightedMuscles} onToggle={onMuscleClick} />}
    </div>
  );
}

// The toggle-button alternative to the figure, for one or more views (areas
// in both views — head, calves… — listed once).
export function BodyAreaButtons({ views, selected, onToggle }: { views: ("anterior" | "posterior")[]; selected: string[]; onToggle: (id: string) => void }) {
  const areas = views.flatMap((v) => AREAS[v]).filter((a, i, all) => all.findIndex((b) => b.id === a.id) === i);
  return (
    <div role="group" aria-label="אזורי כאב" className="flex flex-wrap justify-center gap-2">
      {areas.map((area) => {
        const on = selected.includes(area.id);
        return (
          <button
            key={area.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(area.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-ui duration-150 ease-out active:scale-[0.97] ${
              on ? "bg-warning text-on-accent border-warning" : "border-line text-muted hover:text-fg"
            }`}
          >
            {area.label}
          </button>
        );
      })}
    </div>
  );
}
