"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Send, Sparkles, X } from "lucide-react";
import { useAIAssistantChat } from "@/app/hooks/useAIAssistantChat";
import type { AIAssistantContext } from "@/app/types";

interface PatientCoachSheetProps {
  contextData?: AIAssistantContext;
}

// Premium "personal coach" chat — floating action button + bottom sheet,
// "Organic Motion" light theme (stone, brand terracotta, soft shadows)
// matching the rest of the patient app.
//
// Note for later: this is meant to become a paid perk. Once patient-side
// premium gating exists (see app/utils/premium.ts, which currently only
// gates individual training tracks, not app-wide features), an
// `isPremiumUser` check can wrap this component's usage. Renders
// unconditionally for now — no gating of any kind exists here today.
export default function PatientCoachSheet({ contextData }: PatientCoachSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, isLoading, error, sendMessage } = useAIAssistantChat("patient", contextData);

  // Portals straight to <body>, bypassing PatientShell entirely. That's not
  // cosmetic: PatientShell's <main> is `relative z-0`, which makes it its
  // own stacking context — every fixed-position descendant inside it,
  // however high its own z-index, is composited as part of that z-0 layer
  // and loses to any sibling of <main> with a higher z-index (the bottom
  // nav is `fixed z-50`, a sibling of <main>, so it painted over this
  // component no matter what z-index was set here). The admin co-pilot
  // never had this problem because its equivalent <main> has no
  // position/z-index of its own. Mounting on <body> instead sidesteps the
  // trap completely rather than fighting it with ever-higher z-index values.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- document.body doesn't exist during SSR; this flips true only after the first client render, which is the standard guard for createPortal in Next.js
    setIsMounted(true);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input;
    setInput("");
    sendMessage(text);
  };

  if (!isMounted) return null;

  return createPortal(
    <>
      <button
        onClick={() => setIsOpen(true)}
        // bottom-44: clears both the app's bottom nav (h-16) on the overview
        // screen and the fixed "התחל אימון" CTA bar (bottom-[4.5rem] plus its
        // own ~88px of button+padding) on the workout detail screen — this
        // component mounts on both, so it has to sit above whichever one is
        // actually present.
        className={`fixed bottom-44 left-5 z-[100] w-16 h-16 rounded-full bg-gradient-to-br from-brand-terracotta to-brand-espresso text-white shadow-[0_16px_32px_-10px_rgba(161,93,56,0.55)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 ease-out ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-label="פתח מאמן AI אישי"
      >
        <Sparkles size={24} />
      </button>

      {isOpen && <div className="fixed inset-0 bg-brand-espresso/40 backdrop-blur-sm z-[100]" onClick={() => setIsOpen(false)}></div>}

      <div
        className={`fixed inset-x-0 bottom-0 z-[100] bg-white rounded-t-[2rem] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] flex flex-col max-h-[82vh] transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-stone-200"></div>
        </div>

        <div className="px-6 pb-4 pt-1 flex items-center justify-between border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-terracotta text-white flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-black text-brand-espresso text-[15px]">מאמן AI אישי</h3>
              <p className="text-[11px] text-stone-400 font-semibold">כאן כדי לעזור להתאים את האימון שלך</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 text-stone-400 hover:text-stone-700 active:scale-90 transition-all duration-150 ease-out" aria-label="סגור">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-stone-400 text-[13px] font-medium mt-6 px-4 leading-relaxed">
              כואב לך באיזשהו תרגיל? רוצה גרסה קלה או מאתגרת יותר? יש לך שאלה על האימון? שאל אותי כל דבר.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-stone-100 text-stone-800" : "bg-brand-terracotta text-white"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-end">
              <div className="bg-brand-terracotta/10 text-brand-terracotta rounded-2xl px-4 py-3 text-xs font-bold">חושב...</div>
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold px-4 py-3 rounded-2xl">{error}</div>}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-stone-100 flex gap-2 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="שאל את המאמן שלך..."
            className="flex-1 bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 text-brand-espresso text-sm placeholder:text-stone-400 outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta/20"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-brand-terracotta text-white w-11 h-11 rounded-2xl flex items-center justify-center hover:brightness-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            aria-label="שלח"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </>,
    document.body
  );
}
