"use client";

import { useEffect, useState } from "react";
import { MUSCLE_SVG_PATH_MAP } from "@/app/constants/muscleMapping";
import type { Exercise } from "@/app/types";

// A small front/back muscle map for list rows — the same artwork and colors
// as AnatomyHeatmap, built for many instances on one screen. AnatomyHeatmap
// injects the whole 900KB SVG (an embedded base64 PNG + 206 paths) per
// instance; here the file is fetched and parsed once per page load, the PNG
// becomes one shared blob URL, and each thumb draws only its highlighted paths.

interface AnatomyAsset {
  imageUrl: string;
  pathD: Record<string, string>; // svg path id -> d
}

let assetPromise: Promise<AnatomyAsset> | null = null;

function loadAsset(): Promise<AnatomyAsset> {
  assetPromise ??= fetch("/anatomy/overlay.processed.svg")
    .then((res) => {
      if (!res.ok) throw new Error(`overlay.processed.svg ${res.status}`);
      return res.text();
    })
    .then((svg) => {
      const base64 = svg.match(/data:image\/png;base64,([^"]+)"/)?.[1].replace(/\s+/g, "") ?? "";
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const imageUrl = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
      const pathD: Record<string, string> = {};
      for (const m of svg.matchAll(/<path id="([^"]+)" d="([^"]+)"/g)) pathD[m[1]] = m[2];
      return { imageUrl, pathD };
    })
    .catch((err) => {
      assetPromise = null; // let a later mount retry
      throw err;
    });
  return assetPromise;
}

// The artboard the source SVG clips its photo to (its <clipPath id="cp">),
// so the thumb has no empty margins.
const VIEW_BOX = "173 23 1173 979";
const splitIds = (csv: string | undefined) => (csv ?? "").split(",").map((s) => s.trim()).filter(Boolean);

// Which muscles to highlight: the heatmap tagging (prime_movers/synergists)
// when present, else the older target_muscle/secondary_muscles.
export function exerciseMuscles(ex: Pick<Exercise, "prime_movers" | "synergists" | "target_muscle" | "secondary_muscles">) {
  const prime = ex.prime_movers?.length ? ex.prime_movers : ex.target_muscle ? [ex.target_muscle] : [];
  const assist = ex.prime_movers?.length ? (ex.synergists ?? []) : splitIds(ex.secondary_muscles);
  return { prime, assist: assist.filter((m) => !prime.includes(m)) };
}

interface MuscleThumbProps {
  exercise: Pick<Exercise, "prime_movers" | "synergists" | "target_muscle" | "secondary_muscles">;
  label: string; // e.g. the muscle names, for screen readers
  className?: string;
}

export default function MuscleThumb({ exercise, label, className = "" }: MuscleThumbProps) {
  const [asset, setAsset] = useState<AnatomyAsset | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAsset()
      .then((a) => !cancelled && setAsset(a))
      .catch(() => {}); // a missing thumb is fine — the list row still works
    return () => {
      cancelled = true;
    };
  }, []);

  const { prime, assist } = exerciseMuscles(exercise);
  const pathsFor = (muscles: string[]) => muscles.flatMap((m) => MUSCLE_SVG_PATH_MAP[m] ?? []);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: "1173 / 979" }} role="img" aria-label={label}>
      {asset && (
        <svg viewBox={VIEW_BOX} className="absolute inset-0 w-full h-full" aria-hidden="true">
          {/* Offset matches the source SVG's own transform on the photo. */}
          <image href={asset.imageUrl} x={0.75} y={-0.5} width={1536} height={1024} />
          {pathsFor(assist).map((id) =>
            asset.pathD[id] ? <path key={`s-${id}`} d={asset.pathD[id]} style={{ fill: "var(--muscle-secondary)" }} fillOpacity={0.85} /> : null
          )}
          {pathsFor(prime).map((id) =>
            asset.pathD[id] ? <path key={`p-${id}`} d={asset.pathD[id]} style={{ fill: "var(--muscle-primary)" }} fillOpacity={0.85} /> : null
          )}
        </svg>
      )}
    </div>
  );
}
