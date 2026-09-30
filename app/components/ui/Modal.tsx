"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  onClose: () => void;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

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
export default function Modal({ onClose, title, icon, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-[200] bg-backdrop backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-elevated text-fg w-full overflow-hidden shadow-elevated relative flex flex-col max-h-[92vh] rounded-t-3xl m-0 pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-line">
          <h3 className="text-xl font-black flex items-center gap-2 text-fg">
            {icon} {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="text-muted hover:text-fg bg-line hover:bg-fg/15 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="on-light p-6 overflow-y-auto flex-1 bg-surface text-fg">{children}</div>
      </div>
    </div>
  );
}
