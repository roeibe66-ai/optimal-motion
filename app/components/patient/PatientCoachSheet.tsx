"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Send, Sparkles, X } from "lucide-react";
import { useAIAssistantChat } from "@/app/hooks/useAIAssistantChat";
import type { AIAssistantContext } from "@/app/types";
import { useAddress } from "@/app/hooks/useAddress";
import { confirmAction } from "@/app/components/ui/feedback";
import { useDialog } from "@/app/hooks/useDialog";

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
  const t = useAddress();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, isLoading, error, sendMessage, clearHistory } = useAIAssistantChat("patient", contextData);
  const sheetRef = useRef<HTMLDivElement>(null);
  useDialog(sheetRef, isOpen, () => setIsOpen(false));

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
        className={`fixed bottom-44 left-5 z-[100] w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent-active text-on-accent shadow-[0_16px_32px_-10px_color-mix(in_srgb,var(--accent)_55%,transparent)] flex items-center justify-center hover:scale-105 active:scale-95 transition-ui duration-200 ease-out ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-label="פתח מאמן AI אישי"
      >
        <Sparkles size={24} />
      </button>

      {isOpen && <div className="fixed inset-0 bg-backdrop backdrop-blur-sm z-[100]" onClick={() => setIsOpen(false)}></div>}

      {/* Closed = parked off-screen, so inert keeps it out of Tab order and
          the accessibility tree; open = a modal dialog (useDialog). */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-coach-title"
        inert={!isOpen}
        className={`fixed inset-x-0 bottom-0 z-[100] bg-elevated rounded-t-[2rem] shadow-[0_-8px_40px_color-mix(in_srgb,var(--shadow-ink)_12%,transparent)] flex flex-col max-h-[82vh] transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-fg/10"></div>
        </div>

        <div className="px-6 pb-4 pt-1 flex items-center justify-between border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent text-on-accent flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 id="patient-coach-title" className="font-black text-fg text-[0.9375rem]">מאמן AI אישי</h3>
              <p className="text-[0.6875rem] text-muted font-semibold">כאן כדי לעזור להתאים את האימון שלך</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 text-muted hover:text-fg active:scale-90 transition-ui duration-150 ease-out" aria-label="סגור">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="text-center text-muted text-[0.8125rem] font-medium mt-6 px-4 leading-relaxed">
              {t("כואב לך באיזשהו תרגיל? רוצה גרסה קלה או מאתגרת יותר? יש לך שאלה על האימון? שאל אותי כל דבר.")}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[0.8438rem] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-line text-fg" : "bg-accent text-on-accent"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-end">
              <div className="bg-accent/15 text-accent-fg rounded-2xl px-4 py-3 text-xs font-bold">חושב...</div>
            </div>
          )}
          {error && <div role="alert" className="bg-danger/15 border border-danger/40 text-danger-fg text-xs font-bold px-4 py-3 rounded-2xl">{error}</div>}
        </div>

        {/* Notice at the point of collection (privacy policy, "מאמן ה-AI"):
            what this is, where the messages go, that they're kept (6 months,
            readable by the therapist) and can be deleted, not for emergencies. */}
        <p className="px-6 pt-3 border-t border-line text-[0.6875rem] text-muted text-center leading-relaxed shrink-0">
          מאמן ממוחשב (AI), לא אדם ולא ייעוץ רפואי. ההודעות נשלחות לעיבוד אצל Anthropic, ונשמרות 6 חודשים כך שגם המטפל
          יכול לקרוא אותן ·{" "}
          <Link href="/privacy" target="_blank" className="underline font-bold">
            פרטים
          </Link>
          {messages.length > 0 && (
            <>
              {" "}·{" "}
              <button
                type="button"
                className="underline font-bold"
                onClick={async () => {
                  const ok = await confirmAction({
                    title: "למחוק את השיחה?",
                    message: "כל ההודעות שלך עם המאמן יימחקו, ולא יהיה אפשר לשחזר אותן.",
                    confirmLabel: "מחיקה",
                    cancelLabel: "ביטול",
                    destructive: true,
                  });
                  if (ok) await clearHistory();
                }}
              >
                מחיקת השיחה
              </button>
            </>
          )}
          {" "}· במצב חירום: 101
        </p>
        <form onSubmit={handleSubmit} className="p-4 pt-2 flex gap-2 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("שאל את המאמן שלך...")}
            className="on-light flex-1 bg-surface border border-line rounded-2xl px-4 py-3 text-fg text-sm placeholder:text-muted outline-none focus:border-focus focus:ring-2 focus:ring-focus"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-btn-primary text-btn-primary-fg w-11 h-11 rounded-2xl flex items-center justify-center hover:bg-btn-primary-hover active:bg-btn-primary-active disabled:bg-disabled disabled:text-disabled-fg disabled:hover:bg-disabled disabled:cursor-not-allowed transition-colors shrink-0"
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
