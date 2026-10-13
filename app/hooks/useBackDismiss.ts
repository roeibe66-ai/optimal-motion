"use client";

import { useEffect, useRef } from "react";

// System Back (Android's back gesture, the browser's back button) closes the
// topmost open layer — a sheet, the full-screen builder, a workout, a program
// screen — instead of leaving the app. Each active layer owns one history
// entry; layers stack in the order they opened, and Back only ever closes the
// top one.
//
// A layer with a `guard` (an in-progress workout) isn't closed outright: its
// entry is restored and the guard asks first; it closes only on "yes".
// Closing a layer from the UI consumes its entry silently, so history never
// collects stale entries.

interface Layer {
  onBack: () => void;
  guard?: () => Promise<boolean>;
  closedByBack: boolean;
}

const stack: Layer[] = [];
let ignorePops = 0;
let installed = false;

function install() {
  if (installed) return;
  installed = true;
  window.addEventListener("popstate", () => {
    if (ignorePops > 0) {
      ignorePops--;
      return;
    }
    const top = stack[stack.length - 1];
    if (!top) return;
    if (top.guard) {
      // Put the entry back while we ask; it's consumed normally if they leave.
      window.history.pushState({ omLayer: true }, "");
      void top.guard().then((leave) => {
        if (leave && stack.includes(top)) top.onBack();
      });
      return;
    }
    stack.pop();
    top.closedByBack = true;
    top.onBack();
  });
}

export function useBackDismiss(active: boolean, onBack: () => void, guard?: () => Promise<boolean>) {
  const latest = useRef({ onBack, guard });
  useEffect(() => {
    latest.current = { onBack, guard };
  });

  useEffect(() => {
    if (!active) return;
    install();
    const layer: Layer = {
      onBack: () => latest.current.onBack(),
      guard: latest.current.guard ? () => latest.current.guard!() : undefined,
      closedByBack: false,
    };
    // Deferred a tick: React's dev double-mount cleans up before this runs,
    // so it never pushes an entry it would immediately have to pop.
    let pushed = false;
    const timer = setTimeout(() => {
      stack.push(layer);
      window.history.pushState({ omLayer: true }, "");
      pushed = true;
    }, 0);
    return () => {
      clearTimeout(timer);
      if (!pushed) return;
      const i = stack.indexOf(layer);
      if (i !== -1) stack.splice(i, 1);
      if (!layer.closedByBack) {
        ignorePops++;
        window.history.back();
      }
    };
  }, [active]);
}
