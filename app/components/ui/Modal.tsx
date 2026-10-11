"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  onClose: () => void;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

// Must match the .sheet-panel[data-closing] duration in globals.css.
const SHEET_EXIT_MS = 250;

// Swipe-to-dismiss tuning (Apple, "Designing Fluid Interfaces"):
// - DRAG_SLOP: movement before a press on the header becomes a drag, so taps
//   (the X button) still work.
// - project(): where a flick would come to rest, scroll-deceleration style;
//   the sheet closes if that projected point is past half its height.
// - rubberband(): resistance when pulled up past its resting position.
const DRAG_SLOP = 8;
const project = (velocityPxPerSec: number, decelerationRate = 0.998) => ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
const rubberband = (overshoot: number, dimension: number, constant = 0.55) =>
  (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

// Shared modal chrome (overlay + panel + header + close button) for the
// patient app — an elevated dark sheet (header) over a dimmed backdrop, with
// the scrollable body on a light --surface so exercise content stays
// readable. No heavy borders (a hairline divider under the header). Currently only
// rendered from ExerciseInfoModal (and, via it, the Explore tab's workout
// preview).
//
// Always a true edge-to-edge bottom sheet — pinned to the bottom edge, full
// width, no side margins, squared-off-except-top corners — at every
// breakpoint, not just mobile. There used to be a `sm:` fallback to a small
// centered card, but that made this the only sheet in the app with that
// split behavior; every other bottom sheet here (PatientCoachSheet,
// PasskeyPrompt) stays bottom-anchored regardless of viewport width, so this
// now matches them instead of being the odd one out.
//
// Rendered through a portal into <body>: the patient shell's scrolling
// <main> is its own stacking context (relative z-0), so a modal opened from
// a tab inside it could never rise above the fixed bottom nav (z-50) — the
// nav covered the sheet's bottom buttons (e.g. Explore's "add to my
// schedule"). Only ever opened by a user action, so `document` exists.
//
// Slides up from the bottom edge on open and back down on close, and can be
// swiped down to dismiss by its handle/header (see onDrag* below) (the
// .sheet-backdrop/.sheet-panel transitions in globals.css). Closing from the
// backdrop or the X plays that exit first and only then calls onClose, so
// the parent unmounts us after the slide-down; a parent that unmounts the
// modal directly (e.g. after a successful save) still closes instantly.
export default function Modal({ onClose, title, icon, children }: ModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    closeTimer.current = setTimeout(onClose, SHEET_EXIT_MS);
  };

  // Drag the sheet down by its handle/header. Positions are written straight
  // to the element's style (no re-render per pointermove) so it tracks the
  // finger 1:1 from where it was grabbed.
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; dy: number; active: boolean; samples: { y: number; t: number }[] } | null>(null);

  const onDragStart = (e: ReactPointerEvent) => {
    if (isClosing || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag.current = { startY: e.clientY, dy: 0, active: false, samples: [{ y: e.clientY, t: e.timeStamp }] };
  };

  const onDragMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    const panel = panelRef.current;
    if (!d || !panel) return;
    const raw = e.clientY - d.startY;
    if (!d.active) {
      if (Math.abs(raw) < DRAG_SLOP) return;
      d.active = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // The pointer can already be gone (released between events) — tracking still works without capture.
      }
      panel.style.transition = "none";
      if (backdropRef.current) backdropRef.current.style.transition = "none";
    }
    const height = panel.offsetHeight;
    d.dy = raw >= 0 ? raw : rubberband(raw, height);
    panel.style.transform = `translateY(${d.dy}px)`;
    if (backdropRef.current) backdropRef.current.style.opacity = String(1 - (Math.max(0, d.dy) / height) * 0.7);
    d.samples.push({ y: e.clientY, t: e.timeStamp });
    if (d.samples.length > 5) d.samples.shift();
  };

  const onDragEnd = () => {
    const d = drag.current;
    const panel = panelRef.current;
    drag.current = null;
    if (!d?.active || !panel) return;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const velocity = ((last.y - first.y) / Math.max(1, last.t - first.t)) * 1000; // px/s, + = downward
    const height = panel.offsetHeight;
    const backdrop = backdropRef.current;
    if (d.dy + project(velocity) > height / 2) {
      // Continue down from where the finger left it, then unmount via the
      // normal close path (data-closing also fades the backdrop).
      panel.style.transition = `transform ${SHEET_EXIT_MS}ms var(--ease-drawer)`;
      panel.style.transform = "translateY(100%)";
      if (backdrop) {
        backdrop.style.transition = "";
        backdrop.style.opacity = "";
      }
      handleClose();
    } else {
      // Settle back from the current position — clearing the inline values
      // re-enables the CSS transition, which starts from where it is now.
      panel.style.transition = "";
      panel.style.transform = "";
      if (backdrop) {
        backdrop.style.transition = "";
        backdrop.style.opacity = "";
      }
    }
  };

  return createPortal(
    <div
      ref={backdropRef}
      className="sheet-backdrop fixed inset-0 z-[200] bg-backdrop backdrop-blur-sm flex items-end justify-center"
      data-closing={isClosing || undefined}
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        className="sheet-panel bg-elevated text-fg w-full overflow-hidden shadow-elevated relative flex flex-col max-h-[92vh] rounded-t-3xl m-0 pb-[env(safe-area-inset-bottom)]"
        data-closing={isClosing || undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle + header are the drag area (touch-none so the browser
            doesn't scroll/refresh instead); the body below scrolls normally. */}
        <div
          className="touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
        <div className="pt-2.5 flex justify-center" aria-hidden="true">
          <div className="w-10 h-1.5 rounded-full bg-fg/20" />
        </div>
        <div className="flex justify-between items-center px-5 pb-5 pt-2.5 border-b border-line">
          <h3 className="text-xl font-black flex items-center gap-2 text-fg">
            {icon} {title}
          </h3>
          <button
            onClick={handleClose}
            aria-label="סגור"
            className="text-muted hover:text-fg bg-line hover:bg-fg/15 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        </div>
        <div className="on-light p-6 overflow-y-auto flex-1 bg-surface text-fg">{children}</div>
      </div>
    </div>,
    document.body
  );
}
