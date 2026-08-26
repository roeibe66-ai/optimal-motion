"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  onClose: () => void;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

// Shared dark glassmorphism modal chrome (overlay + panel + header + close button).
// Extracted from the original inline "InfoModal" — currently only rendered from
// patient-side views, so it's dark-themed only (there was a light-theme branch
// in the original that was never actually reachable from where it was used).
export default function Modal({ onClose, title, icon, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-[200] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1c1c1e] border-stone-800 text-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh] border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-stone-800">
          <h3 className="text-xl font-black flex items-center gap-2">
            {icon} {title}
          </h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
