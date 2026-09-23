"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MUSCLE_SVG_PATH_MAP } from "@/app/constants/muscleMapping";

interface AnatomyHeatmapProps {
  primeMovers: string[]; // AVAILABLE_MUSCLES ids
  synergists: string[]; // AVAILABLE_MUSCLES ids
  className?: string;
}

// Deliberately its own color, not --color-brand-terracotta — a muscle-
// activation diagram reads best in the universal "muscle red" register
// regardless of whatever the app's general accent color happens to be, so
// this stays a muted brick-red even while brand-terracotta itself keeps
// driving buttons/nav/tabs elsewhere.
const MUSCLE_HIGHLIGHT_COLOR = "#A53021";
const PRIME_OPACITY = 0.85;
const SYNERGIST_OPACITY = 0.35;
const DEFAULT_ASPECT = "1536 / 1024";

// Reverse of MUSCLE_SVG_PATH_MAP: SVG path id -> AVAILABLE_MUSCLES id. Built
// once at module load (both maps are static data) rather than per render.
const PATH_ID_TO_MUSCLE: Record<string, string> = Object.fromEntries(
  Object.entries(MUSCLE_SVG_PATH_MAP).flatMap(([muscleId, pathIds]) => pathIds.map((pathId) => [pathId, muscleId]))
);

// Renders public/anatomy/overlay.processed.svg. As of the 2026-09-20
// re-export this SVG carries its OWN background photo — a <defs><image>
// placed behind the muscle paths via <use xlink:href="#Image">, exported
// directly from the same canvas the paths were traced on, so alignment is
// exact — plus an active clip-path trimming the canvas to its artboard
// bounds. (The earlier public/anatomy/base-model.png approach was dropped
// entirely: it was a separately-drawn image with a different pose that
// never lined up — see git history on this file.)
//
// Because of that <defs>/<use>/clip-path structure, the SVG is injected as
// raw markup (dangerouslySetInnerHTML) rather than torn down into bare
// <path> elements and rebuilt — decomposing it before would silently drop
// the background image and the clip-path along with it. It's safe here
// specifically because the content is our own static build-time asset
// (produced by scripts/process-anatomy-svg.mjs from a file only a developer
// places in public/anatomy/), never anything derived from user input.
//
// Each path's fill is then set imperatively (not via React path props) once
// mounted, and again whenever the tagged muscles change:
//   - Prime mover: muted brick-red (#A53021) at 85% fill opacity.
//   - Synergist: the same brick-red at 35% fill opacity.
//   - Untagged: fill="transparent" — only the black outline (and the photo
//     behind it) shows.
// The svg's internal ids (`cp` for the clip-path, `Image` for the photo
// def) are rewritten to a per-instance-unique suffix on load so two
// AnatomyHeatmap instances mounted at once (e.g. the admin muscle picker's
// live preview alongside another one) don't collide on a bare #cp/#Image
// url() reference — muscle-path ids don't need this since they're only ever
// looked up scoped to this component's own container, never by a global
// url(#...) reference.
export default function AnatomyHeatmap({ primeMovers, synergists, className }: AnatomyHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT);
  const [loadFailed, setLoadFailed] = useState(false);
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    let cancelled = false;
    fetch("/anatomy/overlay.processed.svg")
      .then((res) => {
        if (!res.ok) throw new Error(`overlay.processed.svg ${res.status}`);
        return res.text();
      })
      .then((svgText) => {
        if (cancelled) return;
        const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
        if (viewBoxMatch) {
          const [, , vbWidth, vbHeight] = viewBoxMatch[1].trim().split(/\s+/).map(Number);
          if (vbWidth > 0 && vbHeight > 0) setAspectRatio(`${vbWidth} / ${vbHeight}`);
        }
        const namespaced = svgText
          .replace(/id="cp"/g, `id="cp-${instanceId}"`)
          .replace(/url\(#cp\)/g, `url(#cp-${instanceId})`)
          .replace(/id="Image"/g, `id="Image-${instanceId}"`)
          .replace(/xlink:href="#Image"/g, `xlink:href="#Image-${instanceId}"`);
        setSvgMarkup(namespaced);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgMarkup) return;

    const svgEl = container.querySelector("svg");
    if (svgEl) {
      svgEl.style.width = "100%";
      svgEl.style.height = "100%";
      svgEl.style.display = "block";
    }

    const primeSet = new Set(primeMovers);
    const synergistSet = new Set(synergists);
    container.querySelectorAll("path[id]").forEach((pathEl) => {
      const muscleId = PATH_ID_TO_MUSCLE[pathEl.id];
      if (muscleId && primeSet.has(muscleId)) {
        pathEl.setAttribute("fill", MUSCLE_HIGHLIGHT_COLOR);
        pathEl.setAttribute("fill-opacity", String(PRIME_OPACITY));
      } else if (muscleId && synergistSet.has(muscleId)) {
        pathEl.setAttribute("fill", MUSCLE_HIGHLIGHT_COLOR);
        pathEl.setAttribute("fill-opacity", String(SYNERGIST_OPACITY));
      } else {
        pathEl.setAttribute("fill", "transparent");
        pathEl.removeAttribute("fill-opacity");
      }
    });
  }, [svgMarkup, primeMovers, synergists]);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${className ?? ""}`} style={{ aspectRatio }}>
      {svgMarkup && <div ref={containerRef} className="absolute inset-0 w-full h-full" dangerouslySetInnerHTML={{ __html: svgMarkup }} />}

      {loadFailed && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-stone-400 bg-stone-50/80">
          לא ניתן לטעון את שכבת השרירים
        </div>
      )}
    </div>
  );
}
