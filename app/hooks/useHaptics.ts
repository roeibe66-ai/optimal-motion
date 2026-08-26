"use client";

import { useEffect, useState } from "react";

export type HapticType = "light" | "heavy" | "success";

// Minimal, self-contained: hydrate the saved preference, expose a toggleable
// `hapticsEnabled` for a future Profile/settings screen, and a trigger fn.
// Persisting `hapticsEnabled` to localStorage stays the settings screen's job
// (the original only wrote it on an explicit "Save", not on every toggle) —
// this hook intentionally doesn't do that write itself.
export function useHaptics() {
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("optimalMotionHaptics");
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHapticsEnabled(saved === "true");
    }
  }, []);

  const triggerHaptic = (type: HapticType) => {
    if (!hapticsEnabled) return;
    if (typeof window !== "undefined" && navigator.vibrate) {
      if (type === "light") navigator.vibrate(50);
      else if (type === "heavy") navigator.vibrate(200);
      else if (type === "success") navigator.vibrate([100, 50, 100, 50, 200]);
    }
  };

  return { hapticsEnabled, setHapticsEnabled, triggerHaptic };
}
