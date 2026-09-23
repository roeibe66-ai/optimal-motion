"use client";

import { useEffect } from "react";
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
export default function Toast({ message, onDismiss, durationMs = 2500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[250] animate-in fade-in slide-in-from-bottom-4 duration-300 print:hidden">
      <div className="flex items-center gap-2.5 bg-brand-espresso text-white text-sm font-bold px-5 py-3.5 rounded-full shadow-2xl whitespace-nowrap">
        <CheckCircle2 size={18} className="text-brand-terracotta shrink-0" />
        {message}
      </div>
    </div>
  );
}
