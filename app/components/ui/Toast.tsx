"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface ToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

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

function ToastPill({ message, onDismiss, durationMs = 2500 }: ToastProps) {
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
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[250] print:hidden">
      <div
        data-leaving={isLeaving || undefined}
        className="toast-pill flex items-center gap-2.5 bg-elevated text-fg text-sm font-bold px-5 py-3.5 rounded-full shadow-elevated whitespace-nowrap"
      >
        <CheckCircle2 size={18} className="text-accent-fg shrink-0" />
        {message}
      </div>
    </div>
  );
}
