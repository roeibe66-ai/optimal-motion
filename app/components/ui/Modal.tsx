"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBackDismiss } from "@/app/hooks/useBackDismiss";
import { useDialog } from "@/app/hooks/useDialog";
import { project, rubberband } from "@/app/utils/motion";

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
// - project() / rubberband(): app/utils/motion.ts.
const DRAG_SLOP = 8;

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

  // System Back closes the sheet (with its normal exit), not the app.
  useBackDismiss(!isClosing, handleClose);

  // Drag the sheet down by its handle/header. Positions are written straight
  // to the element's style (no re-render per pointermove) so it tracks the
  // finger 1:1 from where it was grabbed.
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Focus in, Tab trapped, Escape closes (same exit as the X).
  useDialog(panelRef, true, handleClose);
  const backdropRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; dy: number; active: boolean; samples: { y: number; t: number }[] } | null>(null);

  // Core drag, driven by both input paths below (pointer on the header,
  // touch on the scrolled-to-top body).
  const beginDrag = (y: number, t: number) => {
    if (isClosing) return false;
    drag.current = { startY: y, dy: 0, active: false, samples: [{ y, t }] };
    return true;
  };

  const moveDrag = (y: number, t: number, capture?: () => void) => {
    const d = drag.current;
    const panel = panelRef.current;
    if (!d || !panel) return;
    const raw = y - d.startY;
    if (!d.active) {
      if (Math.abs(raw) < DRAG_SLOP) return;
      d.active = true;
      capture?.();
      panel.style.transition = "none";
      if (backdropRef.current) backdropRef.current.style.transition = "none";
    }
    const height = panel.offsetHeight;
    d.dy = raw >= 0 ? raw : rubberband(raw, height);
    panel.style.transform = `translateY(${d.dy}px)`;
    if (backdropRef.current) backdropRef.current.style.opacity = String(1 - (Math.max(0, d.dy) / height) * 0.7);
    d.samples.push({ y, t });
    if (d.samples.length > 5) d.samples.shift();
  };

  const endDrag = () => {
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

  // Path 1 — pointer on the handle/header (mouse, pen, touch).
  const onDragStart = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    beginDrag(e.clientY, e.timeStamp);
  };
  const onDragMove = (e: ReactPointerEvent) => {
    const target = e.currentTarget;
    const pointerId = e.pointerId;
    moveDrag(e.clientY, e.timeStamp, () => {
      try {
        target.setPointerCapture(pointerId);
      } catch {
        // The pointer can already be gone (released between events) — tracking still works without capture.
      }
    });
  };

  // Path 2 — pulling down on the content while it's scrolled to the top
  // (where people actually grab a sheet), like Vaul. Native, non-passive
  // touch listeners: once it's a sheet drag, preventDefault stops the
  // browser's own scroll/bounce from taking the gesture. Moving up, or
  // starting mid-scroll, leaves normal scrolling alone.
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ beginDrag, moveDrag, endDrag });
  useEffect(() => {
    dragRef.current = { beginDrag, moveDrag, endDrag };
  });
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    let candidate: { y: number } | null = null;
    let dragging = false;
    const onStart = (e: TouchEvent) => {
      dragging = false;
      candidate = e.touches.length === 1 && body.scrollTop <= 0 ? { y: e.touches[0].clientY } : null;
    };
    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      if (!dragging) {
        if (!candidate) return;
        const dy = touch.clientY - candidate.y;
        if (dy < -DRAG_SLOP || body.scrollTop > 0) {
          candidate = null; // scrolling the content, not the sheet
          return;
        }
        if (dy < DRAG_SLOP) return;
        if (!dragRef.current.beginDrag(candidate.y, e.timeStamp - 16)) return;
        dragging = true;
      }
      e.preventDefault();
      dragRef.current.moveDrag(touch.clientY, e.timeStamp);
    };
    const onEnd = () => {
      if (dragging) dragRef.current.endDrag();
      dragging = false;
      candidate = null;
    };
    body.addEventListener("touchstart", onStart, { passive: true });
    body.addEventListener("touchmove", onMove, { passive: false });
    body.addEventListener("touchend", onEnd);
    body.addEventListener("touchcancel", onEnd);
    return () => {
      body.removeEventListener("touchstart", onStart);
      body.removeEventListener("touchmove", onMove);
      body.removeEventListener("touchend", onEnd);
      body.removeEventListener("touchcancel", onEnd);
    };
  }, []);

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
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle + header are the drag area (touch-none so the browser
            doesn't scroll/refresh instead); the body below scrolls normally. */}
        <div
          className="touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
        <div className="pt-2.5 flex justify-center" aria-hidden="true">
          <div className="w-10 h-1.5 rounded-full bg-fg/20" />
        </div>
        <div className="flex justify-between items-center px-5 pb-5 pt-2.5 border-b border-line">
          <h3 id={titleId} className="text-xl font-black flex items-center gap-2 text-fg">
            {icon} {title}
          </h3>
          <button
            onClick={handleClose}
            aria-label="סגור"
            className="text-muted hover:text-fg bg-line hover:bg-fg/15 p-2 rounded-full transition-ui duration-150 ease-out active:scale-[0.97]"
          >
            <X size={20} />
          </button>
        </div>
        </div>
        <div ref={bodyRef} className="on-light p-6 overflow-y-auto overscroll-contain flex-1 bg-surface text-fg">{children}</div>
      </div>
    </div>,
    document.body
  );
}
