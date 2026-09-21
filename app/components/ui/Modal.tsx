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
// rendered from ExerciseInfoModal.
export default function Modal({ onClose, title, icon, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-[200] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white text-stone-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-stone-100">
          <h3 className="text-xl font-black flex items-center gap-2 text-stone-900">
            {icon} {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
