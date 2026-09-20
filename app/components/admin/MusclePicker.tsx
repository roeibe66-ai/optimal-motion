"use client";

import { AVAILABLE_MUSCLES } from "@/app/constants/catalog";
import { HEATMAP_MUSCLE_IDS } from "@/app/constants/muscleMapping";
import AnatomyHeatmap from "@/app/components/AnatomyHeatmap";

interface MusclePickerProps {
  primeMovers: string[];
  synergists: string[];
  onChange: (next: { primeMovers: string[]; synergists: string[] }) => void;
}

const muscleLabel = (id: string) => AVAILABLE_MUSCLES.find((m) => m.id === id)?.label ?? id;

// Admin exercise builder's Prime Mover / Synergist tagging tool: a live
// AnatomyHeatmap preview alongside a chip per taggable muscle (only
// HEATMAP_MUSCLE_IDS — the subset muscleMapping.ts can actually light up on
// the diagram, not the full 30-entry AVAILABLE_MUSCLES list). Each chip
// cycles untagged -> prime mover -> synergist -> untagged on click, so
// tagging an exercise never needs more than one click per muscle.
export default function MusclePicker({ primeMovers, synergists, onChange }: MusclePickerProps) {
  const cycle = (id: string) => {
    if (primeMovers.includes(id)) {
      onChange({ primeMovers: primeMovers.filter((m) => m !== id), synergists: [...synergists, id] });
    } else if (synergists.includes(id)) {
      onChange({ primeMovers, synergists: synergists.filter((m) => m !== id) });
    } else {
      onChange({ primeMovers: [...primeMovers, id], synergists });
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 bg-stone-950 rounded-2xl border border-stone-800 p-5">
      <div className="w-full md:w-56 shrink-0">
        <AnatomyHeatmap primeMovers={primeMovers} synergists={synergists} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-4 mb-3 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#047857" }} /> מניע ראשי
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#047857", opacity: 0.35 }} /> סינרגיסט
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {HEATMAP_MUSCLE_IDS.map((id) => {
            const isPrime = primeMovers.includes(id);
            const isSynergist = synergists.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => cycle(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  isPrime
                    ? "bg-emerald-700 text-white border-emerald-600"
                    : isSynergist
                      ? "bg-emerald-700/30 text-emerald-200 border-emerald-700/50"
                      : "bg-transparent text-stone-400 border-stone-800 hover:border-stone-600 hover:text-stone-200"
                }`}
              >
                {muscleLabel(id)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
