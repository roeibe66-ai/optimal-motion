"use client";

import { useEffect, useRef, type RefObject } from "react";

// Keyboard/screen-reader behavior for a modal layer (sheet, full-screen flow),
// per WCAG 2.1.2 / 2.4.3 (IS 5568). Pair it with role="dialog" aria-modal on
// the same element:
// - on open, focus moves into the layer ([autofocus] if present, else the
//   layer itself — it gets tabIndex=-1) so a screen reader reads it;
// - Tab / Shift+Tab cycle inside the layer instead of escaping behind it;
// - Escape calls onEscape (omit it for flows that must not be dismissed);
// - on close, focus goes back to whatever opened it.
// Layers stack like useBackDismiss: only the topmost one handles keys, so a
// confirm sheet over the workout player doesn't also close the player.

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

const stack: symbol[] = [];

export function useDialog(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  const latest = useRef(onEscape);
  useEffect(() => {
    latest.current = onEscape;
  });

  // A multi-step flow swaps its root between steps; the focused button goes
  // with the old one and focus drops to <body>. Pull it back in after each
  // render so a screen reader lands on the new step.
  useEffect(() => {
    const el = ref.current;
    if (!active || !el || document.activeElement !== document.body) return;
    if (!el.hasAttribute("tabindex")) el.tabIndex = -1;
    el.focus({ preventScroll: true });
  });

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    const id = Symbol();
    stack.push(id);
    const opener = document.activeElement as HTMLElement | null;

    if (!el.hasAttribute("tabindex")) el.tabIndex = -1;
    if (!el.contains(document.activeElement)) {
      const auto = el.querySelector<HTMLElement>("[autofocus]");
      (auto ?? el).focus({ preventScroll: true });
    }

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      // Re-read: multi-step flows render a different root per step.
      const el = ref.current;
      if (!el) return;
      if (e.key === "Escape" && latest.current) {
        e.preventDefault();
        latest.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        el.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || current === el || !el.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !el.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      const i = stack.indexOf(id);
      if (i !== -1) stack.splice(i, 1);
      // Deliberately the live ref: a multi-step flow's root may have changed
      // since this effect ran (null on unmount -> the original element).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const current = ref.current ?? el;
      if (opener?.isConnected && (current.contains(document.activeElement) || document.activeElement === document.body)) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [active, ref]);
}
