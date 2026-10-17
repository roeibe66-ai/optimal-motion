"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { isRestSoundEnabled, playRestEnd, primeRestSound, setRestSoundEnabled } from "@/app/utils/restSound";

// Profile row: the end-of-rest sound (app/utils/restSound.ts). Turning it on
// plays the bell once, so the patient hears what they chose.
export default function RestSoundSetting() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage, an external system, after mount (not in the initializer: hydration)
    setEnabled(isRestSoundEnabled());
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setRestSoundEnabled(next);
    if (next) {
      primeRestSound();
      playRestEnd();
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
      <div className="flex items-center gap-3">
        <Volume2 size={18} className="text-muted" />
        <div className="text-right">
          <h4 className="font-bold text-fg text-sm">צליל בסוף מנוחה</h4>
          <p className="text-xs text-muted">תקתוק עדין ב-3 השניות האחרונות וצליל פעמון בסוף</p>
        </div>
      </div>
      {/* Same switch as the haptics row below. */}
      <button
        type="button"
        onClick={toggle}
        role="switch"
        aria-checked={enabled}
        aria-label="צליל בסוף מנוחה"
        className={`w-[46px] h-[26px] shrink-0 rounded-full transition-[background-color,scale] duration-200 ease-out relative flex items-center active:scale-95 ${enabled ? "bg-accent" : "bg-line-input"}`}
      >
        <div className={`on-light w-5 h-5 bg-surface rounded-full absolute right-1 shadow-sm transition-transform duration-200 ease-out-strong ${enabled ? "-translate-x-[18px]" : "translate-x-0"}`}></div>
      </button>
    </div>
  );
}
