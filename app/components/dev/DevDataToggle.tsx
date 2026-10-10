"use client";

import { DEV_DATA_MODES, setDevDataMode, useDevDataMode, type DevDataMode } from "@/app/components/dev/devDataMode";

const LABELS: Record<DevDataMode, string> = {
  demo: "Demo data",
  worst: "Worst case",
  empty: "Empty",
  one: "One",
  huge: "300 rows",
};

// Dev-only segmented control for the `?data=` fixture switch. Deliberately
// plain chrome (system font, neutral grays, no motion) so it never reads as
// part of the design under test. Sits above the patient bottom nav.
export default function DevDataToggle() {
  const mode = useDevDataMode();
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div
      dir="ltr"
      className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex gap-0.5 p-0.5 rounded-full max-w-[calc(100vw-1rem)] overflow-x-auto print:hidden"
      style={{ background: "#d4d4d8", fontFamily: "system-ui, sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}
    >
      {DEV_DATA_MODES.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setDevDataMode(m)}
          className="px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap"
          style={m === mode ? { background: "#fff", color: "#18181b", fontWeight: 600 } : { color: "#52525b" }}
        >
          {LABELS[m]}
        </button>
      ))}
    </div>
  );
}
