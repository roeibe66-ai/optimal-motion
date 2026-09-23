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
// patient app's "Clean Premium Light" surfaces — a white sheet floating on a
// dimmed backdrop, dark charcoal text, no heavy borders (a hairline
// stone-100 divider under the header is as far as it goes). Currently only
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
    <div className="fixed inset-0 z-[200] bg-brand-espresso/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white text-brand-espresso w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh] rounded-t-3xl m-0 pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-stone-100">
          <h3 className="text-xl font-black flex items-center gap-2 text-brand-espresso">
            {icon} {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="text-stone-500 hover:text-brand-espresso bg-stone-100 hover:bg-stone-200 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
