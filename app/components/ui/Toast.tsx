"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ToastTone } from "@/app/components/ui/feedback";

interface ToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
  tone?: ToastTone; // success (default) / error / info — the icon and its color
}

const TONE_ICON = {
  success: <CheckCircle2 size={18} className="text-accent-fg shrink-0" />,
  error: <AlertCircle size={18} className="text-danger-fg shrink-0" />,
  info: <Info size={18} className="text-muted shrink-0" />,
} as const;

// Minimal self-dismissing toast — this app has no toast library, so this is
// a small hand-rolled one rather than pulling in a dependency for one string
// of feedback. Fixed above the patient shell's bottom nav (z-[250], higher
// than Modal's z-[200]) so it's never hidden behind it.
//
// Rises in from the bottom edge and drops back out the same way (.toast-pill
// in globals.css): after durationMs it plays the exit, then calls onDismiss.
// Keyed by message so a new message while one is showing restarts the
// entrance and the timer instead of inheriting the old one's exit.
export default function Toast(props: ToastProps) {
  return <ToastPill key={props.message} {...props} />;
}

// Must match the .toast-pill[data-leaving] duration in globals.css.
const TOAST_EXIT_MS = 200;

function ToastPill({ message, onDismiss, durationMs = 2500, tone = "success" }: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  // Callers pass an inline arrow, so onDismiss changes identity on every
  // parent render — read it through a ref so those renders don't restart
  // the timers.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    const leave = setTimeout(() => setIsLeaving(true), durationMs);
    const done = setTimeout(() => onDismissRef.current(), durationMs + TOAST_EXIT_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
    };
  }, [durationMs]);

  return (
    // role="status"/"alert" so screen readers announce it; w-max + a
    // viewport cap lets a long message (an error, a full success sentence)
    // wrap instead of running off-screen.
    <div role={tone === "error" ? "alert" : "status"} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[250] w-max max-w-[calc(100vw-2rem)] print:hidden">
      <div
        data-leaving={isLeaving || undefined}
        className="toast-pill flex items-center gap-2.5 bg-elevated text-fg text-sm font-bold px-5 py-3.5 rounded-3xl shadow-elevated leading-snug"
      >
        {TONE_ICON[tone]}
        <span className="min-w-0">{message}</span>
      </div>
    </div>
  );
}
