"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ToastAction, ToastTone } from "@/app/components/ui/feedback";

interface ToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
  tone?: ToastTone; // success (default) / error / info — the icon and its color
  action?: ToastAction; // e.g. "ביטול" (undo); tapping it runs the action and dismisses
}

const TONE_ICON = {
  success: <CheckCircle2 size={18} className="text-accent-fg shrink-0" />,
  error: <AlertCircle size={18} className="text-danger-fg shrink-0" />,
  info: <Info size={18} className="text-muted shrink-0" />,
} as const;

// Minimal self-dismissing toast — this app has no toast library, so this is
// a small hand-rolled one rather than pulling in a dependency for one string
// of feedback. App-wide toasts come from notify() and render as a stack in
// FeedbackHost (ToastPill below); <Toast> is the standalone, self-positioned
// version (fixed above the bottom nav, z-[250] over Modal's z-[200]).
//
// Rises in from the bottom edge and drops back out the same way (.toast-pill
// in globals.css): after durationMs it plays the exit, then calls onDismiss.
// Keyed by message so a new message while one is showing restarts the
// entrance and the timer instead of inheriting the old one's exit.
export default function Toast(props: ToastProps) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[250] w-max max-w-[calc(100vw-2rem)] print:hidden">
      <ToastPill key={props.message} {...props} />
    </div>
  );
}

// Must match the .toast-pill[data-leaving] duration in globals.css.
const TOAST_EXIT_MS = 200;

// Older toasts in a stack recede a little (depth 0 = newest).
const DEPTH_STYLE = [
  { scale: "1", opacity: 1 },
  { scale: "0.95", opacity: 0.85 },
  { scale: "0.9", opacity: 0.7 },
];

export function ToastPill({ message, onDismiss, durationMs = 2500, tone = "success", action, depth = 0 }: ToastProps & { depth?: number }) {
  const [isLeaving, setIsLeaving] = useState(false);

  // Callers pass an inline arrow, so onDismiss changes identity on every
  // parent render — read it through a ref so those renders don't restart
  // the timers.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  // The countdown pauses while a finger/pointer is on the toast (someone
  // reaching for "ביטול") and while the page is hidden, then resumes with
  // whatever time was left — the Sonner "handle edge cases invisibly" rule.
  const controls = useRef({ pause: () => {}, resume: () => {}, leaveNow: () => {} });
  useEffect(() => {
    let remaining = durationMs;
    let startedAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let left = false;
    const leaveNow = () => {
      if (left) return;
      left = true;
      clearTimeout(timer);
      setIsLeaving(true);
      timer = setTimeout(() => onDismissRef.current(), TOAST_EXIT_MS);
    };
    const resume = () => {
      if (left || timer) return;
      startedAt = Date.now();
      timer = setTimeout(leaveNow, remaining);
    };
    const pause = () => {
      if (left || !timer) return;
      clearTimeout(timer);
      timer = undefined;
      remaining = Math.max(0, remaining - (Date.now() - startedAt));
    };
    const onVisibility = () => (document.hidden ? pause() : resume());
    controls.current = { pause, resume, leaveNow };
    if (!document.hidden) resume();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [durationMs]);

  const depthStyle = DEPTH_STYLE[Math.min(depth, DEPTH_STYLE.length - 1)];

  return (
    // role="status"/"alert" so screen readers announce it; a long message
    // (an error, a full success sentence) wraps within the container's cap.
    <div
      role={tone === "error" ? "alert" : "status"}
      className="transition-[scale,opacity] duration-200 ease-out"
      style={depthStyle}
      onPointerEnter={() => controls.current.pause()}
      onPointerLeave={() => controls.current.resume()}
    >
      <div
        data-leaving={isLeaving || undefined}
        className="toast-pill flex items-center gap-2.5 bg-elevated text-fg text-sm font-bold px-5 py-3.5 rounded-3xl shadow-elevated leading-snug"
      >
        {TONE_ICON[tone]}
        <span className="min-w-0">{message}</span>
        {action && (
          <button
            onClick={() => {
              action.onClick();
              controls.current.leaveNow();
            }}
            className="shrink-0 -my-1.5 ms-1 px-3 py-1.5 rounded-full text-accent-fg font-black hover:bg-accent/10 active:scale-95 transition-ui duration-150 ease-out"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
