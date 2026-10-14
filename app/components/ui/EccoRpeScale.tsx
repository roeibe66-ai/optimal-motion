"use client";

import { RPE_LEVELS } from "@/app/constants/ecco";
import { MEDIA_STUDIO_BG } from "@/app/utils/media";

interface EccoRpeScaleProps {
  onSelect: (value: number) => void;
  value?: number | null; // highlights the chosen level (the quick-log sheet keeps a selection)
  layout?: "list" | "row"; // list: full-screen finish flows; row: compact, inside a sheet
}

// "How hard was it?" as five Ecco states, from fresh to flat on the floor.
// The value passed to onSelect is on the 1-10 RPE scale (RPE_LEVELS).
export default function EccoRpeScale({ onSelect, value = null, layout = "list" }: EccoRpeScaleProps) {
  if (layout === "row") {
    return (
      <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="עד כמה היה קשה">
        {RPE_LEVELS.map((level) => {
          const selected = value === level.value;
          return (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${level.label} — ${level.hint}`}
              onClick={() => onSelect(level.value)}
              className={`flex flex-col items-center gap-1 rounded-2xl p-1 transition-ui duration-150 ease-out active:scale-[0.97] ${
                selected ? "bg-accent/15 ring-2 ring-accent" : value !== null ? "opacity-50" : ""
              }`}
            >
              <img src={level.image} alt="" className="w-full aspect-square rounded-xl object-cover" style={{ background: MEDIA_STUDIO_BG }} />
              <span className="text-[0.6875rem] font-extrabold text-fg leading-tight">{level.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 w-full max-w-sm" role="radiogroup" aria-label="עד כמה היה קשה">
      {RPE_LEVELS.map((level) => (
        <button
          key={level.value}
          type="button"
          role="radio"
          aria-checked={value === level.value}
          onClick={() => onSelect(level.value)}
          className="on-light flex items-center gap-4 bg-surface border border-line rounded-2xl p-2 pe-4 text-start shadow-sm hover:border-accent active:scale-[0.98] transition-ui duration-150 ease-out"
        >
          <img src={level.image} alt="" className="w-16 h-16 shrink-0 rounded-xl object-cover" style={{ background: MEDIA_STUDIO_BG }} />
          <span className="flex-1 min-w-0">
            <span className="block font-black text-fg text-base">{level.label}</span>
            <span className="block text-sm text-muted">{level.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
